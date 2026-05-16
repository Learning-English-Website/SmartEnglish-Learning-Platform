const StudySession = require('../../models/studySession.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const Flashcard = require('../../models/flashcard.model');
const { AppError } = require('../../shared/errors/AppError');

/**
 * Start a new study session for a flashcard set
 */
const startSession = async (userId, setId) => {
  // Verify set exists
  const flashcardSet = await FlashcardSet.findById(setId);
  if (!flashcardSet) {
    throw new AppError('Flashcard set not found', 404);
  }

  // Get cards for this set
  const cards = await Flashcard.find({ set: setId }).select('_id');
  if (cards.length === 0) {
    throw new AppError('Set has no cards to study', 400);
  }

  // Create session
  const session = await StudySession.create({
    user: userId,
    targetType: 'flashcard_set',
    targetId: setId,
    mode: 'learn',
    cardsReviewed: 0,
  });

  return {
    session,
    cards: cards.map(c => c._id),
    totalCards: cards.length,
  };
};

/**
 * Submit an answer for a card in the session
 */
const submitAnswer = async (userId, sessionId, cardId, isCorrect) => {
  const session = await StudySession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  if (session.completedAt) {
    throw new AppError('Session already completed', 400);
  }

  // Increment cards reviewed
  session.cardsReviewed += 1;

  // Update accuracy (simple running average)
  if (isCorrect) {
    const currentCorrect = (session.accuracy || 0) * (session.cardsReviewed - 1);
    session.accuracy = Math.round(((currentCorrect + 1) / session.cardsReviewed) * 100);
  } else {
    const currentCorrect = (session.accuracy || 0) * (session.cardsReviewed - 1);
    session.accuracy = Math.round((currentCorrect / session.cardsReviewed) * 100);
  }

  await session.save();

  return session;
};

/**
 * Complete a study session
 */
const completeSession = async (userId, sessionId, durationMs) => {
  const session = await StudySession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  if (session.completedAt) {
    throw new AppError('Session already completed', 400);
  }

  session.completedAt = new Date();
  if (durationMs) {
    session.durationMs = durationMs;
  }

  // Calculate retention score (simplified: based on accuracy)
  session.retentionScore = (session.accuracy || 0) / 100;

  await session.save();

  return session;
};

/**
 * Get user's study sessions
 */
const getUserSessions = async (userId, options = {}) => {
  const { page = 1, limit = 20, targetType } = options;

  const filter = { user: userId };
  if (targetType) {
    filter.targetType = targetType;
  }

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    StudySession.find(filter)
      .populate('targetId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StudySession.countDocuments(filter),
  ]);

  return { sessions, total, page, limit };
};

/**
 * Get session by ID
 */
const getSessionById = async (userId, sessionId) => {
  const session = await StudySession.findOne({ _id: sessionId, user: userId })
    .populate('targetId', 'title description cardCount');

  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  return session;
};

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
  getUserSessions,
  getSessionById,
};
