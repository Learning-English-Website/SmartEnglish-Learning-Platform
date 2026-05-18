const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getCardProgress,
  updateCardProgress,
  resetCardProgress,
  getSetProgress,
  getCardSchedules,
  getDueCardsCount,
  getOverallStats,
  getStudyCalendar,
  getLearningForecast,
} = require('./progress.controller');

// All routes require authentication
router.use(authenticate);

// Card progress routes
// GET /api/progress/cards/:cardId
router.get('/cards/:cardId', getCardProgress);

// PUT /api/progress/cards/:cardId
router.put('/cards/:cardId', updateCardProgress);

// POST /api/progress/cards/:cardId/reset
router.post('/cards/:cardId/reset', resetCardProgress);

// Set progress routes
// GET /api/progress/sets/:setId
router.get('/sets/:setId', getSetProgress);

// GET /api/progress/sets/:setId/schedules
router.get('/sets/:setId/schedules', getCardSchedules);

// GET /api/progress/sets/:setId/due
router.get('/sets/:setId/due', getDueCardsCount);

// Global progress routes
// GET /api/progress/stats
router.get('/stats', getOverallStats);

// GET /api/progress/calendar
router.get('/calendar', getStudyCalendar);

// GET /api/progress/forecast
router.get('/forecast', getLearningForecast);

module.exports = router;
