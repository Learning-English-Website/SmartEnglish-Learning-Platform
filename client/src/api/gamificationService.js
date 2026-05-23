import axiosClient from './axiosClient';

/**
 * Gamification API Service
 * Streak, XP/Level, Match Leaderboard, Achievements
 */
export const gamificationService = {
  /**
   * GET /gamification/stats
   * Lấy streak + XP + level của user hiện tại
   */
  getStats: () => axiosClient.get('/gamification/stats'),

  /**
   * POST /gamification/match/submit
   * Gửi kết quả thời gian Match Mode
   * @param {string} setId
   * @param {number} timeMs - thời gian hoàn thành tính bằng milliseconds
   */
  submitMatchScore: (setId, timeMs) =>
    axiosClient.post('/gamification/match/submit', { setId, timeMs }),

  /**
   * GET /gamification/leaderboard/:setId
   * Lấy bảng xếp hạng Match Mode cho học phần
   * @param {string} setId
   */
  getLeaderboard: (setId) => axiosClient.get(`/gamification/leaderboard/${setId}`),

  /**
   * GET /gamification/achievements
   * Lấy tất cả huy hiệu (locked + unlocked)
   */
  getAchievements: () => axiosClient.get('/gamification/achievements'),

  /**
   * POST /gamification/learn/complete
   * Trigger gamification rewards after completing Learn mode
   * @param {{ accuracy: number, cardsStudied: number }} data
   */
  triggerLearnComplete: (data) =>
    axiosClient.post('/gamification/learn/complete', data),

  /**
   * POST /gamification/test/complete
   * Trigger gamification rewards after completing Test mode
   * @param {{ accuracy: number, cardsStudied: number }} data
   */
  triggerTestComplete: (data) =>
    axiosClient.post('/gamification/test/complete', data),
};
