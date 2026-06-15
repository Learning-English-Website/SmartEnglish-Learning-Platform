const mongoose = require('mongoose');
const CardProgress = require('../../models/cardProgress.model');
const Flashcard = require('../../models/flashcard.model');
const StudySession = require('../../models/studySession.model');
const { AppError } = require('../../shared/errors/AppError');
const {
  INITIAL_EASE_FACTOR,
  calculateSM2,
  getNextReviewDate,
} = require('../../shared/services/sm2.service');

/**
 * Get progress for a specific card
 */
const getCardProgress = async (userId, cardId) => {
  let progress = await CardProgress.findOne({ user: userId, card: cardId });

  if (!progress) {
    // Return default progress for new card
    return {
      cardId,
      easeFactor: INITIAL_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      lapses: 0,
      totalReviews: 0,
      correctReviews: 0,
      accuracy: 0,
      masteryLevel: 0,
      status: 'NEW',
      flashcardStatus: 'NEW',
    };
  }

  return {
    cardId: progress.card,
    easeFactor: progress.easeFactor,
    interval: progress.interval,
    repetitions: progress.repetitions,
    nextReview: progress.nextReview,
    lastReview: progress.lastReview,
    lapses: progress.lapses,
    totalReviews: progress.totalReviews,
    correctReviews: progress.correctReviews,
    accuracy: progress.totalReviews > 0 ? Math.round((progress.correctReviews / progress.totalReviews) * 100) : 0,
    masteryLevel: progress.masteryLevel,
    status: progress.status,
    flashcardStatus: progress.flashcardStatus || 'NEW',
  };
};

/**
 * Update card progress with SM-2 quality rating
 */
const updateCardProgress = async (userId, cardId, quality) => {
  console.log('[CardProgress] updateCardProgress called:', { userId, cardId, quality });

  // Verify card exists
  const card = await Flashcard.findById(cardId);
  if (!card) {
    console.log('[CardProgress] Card not found:', cardId);
    throw new AppError('Card not found', 404);
  }

  // Get progress
  let progress = await CardProgress.findOne({ user: userId, card: cardId });
  if (!progress || progress.status === 'NEW') {
    throw new AppError('Card has not been learned yet in Learn Mode', 400);
  }

  // Calculate new SM-2 schedule
  const newSchedule = calculateSM2(
    {
      easeFactor: progress.easeFactor,
      interval: progress.interval,
      repetitions: progress.repetitions,
      lapses: progress.lapses,
    },
    quality
  );

  // Update progress
  progress.easeFactor = newSchedule.easeFactor;
  progress.interval = newSchedule.interval;
  progress.repetitions = newSchedule.repetitions;
  progress.nextReview = newSchedule.nextReview;
  progress.lastReview = newSchedule.lastReview;
  progress.status = newSchedule.status;
  progress.lapses = newSchedule.lapses;
  progress.totalReviews += 1;
  if (quality >= 3) {
    progress.correctReviews += 1;
  }

  const saved = await progress.save();
  console.log('[CardProgress] Saved successfully:', saved._id);

  return {
    cardId: progress.card,
    easeFactor: progress.easeFactor,
    interval: progress.interval,
    repetitions: progress.repetitions,
    nextReview: progress.nextReview,
    lastReview: progress.lastReview,
    lapses: progress.lapses,
    status: progress.status,
    totalReviews: progress.totalReviews,
    correctReviews: progress.correctReviews,
    accuracy: progress.totalReviews > 0 ? Math.round((progress.correctReviews / progress.totalReviews) * 100) : 0,
    masteryLevel: progress.masteryLevel,
    quality,
  };
};

/**
 * Get progress for a specific set
 */
