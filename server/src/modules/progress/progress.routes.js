const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getCardProgress,
  updateCardProgress,
  resetCardProgress,
  getSetProgress,
  resetSetProgress,
  getCardSchedules,
  getDueCardsCount,
  getOverallStats,
  getStudyCalendar,
  getLearningForecast,
  completeLearning,
  getNewCards,
  getDueCards,
  updateFlashcardStatus,
  resetSetFlashcardProgress,
} = require('./progress.controller');

// All routes require authentication
router.use(authenticate);

// Card progress routes
// GET /api/progress/cards/:cardId
router.get('/cards/:cardId', getCardProgress);

// PUT /api/progress/cards/:cardId
router.put('/cards/:cardId', updateCardProgress);

// PUT /api/progress/cards/:cardId/flashcard-status
router.put('/cards/:cardId/flashcard-status', updateFlashcardStatus);

// PUT /api/progress/cards/:cardId/complete-learning
router.put('/cards/:cardId/complete-learning', completeLearning);

// POST /api/progress/cards/:cardId/reset
router.post('/cards/:cardId/reset', resetCardProgress);

// Set progress routes
// GET /api/progress/sets/:setId
router.get('/sets/:setId', getSetProgress);

// POST /api/progress/sets/:setId/reset
router.post('/sets/:setId/reset', resetSetProgress);

// POST /api/progress/sets/:setId/reset-flashcards
router.post('/sets/:setId/reset-flashcards', resetSetFlashcardProgress);

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

// GET /api/progress/new-cards
router.get('/new-cards', getNewCards);

// GET /api/progress/due-cards
router.get('/due-cards', getDueCards);

module.exports = router;
