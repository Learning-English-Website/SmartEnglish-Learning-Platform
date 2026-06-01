const StudySession = require('../../models/studySession.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const Flashcard = require('../../models/flashcard.model');
const CardProgress = require('../../models/cardProgress.model');
const { AppError } = require('../../shared/errors/AppError');

// SM-2 Algorithm Constants
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.5;
const INITIAL_EASE_FACTOR = 2.5;

/**
 * Calculate next review schedule using SM-2 algorithm
 *
 * Quality ratings (mapped from UI):
 * - 0 = Again (complete blackout)
 * - 1 = Hard (correct but with difficulty)
 * - 2 = Good (correct with some hesitation)
 * - 3 = Easy (perfect recall)
 */
const calculateSM2 = (currentSchedule, quality) => {
  const now = new Date();

  // Map our 0-3 quality to SM-2's 0-5 scale
  const sm2Quality = quality * (5 / 3);

  let { easeFactor = INITIAL_EASE_FACTOR, interval = 0, repetitions = 0, lapses = 0 } = currentSchedule || {};

  if (quality < 2) {
    // Failed recall - reset
    repetitions = 0;
    interval = 1; // Review again tomorrow
    lapses = (lapses || 0) + 1;

    // Decrease ease factor (min 1.3)
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    repetitions += 1;

    // Adjust ease factor based on quality
    const efChange = 0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02);
    easeFactor = Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, easeFactor + efChange));
  }

  // Calculate next review date
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReview: now,
    lapses,
  };
};

/**
 * Start a new study session for a flashcard set
 */
const startSession = async (userId, setId) => {
  // Verify set exists
  const flashcardSet = await FlashcardSet.findById(setId);
  if (!flashcardSet) {
    throw new AppError('Flashcard set not found', 404);
  }

  // Get cards with their progress
  const cards = await Flashcard.find({ set: setId });
  if (cards.length === 0) {
    throw new AppError('Set has no cards to study', 400);
  }

  // Get or create progress for each card
  const cardIds = cards.map(c => c._id);
  let progressRecords = await CardProgress.find({ user: userId, card: { $in: cardIds } });

  // Create progress records for cards that don't have them
  const existingCardIds = new Set(progressRecords.map(p => p.card.toString()));
  const newCards = cardIds.filter(id => !existingCardIds.has(id.toString()));

  if (newCards.length > 0) {
    const newProgress = newCards.map(cardId => ({
      user: userId,
      card: cardId,
      easeFactor: INITIAL_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      lapses: 0,
      totalReviews: 0,
      correctReviews: 0,
    }));

    await CardProgress.insertMany(newProgress);
    progressRecords = await CardProgress.find({ user: userId, card: { $in: cardIds } });
  }

  // Create schedule map for learning order
  const schedules = progressRecords.map(p => ({
    cardId: p.card.toString(),
    easeFactor: p.easeFactor,
    interval: p.interval,
    repetitions: p.repetitions,
    nextReview: p.nextReview,
    lastReview: p.lastReview,
    lapses: p.lapses,
  }));

  // Sort cards by learning priority
  // 1. Due cards (nextReview <= now) - sorted by oldest first
  // 2. New cards (repetitions === 0)
  // 3. Review cards sorted by ease factor (harder cards first)
  const now = new Date();
  const dueCards = schedules
    .filter(s => new Date(s.nextReview) <= now)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));

  const newCardsList = schedules
    .filter(s => s.repetitions === 0 && new Date(s.nextReview) > now)
    .sort((a, b) => a.easeFactor - b.easeFactor);

  const reviewCards = schedules
    .filter(s => s.repetitions > 0 && new Date(s.nextReview) > now)
    .sort((a, b) => a.easeFactor - b.easeFactor);

  // Build ordered card list - each card appears twice (multiple choice + type answer)
  const orderedCards = [
    ...dueCards,
    ...newCardsList,
    ...reviewCards,
  ].flatMap(schedule => [
    { cardId: schedule.cardId, mode: 'multiple-choice' },
    { cardId: schedule.cardId, mode: 'type-answer' },
  ]);

  // Create session
  const session = await StudySession.create({
    user: userId,
    targetType: 'flashcard_set',
    targetId: setId,
    mode: 'learn',
    cardsReviewed: 0,
    accuracy: 0,
    startedAt: new Date(),
  });

  return {
    session,
    orderedCards,
    totalCards: orderedCards.length,
    dueCount: dueCards.length,
    newCount: newCardsList.length,
  };
};

/**
 * Submit an answer for a card in the session
 * Updates SM-2 schedule based on quality
 */