const getSetProgress = async (userId, setId) => {
  // Get all cards in the set
  const cards = await Flashcard.find({ set: setId });
  if (cards.length === 0) {
    return {
      setId,
      totalCards: 0,
      masteredCards: 0,
      learningCards: 0,
      newCards: 0,
      dueCards: 0,
      avgAccuracy: 0,
      lastStudied: null,
    };
  }

  const cardIds = cards.map(c => c._id);
  const now = new Date();

  // Get progress for all cards
  const progressRecords = await CardProgress.find({
    user: userId,
    card: { $in: cardIds },
  });

  // Get study sessions for this set
  const sessions = await StudySession.find({
    user: userId,
    targetId: setId,
  }).sort({ createdAt: -1 });

  // Calculate stats
  const learningCards = progressRecords.filter(p => p.status === 'LEARNING').length;
  const masteredCards = progressRecords.filter(p => p.status === 'REVIEW').length;
  const newCards = Math.max(0, cards.length - (learningCards + masteredCards));
  const dueCards = progressRecords.filter(p => ['LEARNING', 'REVIEW'].includes(p.status) && new Date(p.nextReview) <= now).length;

  // Calculate average accuracy
  const cardsWithReviews = progressRecords.filter(p => p.totalReviews > 0);
  const avgAccuracy = cardsWithReviews.length > 0
    ? Math.round(cardsWithReviews.reduce((sum, p) => sum + (p.correctReviews / p.totalReviews) * 100, 0) / cardsWithReviews.length)
    : 0;

  return {
    setId,
    totalCards: cards.length,
    masteredCards,
    learningCards,
    newCards,
    dueCards,
    avgAccuracy,
    lastStudied: sessions.length > 0 ? sessions[0].createdAt : null,
    totalSessions: sessions.length,
  };
};

/**
 * Get card schedules for a set (for spaced repetition)
 */
const getCardSchedules = async (userId, setId) => {
  // Get all cards in the set
  const cards = await Flashcard.find({ set: setId });
  const cardIds = cards.map(c => c._id);

  // Get progress for all cards
  const progressRecords = await CardProgress.find({
    user: userId,
    card: { $in: cardIds },
  });

  const progressMap = new Map(progressRecords.map(p => [p.card.toString(), p]));

  // Return schedules for all cards
  return cards.map(card => {
    const progress = progressMap.get(card._id.toString());
    if (!progress) {
      return {
        cardId: card._id,
        easeFactor: INITIAL_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        lapses: 0,
        totalReviews: 0,
        correctReviews: 0,
        masteryLevel: 0,
        status: 'NEW',
        flashcardStatus: 'NEW',
      };
    }
    return {
      cardId: progress.card,
      easeFactor: progress.easeFactor,
      interval: progress.interval,
      repetitions: progress.repetitions,
      nextReview: progress.nextReview,
      lastReview: progress.lastReview,
      lapses: progress.lapses,
      totalReviews: progress.totalReviews,
      correctReviews: progress.correctReviews,
      masteryLevel: progress.masteryLevel,
      status: progress.status,
      flashcardStatus: progress.flashcardStatus || 'NEW',
    };
  });
};

/**
 * Reset card progress to initial state
 */
const resetCardProgress = async (userId, cardId) => {
  const progress = await CardProgress.findOne({ user: userId, card: cardId });

  if (!progress) {
    return {
      success: true,
      message: 'Card progress does not exist, nothing to reset',
    };
  }

  progress.easeFactor = INITIAL_EASE_FACTOR;
  progress.interval = 0;
  progress.repetitions = 0;
  progress.nextReview = new Date();
  progress.lastReview = null;
  progress.lapses = 0;
  progress.totalReviews = 0;
  progress.correctReviews = 0;
  progress.masteryLevel = 0;
  progress.status = 'NEW';

  await progress.save();

  return {
    success: true,
    message: 'Card progress reset successfully',
    progress,
  };
};

/**
 * Reset all cards' progress in a set
 */
