const mongoose = require('mongoose');
const CardProgress = require('../../models/cardProgress.model');
const Flashcard = require('../../models/flashcard.model');
const StudySession = require('../../models/studySession.model');
const { AppError } = require('../../shared/errors/AppError');

// SM-2 Algorithm Constants - Optimized for "ham học" (learning enthusiasts)
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.0; // Giảm từ 2.5 để khoảng cách tăng chậm hơn
const INITIAL_EASE_FACTOR = 2.0; // Giảm từ 2.5

/**
 * Calculate next review schedule using SM-2 algorithm
 * Optimized for learning enthusiasts:
 * - Card đúng: khoảng cách tăng chậm hơn (1 → 2 → 3-4 ngày)
 * - Card sai: review lại ngay trong ngày
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
    // Failed recall - reset, schedule for review AGAIN TODAY immediately
    repetitions = 0;
    interval = 0; // Review again today - no delay
    lapses = (lapses || 0) + 1;

    // Decrease ease factor (min 1.3)
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);

    // Next review is NOW (today)
    nextReview = new Date(now);
  } else {
    // Successful recall - tăng khoảng cách chậm hơn cho "người ham học"
    if (repetitions === 0) {
      interval = 1; // Lần đầu đúng: 1 ngày
    } else if (repetitions === 1) {
      interval = 2; // Lần 2 đúng: 2 ngày (thay vì 6)
    } else {
      // Từ lần 3+: dùng (EF - 0.5) để tăng chậm hơn
      // Ví dụ: EF = 2.0 → multiplier = 1.5 → interval tăng chậm
      const effectiveEF = easeFactor - 0.5;
      interval = Math.max(1, Math.round(interval * effectiveEF));
    }

    repetitions += 1;

    // Adjust ease factor based on quality
    const efChange = 0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02);
    easeFactor = Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, easeFactor + efChange));

    // Calculate next review date for successful recall
    const successfulNextReview = new Date(now);
    successfulNextReview.setDate(successfulNextReview.getDate() + interval);
    nextReview = successfulNextReview;
  }

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

  // Get or create progress
  let progress = await CardProgress.findOne({ user: userId, card: cardId });
  console.log('[CardProgress] Existing progress:', progress ? 'found' : 'not found');

  if (!progress) {
    progress = new CardProgress({
      user: userId,
      card: cardId,
      easeFactor: INITIAL_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
      nextReview: new Date(),
      totalReviews: 0,
      correctReviews: 0,
      lapses: 0,
    });
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
  progress.lapses = newSchedule.lapses;
  progress.totalReviews += 1;
  if (quality >= 2) {
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
  const masteredCards = progressRecords.filter(p => p.masteryLevel >= 4).length;
  const learningCards = progressRecords.filter(p => p.repetitions > 0 && p.masteryLevel < 4).length;
  const newCards = progressRecords.filter(p => p.repetitions === 0).length;
  const dueCards = progressRecords.filter(p => new Date(p.nextReview) <= now).length;

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

  await progress.save();

  return {
    success: true,
    message: 'Card progress reset successfully',
    progress,
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
  const masteredCards = allProgress.filter(p => p.masteryLevel >= 4).length;
  const learningCards = allProgress.filter(p => p.repetitions > 0 && p.masteryLevel < 4).length;
  const newCards = allProgress.filter(p => p.repetitions === 0).length;

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

module.exports = {
  getCardProgress,
  updateCardProgress,
  getSetProgress,
  getCardSchedules,
  resetCardProgress,
  getDueCardsCount,
  getOverallStats,
  getStudyCalendar,
  getLearningForecast,
};
