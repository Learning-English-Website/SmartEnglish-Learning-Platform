const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  startSession,
  submitAnswer,
  completeSession,
  getUserSessions,
  getSessionById,
} = require('./studySession.controller');

// All routes require authentication
router.use(authenticate);

// POST /api/study-sessions/start - Start a new session
router.post('/start', startSession);

// GET /api/study-sessions - Get user's sessions
router.get('/', getUserSessions);

// GET /api/study-sessions/:sessionId - Get session by ID
router.get('/:sessionId', getSessionById);

// POST /api/study-sessions/:sessionId/answer - Submit answer
router.post('/:sessionId/answer', submitAnswer);

// POST /api/study-sessions/:sessionId/complete - Complete session
router.post('/:sessionId/complete', completeSession);

module.exports = router;