const resetSetProgress = async (userId, setId) => {
  const cards = await Flashcard.find({ set: setId });
  const cardIds = cards.map(c => c._id);

  await CardProgress.updateMany(
    { user: userId, card: { $in: cardIds } },
    {
      $set: {
        easeFactor: INITIAL_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        lapses: 0,
        totalReviews: 0,
        correctReviews: 0,
        masteryLevel: 0,
        status: 'NEW',
      }
    }
  );

  return {
    success: true,
    message: 'Set progress reset successfully',
  };
};

/**
 * Get due cards count for a set
 */
const getDueCardsCount = async (userId, setId) => {
  const cards = await Flashcard.find({ set: setId });
  if (cards.length === 0) {
    return { count: 0, total: 0 };
  }

  const cardIds = cards.map(c => c._id);
  const now = new Date();

  const dueCount = await CardProgress.countDocuments({
    user: userId,
    card: { $in: cardIds },
    status: { $in: ['LEARNING', 'REVIEW'] },
    nextReview: { $lte: now },
  });

  return {
    count: dueCount,
    total: cards.length,
  };
};

/**
 * Get overall user statistics
 */
const getOverallStats = async (userId) => {
  // Get all progress records for user
  const allProgress = await CardProgress.find({ user: userId });

  // Get all study sessions
  const sessions = await StudySession.find({ user: userId, completedAt: { $exists: true } });

  // Calculate mastery distribution
  const learningCards = allProgress.filter(p => p.status === 'LEARNING').length;
  const masteredCards = allProgress.filter(p => p.status === 'REVIEW').length;

  // Due today — thẻ có status in ['LEARNING', 'REVIEW'] và nextReview <= now
  const now = new Date();
  const dueToday = allProgress.filter(p => 
    ['LEARNING', 'REVIEW'].includes(p.status) && new Date(p.nextReview) <= now
  ).length;

  // Calculate newCards count by subtracting active cards from total cards in all user's sets
  let newCards = 0;
  try {
    const FlashcardSet = require('../../models/flashcardSet.model');
    const userSets = await FlashcardSet.find({ user: userId }).select('_id');
    const setIds = userSets.map(s => s._id);
    const totalCardsInSets = await Flashcard.countDocuments({ set: { $in: setIds } });
    newCards = Math.max(0, totalCardsInSets - (learningCards + masteredCards));
  } catch (err) {
    console.error('[ProgressService] Failed to calculate total cards for newCards:', err.message);
    newCards = allProgress.filter(p => p.status === 'NEW').length;
  }

  // Calculate average accuracy
  const cardsWithReviews = allProgress.filter(p => p.totalReviews > 0);
  const averageAccuracy = cardsWithReviews.length > 0
    ? Math.round(cardsWithReviews.reduce((sum, p) => sum + (p.correctReviews / p.totalReviews) * 100, 0) / cardsWithReviews.length)
    : 0;

  // Calculate total time spent
  const totalTimeSpentMs = sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  // Calculate streak (simplified - consecutive days with study)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sortedSessions = sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let currentStreak = 0;
  let checkDate = new Date(today);

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.createdAt);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() === checkDate.getTime()) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (sessionDate.getTime() < checkDate.getTime()) {
      break;
    }
  }

  // Calculate level and XP (simplified)
  const totalXp = sessions.reduce((sum, s) => sum + (s.cardsReviewed || 0) * 10, 0);
  const level = Math.floor(totalXp / 500) + 1;
  const xp = totalXp % 500;
  const xpToNextLevel = 500;

  // Retrieve today's XP from DailyQuest (Single Source of Truth) and weekly XP history
  let todayXp = 0;
  const last7DaysXp = [];
  try {
    const DailyQuest = require('../../models/dailyQuest.model');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const xpQuest = await DailyQuest.findOne({
      user: userId,
      day: { $gte: todayStart, $lt: tomorrowStart },
      type: 'xp'
    });
    if (xpQuest) {
      todayXp = xpQuest.progress || 0;
    }

    // Retrieve XP for the last 7 days (today and 6 previous days)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayQuest = await DailyQuest.findOne({
        user: userId,
        day: { $gte: dayStart, $lt: dayEnd },
        type: 'xp'
      });

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;

      last7DaysXp.push({
        date: dateStr,
        xp: dayQuest ? (dayQuest.progress || 0) : 0
      });
    }
  } catch (err) {
    console.error('[ProgressService] Failed to retrieve today\'s XP or last 7 days XP:', err.message);
  }

  return {
    totalCardsStudied: allProgress.reduce((sum, p) => sum + p.totalReviews, 0),
    totalSessionsCompleted: sessions.length,
    totalTimeSpentMs,
    averageAccuracy,
    currentStreak,
    longestStreak: currentStreak, // Simplified
    masteredCards,
    learningCards,
    newCards,
    dueToday,       // Thêm mới: số thẻ cần ôn hôm nay
    todayXp,        // Thêm mới: XP tích lũy trong ngày
    last7DaysXp,    // Thêm mới: XP 7 ngày gần nhất
    level,
    xp,
    xpToNextLevel,
  };
};

