const progressService = require('./progress.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');

/**
 * Get progress for a specific card
 * GET /api/progress/cards/:cardId
 */
const getCardProgress = asyncHandler(async (req, res) => {
  const progress = await progressService.getCardProgress(req.userId, req.params.cardId);
  res.json({ success: true, data: progress });
});

/**
 * Update card progress with SM-2 quality rating
 * PUT /api/progress/cards/:cardId
 */
const updateCardProgress = asyncHandler(async (req, res) => {
  console.log('[Progress Controller] updateCardProgress:', { userId: req.userId, cardId: req.params.cardId, body: req.body });
  const { quality } = req.body;

  if (quality === undefined || quality < 0 || quality > 3) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_QUALITY', message: 'Quality must be between 0 and 3' }
    });
  }

  const progress = await progressService.updateCardProgress(req.userId, req.params.cardId, quality);
  res.json({ success: true, data: progress });
});

/**
 * Reset card progress
 * POST /api/progress/cards/:cardId/reset
 */
const resetCardProgress = asyncHandler(async (req, res) => {
  const result = await progressService.resetCardProgress(req.userId, req.params.cardId);
  res.json({ success: true, data: result });
});

/**
 * Get progress for a specific set
 * GET /api/progress/sets/:setId
 */
const getSetProgress = asyncHandler(async (req, res) => {
  const progress = await progressService.getSetProgress(req.userId, req.params.setId);
  res.json({ success: true, data: progress });
});

/**
 * Get card schedules for a set
 * GET /api/progress/sets/:setId/schedules
 */
const getCardSchedules = asyncHandler(async (req, res) => {
  const schedules = await progressService.getCardSchedules(req.userId, req.params.setId);
  res.json({ success: true, data: schedules });
});

/**
 * Get due cards count for a set
 * GET /api/progress/sets/:setId/due
 */
const getDueCardsCount = asyncHandler(async (req, res) => {
  const result = await progressService.getDueCardsCount(req.userId, req.params.setId);
  res.json({ success: true, data: result });
});

/**
 * Get overall user statistics
 * GET /api/progress/stats
 */
const getOverallStats = asyncHandler(async (req, res) => {
  const stats = await progressService.getOverallStats(req.userId);
  res.json({ success: true, data: stats });
});

/**
 * Get study calendar data
 * GET /api/progress/calendar
 */
const getStudyCalendar = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_DATES', message: 'startDate and endDate are required' }
    });
  }

  const calendar = await progressService.getStudyCalendar(req.userId, startDate, endDate);
  res.json({ success: true, data: calendar });
});

/**
 * Get learning forecast
 * GET /api/progress/forecast
 */
const getLearningForecast = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const forecast = await progressService.getLearningForecast(req.userId, days);
  res.json({ success: true, data: forecast });
});

module.exports = {
  getCardProgress,
  updateCardProgress,
  resetCardProgress,
  getSetProgress,
  getCardSchedules,
  getDueCardsCount,
  getOverallStats,
  getStudyCalendar,
  getLearningForecast,
};
