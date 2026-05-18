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
  level: number;
  xp: number;
  xpToNextLevel: number;
}

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
   * @param {number} quality - Quality rating (0-3: 0=again, 1=hard, 2=good, 3=easy)
   */
  updateCardProgress: (cardId: string, quality: number) =>
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
};

export default progressService;