/**
 * Get study calendar data (for heatmap)
 */
const getStudyCalendar = async (userId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const sessions = await StudySession.find({
    user: userId,
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: 1 });

  // Group by date
  const calendarMap = new Map();

  sessions.forEach(session => {
    const dateKey = session.createdAt.toISOString().split('T')[0];
    const existing = calendarMap.get(dateKey) || { cardsStudied: 0, minutesSpent: 0, sessionsCount: 0 };

    calendarMap.set(dateKey, {
      cardsStudied: existing.cardsStudied + (session.cardsReviewed || 0),
      minutesSpent: existing.minutesSpent + Math.round((session.durationMs || 0) / 60000),
      sessionsCount: existing.sessionsCount + 1,
    });
  });

  return Array.from(calendarMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));
};

/**
 * Get learning forecast (cards due in next N days)
 */
const getLearningForecast = async (userId, days = 7) => {
  const now = new Date();
  const forecasts = [];

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + i);
    targetDate.setHours(23, 59, 59, 999);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Count cards with nextReview on this day
    const dueCount = await CardProgress.countDocuments({
      user: userId,
      nextReview: { $gte: startOfDay, $lte: targetDate },
    });

    forecasts.push({
      date: targetDate.toISOString().split('T')[0],
      dueCount,
    });
  }

  return forecasts;
};


/**
 * Safe, idempotent complete learning (transition NEW -> LEARNING)
 */
const completeLearning = async (userId, cardId) => {
  const progress = await CardProgress.findOne({ user: userId, card: cardId });

  if (!progress) {
    return CardProgress.create({
      user: userId,
      card: cardId,
      status: 'LEARNING',
      repetitions: 1,
      interval: 1,
      easeFactor: INITIAL_EASE_FACTOR,
      nextReview: getNextReviewDate(1),
    });
  }

  if (progress.status === 'NEW') {
    progress.status = 'LEARNING';
    progress.repetitions = 1;
    progress.interval = 1;
    progress.easeFactor = INITIAL_EASE_FACTOR;
    progress.nextReview = getNextReviewDate(1);
    return progress.save();
  }

  return progress; // Already LEARNING or REVIEW - returned unchanged
};

/**
 * Get new cards for a set or globally
 */
