import axiosClient from '../api/axiosClient';

/**
 * Card progress tracking interface
 */
export interface CardProgress {
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date;
  lapses: number;
  totalReviews: number;
  correctReviews: number;
  status: 'NEW' | 'LEARNING' | 'REVIEW';
  flashcardStatus?: 'NEW' | 'LEARNING' | 'KNOWN';
}

/**
 * Set progress tracking interface
 */
export interface SetProgress {
  setId: string;
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  dueCards: number;
  lastStudied: Date | null;
  streakDays: number;
}

/**
 * User statistics interface
 */
export interface UserStats {
  totalCardsStudied: number;
  totalSessionsCompleted: number;
  totalTimeSpentMs: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  dueToday: number;
  todayXp: number;
  last7DaysXp?: Array<{ date: string; xp: number }>;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export type ApiQualityRating = 0 | 3 | 4 | 5;

/**
 * Progress service for spaced repetition and learning analytics
 */
export const progressService = {
  /**
   * Get progress for a specific card
   * @param {string} cardId - Card ID
   */
  getCardProgress: (cardId: string) =>
    axiosClient.get<CardProgress>(`/progress/cards/${cardId}`),

  /**
   * Update card progress with SM-2 quality rating
   * @param {string} cardId - Card ID
   * @param {ApiQualityRating} quality - Backend quality rating (0=again, 3=hard, 4=good, 5=easy)
   */
  updateCardProgress: (cardId: string, quality: ApiQualityRating) =>
    axiosClient.put<CardProgress>(`/progress/cards/${cardId}`, { quality }),

  /**
   * Get progress for a specific set
   * @param {string} setId - Set ID
   */
  getSetProgress: (setId: string) =>
    axiosClient.get<SetProgress>(`/progress/sets/${setId}`),

  /**
   * Get overall user statistics
   */
  getOverallStats: () =>
    axiosClient.get<UserStats>(`/progress/stats`),

  /**
   * Get card schedules for a set (for spaced repetition)
   * @param {string} setId - Set ID
   */
  getCardSchedules: (setId: string) =>
    axiosClient.get<CardProgress[]>(`/progress/sets/${setId}/schedules`),

  /**
   * Reset card progress to initial state
   * @param {string} cardId - Card ID
   */
  resetCardProgress: (cardId: string) =>
    axiosClient.post(`/progress/cards/${cardId}/reset`),

  /**
   * Reset progress for all cards in a set
   * @param {string} setId - Set ID
   */
  resetSetProgress: (setId: string) =>
    axiosClient.post(`/progress/sets/${setId}/reset`),

  /**
   * Get due cards count for a set
   * @param {string} setId - Set ID
   */
  getDueCardsCount: (setId: string) =>
    axiosClient.get<{ count: number }>(`/progress/sets/${setId}/due`),

  /**
   * Get study calendar data (for heatmap)
   * @param {string} startDate - Start date ISO string
   * @param {string} endDate - End date ISO string
   */
  getStudyCalendar: (startDate: string, endDate: string) =>
    axiosClient.get<Array<{ date: string; cardsStudied: number; minutesSpent: number }>>(
      `/progress/calendar`,
      { params: { startDate, endDate } }
    ),

  /**
   * Get learning forecast (cards due in next N days)
   * @param {number} days - Number of days to forecast
   */
  getLearningForecast: (days: number = 7) =>
    axiosClient.get<Array<{ date: string; dueCount: number }>>(
      `/progress/forecast`,
      { params: { days } }
    ),

  /**
   * Complete learning a card (idempotent PUT NEW -> LEARNING)
   * @param {string} cardId - Card ID
   */
  completeLearning: (cardId: string) =>
    axiosClient.put<CardProgress>(`/progress/cards/${cardId}/complete-learning`),

  /**
   * Update flashcard status for a card (NEW, LEARNING, KNOWN)
   * @param {string} cardId - Card ID
   * @param {'NEW' | 'LEARNING' | 'KNOWN'} status - New flashcard status
   */
  updateFlashcardStatus: (cardId: string, status: 'NEW' | 'LEARNING' | 'KNOWN') =>
    axiosClient.put<CardProgress>(`/progress/cards/${cardId}/flashcard-status`, { status }),

  /**
   * Reset flashcard progress for all cards in a set to NEW
   * @param {string} setId - Set ID
   */
  resetSetFlashcardProgress: (setId: string) =>
    axiosClient.post<{ success: boolean }>(`/progress/sets/${setId}/reset-flashcards`),

  /**
   * Get new cards to learn (implicit NEW, i.e., no progress or status !== LEARNING/REVIEW)
   * @param {string} [setId] - Optional set filter
   * @param {number} [limit] - Optional limit
   */
  getNewCards: (setId?: string, limit?: number) =>
    axiosClient.get<any[]>(`/progress/new-cards`, { params: { setId, limit } }),

  /**
   * Get cards due for review (LEARNING/REVIEW status, nextReview <= now)
   * @param {string} [setId] - Optional set filter
   */
  getDueCards: (setId?: string) =>
    axiosClient.get<any[]>(`/progress/due-cards`, { params: { setId } }),
};

export default progressService;
