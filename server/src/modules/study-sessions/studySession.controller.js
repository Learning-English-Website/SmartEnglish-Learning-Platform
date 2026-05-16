const { ApiResponse } = require('../../shared/utils/apiResponse');
const studySessionService = require('./studySession.service');

/**
 * POST /api/study-sessions/start - Start a new study session
 */
const startSession = async (req, res) => {
  const { setId, mode } = req.body;
  
  if (!setId) {
    throw new (require('../../shared/errors/AppError'))('setId is required', 400);
  }

  const result = await studySessionService.startSession(req.user._id, setId);
  
  // Add mode if provided
  if (mode) {
    result.session.mode = mode;
    await result.session.save();
  }

  res.status(201).json(ApiResponse.success(result, 'Study session started'));
};

/**
 * POST /api/study-sessions/:sessionId/answer - Submit an answer
 */
const submitAnswer = async (req, res) => {
  const { sessionId } = req.params;
  const { cardId, isCorrect } = req.body;

  if (cardId === undefined || isCorrect === undefined) {
    throw new (require('../../shared/errors/AppError'))('cardId and isCorrect are required', 400);
  }

  const session = await studySessionService.submitAnswer(
    req.user._id,
    sessionId,
    cardId,
    isCorrect
  );

  res.json(ApiResponse.success(session, 'Answer recorded'));
};

/**
 * POST /api/study-sessions/:sessionId/complete - Complete a session
 */
const completeSession = async (req, res) => {
  const { sessionId } = req.params;
  const { durationMs } = req.body;

  const session = await studySessionService.completeSession(
    req.user._id,
    sessionId,
    durationMs
  );

  res.json(ApiResponse.success(session, 'Study session completed'));
};

/**
 * GET /api/study-sessions - Get user's sessions
 */
const getUserSessions = async (req, res) => {
  const { page, limit, targetType } = req.query;
  
  const result = await studySessionService.getUserSessions(req.user._id, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
    targetType,
  });

  res.json(ApiResponse.success(result.sessions, 'Sessions fetched', {
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  }));
};

/**
 * GET /api/study-sessions/:sessionId - Get session details
 */
const getSessionById = async (req, res) => {
  const session = await studySessionService.getSessionById(
    req.user._id,
    req.params.sessionId
  );

  res.json(ApiResponse.success(session, 'Session fetched'));
};

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
  getUserSessions,
  getSessionById,
};