const getNewCards = async (userId, setId, limit = 10) => {
  const finalLimit = Math.min(Number(limit) || 10, 20);

  let cardQuery = {};
  if (setId) {
    cardQuery.set = setId;
  } else {
    const FlashcardSet = require('../../models/flashcardSet.model');
    const userSets = await FlashcardSet.find({ user: userId });
    const setIds = userSets.map(s => s._id);
    cardQuery.set = { $in: setIds };
  }

  const allCards = await Flashcard.find(cardQuery).select('_id front back pronunciation example note collocation relatedWords imageUrl difficulty');
  if (allCards.length === 0) return [];

  const allCardIds = allCards.map(c => c._id.toString());

  // Find progress records that are LEARNING or REVIEW
  const activeProgress = await CardProgress.find({
    user: userId,
    card: { $in: allCardIds },
    status: { $in: ['LEARNING', 'REVIEW'] }
  }).select('card');

  const activeCardIds = new Set(activeProgress.map(p => p.card.toString()));

  // Filter out active cards
  const newCards = allCards.filter(card => !activeCardIds.has(card._id.toString()));

  return newCards.slice(0, finalLimit);
};

/**
 * Get due cards for a user (and optionally filtered by set)
 */
const getDueCards = async (userId, setId) => {
  const now = new Date();

  let progressQuery = {
    user: userId,
    status: { $in: ['LEARNING', 'REVIEW'] },
    nextReview: { $lte: now }
  };

  if (setId) {
    const cardsInSet = await Flashcard.find({ set: setId }).select('_id');
    const cardIds = cardsInSet.map(c => c._id);
    progressQuery.card = { $in: cardIds };
  }

  const dueProgress = await CardProgress.find(progressQuery)
    .populate({
      path: 'card',
      select: '_id front back pronunciation example note collocation relatedWords imageUrl difficulty set'
    })
    .sort({ nextReview: 1 });

  return dueProgress
    .filter(p => p.card)
    .map(p => ({
      _id: p.card._id,
      front: p.card.front,
      back: p.card.back,
      pronunciation: p.card.pronunciation,
      example: p.card.example,
      note: p.card.note,
      collocation: p.card.collocation,
      relatedWords: p.card.relatedWords,
      imageUrl: p.card.imageUrl,
      difficulty: p.card.difficulty,
      set: p.card.set,
      progress: {
        easeFactor: p.easeFactor,
        interval: p.interval,
        repetitions: p.repetitions,
        nextReview: p.nextReview,
        lastReview: p.lastReview,
        status: p.status
      }
    }));
};

/**
 * Update flashcardStatus for a card (idempotent, does not affect SM-2 variables)
 */
const updateFlashcardStatus = async (userId, cardId, status) => {
  if (!['NEW', 'LEARNING', 'KNOWN'].includes(status)) {
    throw new AppError('Invalid flashcard status', 400);
  }

  // Verify card exists
  const card = await Flashcard.findById(cardId);
  if (!card) {
    throw new AppError('Card not found', 404);
  }

  let progress = await CardProgress.findOne({ user: userId, card: cardId });
  if (!progress) {
    // Create minimal progress record with flashcardStatus
    progress = new CardProgress({
      user: userId,
      card: cardId,
      flashcardStatus: status,
      // Fill SM-2 defaults but keep as implicitly NEW in SM-2 logic
      status: 'NEW',
    });
  } else {
    progress.flashcardStatus = status;
  }

  await progress.save();
  return {
    cardId: progress.card,
    flashcardStatus: progress.flashcardStatus,
    status: progress.status,
  };
};

/**
 * Reset flashcardStatus to NEW for all cards in a set
 */
const resetSetFlashcardProgress = async (userId, setId) => {
  const cards = await Flashcard.find({ set: setId });
  const cardIds = cards.map(c => c._id);

  await CardProgress.updateMany(
    { user: userId, card: { $in: cardIds } },
    { $set: { flashcardStatus: 'NEW' } }
  );

  return { success: true };
};

module.exports = {
  getCardProgress,
  updateCardProgress,
  getSetProgress,
  getCardSchedules,
  resetCardProgress,
  resetSetProgress,
  getDueCardsCount,
  getOverallStats,
  getStudyCalendar,
  getLearningForecast,
  completeLearning,
  getNewCards,
  getDueCards,
  updateFlashcardStatus,
  resetSetFlashcardProgress,
};
