const { ApiResponse } = require('../../shared/utils/apiResponse');
const gamificationService = require('./gamification.service');

/**
 * GET /api/gamification/stats
 * Lấy streak + XP + level của user hiện tại
 */
const getStats = async (req, res) => {
  const stats = await gamificationService.getStats(req.user._id);
  res.json(ApiResponse.success(stats, 'Gamification stats fetched'));
};

/**
 * POST /api/gamification/match/submit
 * Gửi kết quả thời gian Match Mode
 * Body: { setId, timeMs }
 */
const submitMatchScore = async (req, res) => {
  const { setId, timeMs } = req.body;

  if (!setId || !timeMs) {
    const { AppError } = require('../../shared/errors/AppError');
    throw new AppError('setId and timeMs are required', 400);
  }

  const result = await gamificationService.submitMatchScore(
    req.user._id,
    setId,
    timeMs
  );

  res.json(ApiResponse.success(result, 'Match score submitted'));
};

/**
 * GET /api/gamification/leaderboard/:setId
 * Lấy bảng xếp hạng Match Mode cho học phần
 */
const getLeaderboard = async (req, res) => {
  const { setId } = req.params;
  const result = await gamificationService.getLeaderboard(req.user._id, setId);
  res.json(ApiResponse.success(result, 'Leaderboard fetched'));
};

/**
 * GET /api/gamification/achievements
 * Lấy danh sách tất cả achievements (locked + unlocked)
 */
const getAchievements = async (req, res) => {
  const achievements = await gamificationService.getAchievements(req.user._id);
  res.json(ApiResponse.success(achievements, 'Achievements fetched'));
};

/**
 * POST /api/gamification/learn/complete
 * Trigger XP + streak + achievements after Learn mode
 * Body: { accuracy, cardsStudied }
 */
const triggerLearnComplete = async (req, res) => {
  const { accuracy = 0, cardsStudied = 1 } = req.body;
  const result = await gamificationService.triggerSessionComplete(
    req.user._id,
    { accuracy, cardsStudied, mode: 'learn' }
  );
  res.json(ApiResponse.success(result, 'Learn session gamification updated'));
};

/**
 * POST /api/gamification/test/complete
 * Trigger XP + streak + achievements after Test mode
 * Body: { accuracy, cardsStudied }
 */
const triggerTestComplete = async (req, res) => {
  const { accuracy = 0, cardsStudied = 1 } = req.body;
  const result = await gamificationService.triggerSessionComplete(
    req.user._id,
    { accuracy, cardsStudied, mode: 'test' }
  );
  res.json(ApiResponse.success(result, 'Test session gamification updated'));
};

module.exports = {
  getStats,
  submitMatchScore,
  getLeaderboard,
  getAchievements,
  triggerLearnComplete,
  triggerTestComplete,
};