const submitAnswer = async (userId, sessionId, cardId, isCorrect, mode, responseTime) => {
  const session = await StudySession.findOne({ _id: sessionId, user: userId });
  if (!session) throw new AppError('Study session not found', 404);
  if (session.completedAt) throw new AppError('Session already completed', 400);

  // Prevent double-counting: check if this exact card+mode was already answered.
  if (mode !== undefined) {
    const alreadyAnswered = (session.answeredCards || []).some(
      a => String(a.cardId) === String(cardId) && a.mode === mode
    );
    if (alreadyAnswered) {
      throw new AppError('Card already answered in this session', 400);
    }
  }

  const quality = isCorrect ? 2 : 0;

  let progress = await CardProgress.findOne({ user: userId, card: cardId });

  if (!progress) {
    progress = await CardProgress.create({
      user: userId,
      card: cardId,
      easeFactor: INITIAL_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
      nextReview: new Date(),
      totalReviews: 0,
      correctReviews: 0,
    });
  }

  const newSchedule = calculateSM2(
    {
      easeFactor: progress.easeFactor,
      interval: progress.interval,
      repetitions: progress.repetitions,
      lapses: progress.lapses,
    },
    quality
  );

  progress.easeFactor = newSchedule.easeFactor;
  progress.interval = newSchedule.interval;
  progress.repetitions = newSchedule.repetitions;
  progress.nextReview = newSchedule.nextReview;
  progress.lastReview = newSchedule.lastReview;
  progress.lapses = newSchedule.lapses;
  progress.totalReviews += 1;
  if (isCorrect) progress.correctReviews += 1;
  await progress.save();

  // Update session stats
  session.cardsReviewed += 1;
  if (!session.answeredCards) session.answeredCards = [];
  session.answeredCards.push({ cardId: cardId.toString(), mode, answeredAt: new Date() });

  if (isCorrect) {
    const currentCorrect = (session.accuracy || 0) * (session.cardsReviewed - 1);
    session.accuracy = Math.min(100, Math.round(((currentCorrect + 1) / session.cardsReviewed) * 100));
  } else {
    const currentCorrect = (session.accuracy || 0) * (session.cardsReviewed - 1);
    session.accuracy = Math.min(100, Math.round((currentCorrect / session.cardsReviewed) * 100));
  }

  await session.save();

  return { progress, session, newSchedule };
};

/**
 * Complete a study session
 */
const completeSession = async (userId, sessionId, durationMs) => {
  // Atomic update: set completedAt + duration only if not already completed
  const session = await StudySession.findOneAndUpdate(
    { _id: sessionId, user: userId, completedAt: null },
    {
      completedAt: new Date(),
      ...(durationMs ? { durationMs } : {}),
      $set: { retentionScore: undefined }, // placeholder — set below after fetch
    },
    { new: true }
  );
  if (!session) {
    const existing = await StudySession.findOne({ _id: sessionId, user: userId });
    if (existing?.completedAt) {
      throw new AppError('Session already completed', 400);
    }
    throw new AppError('Study session not found', 404);
  }

  // Calculate retention score based on accuracy
  session.retentionScore = (session.accuracy || 0) / 100;
  await session.save();

  // ── Trigger Gamification (fire-and-forget style, không block response) ──────
  let gamificationResult = { streak: null, xp: null, newAchievements: [] };

  try {
    const gamificationService = require('../gamification/gamification.service');

    const [streakResult, xpResult] = await Promise.allSettled([
      gamificationService.updateStreak(userId),
      gamificationService.awardXP(userId, session),
    ]);

    const streak = streakResult.status === 'fulfilled' ? streakResult.value : null;
    const xp    = xpResult.status === 'fulfilled'    ? xpResult.value    : null;

    // Kiểm tra achievements dựa trên context mới nhất
    if (streak || xp) {
      const studyHour = new Date().getHours();
      const context = {
        streak:        streak?.current || 0,
        totalXP:       xp?.totalXP || 0,
        level:         xp?.newLevel || 1,
        totalSessions: 1,                        // Tối thiểu 1 (session vừa hoàn thành)
        accuracy:      session.accuracy || 0,
        matchTimeMs:   0,
        studyHour,
      };
      const newAchievements = await gamificationService.checkAndUnlockAchievements(userId, context);
      gamificationResult = { streak, xp, newAchievements };
    }
  } catch (gamErr) {
    // Không làm lỗi session — chỉ log
    console.error('[Gamification] Error after completeSession:', gamErr.message);
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Update Quest Progress (fire-and-forget) ───────────────────────────────────
  try {
    const questService = require('../quest/quest.service');
    const cardsReviewed = session.cardsReviewed || 0;

    if (session.mode === 'review') {
      questService.updateProgress(userId, { type: 'reviews', amount: cardsReviewed }).catch(err =>
        console.error('[Quest] Failed to update reviews progress:', err.message)
      );
    } else if (session.mode === 'learn') {
      questService.updateProgress(userId, { type: 'flashcards', amount: cardsReviewed }).catch(err =>
        console.error('[Quest] Failed to update flashcards progress:', err.message)
      );
    }

    // Streak quest — every session completion counts
    questService.updateProgress(userId, { type: 'streak', amount: 1 }).catch(err =>
      console.error('[Quest] Failed to update streak progress:', err.message)
    );
  } catch (questErr) {
    console.error('[Quest] Error updating progress:', questErr.message);
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return { session, gamification: gamificationResult };
};

/**
 * Get user's study sessions
 */
const getUserSessions = async (userId, options = {}) => {
  const { page = 1, limit = 20, targetType } = options;

  const filter = { user: userId };
  if (targetType) {
    filter.targetType = targetType;
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    StudySession.find(filter)
      .populate('targetId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StudySession.countDocuments(filter),
  ]);

  return { sessions, total, page, limit };
};

/**
 * Get session by ID
 */
const getSessionById = async (userId, sessionId) => {
  const session = await StudySession.findOne({ _id: sessionId, user: userId })
    .populate('targetId', 'title description cardCount');

  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  return session;
};

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
  getUserSessions,
  getSessionById,
};
