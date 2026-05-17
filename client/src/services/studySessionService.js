import axiosClient from '../api/axiosClient';

/**
 * Study Session service - Enhanced version with mode tracking
 * @description API endpoints for study session management
 */

/**
 * @typedef {'flashcards' | 'learn' | 'test' | 'match'} StudyMode
 */

/**
 * @typedef {Object} StudySession
 * @property {string} _id - Session ID
 * @property {string} userId - User ID
 * @property {string} targetId - Flashcard set ID
 * @property {StudyMode} mode - Study mode used
 * @property {string[]} cards - Array of card IDs in the session
 * @property {number} cardsReviewed - Number of cards reviewed
 * @property {number} correctCount - Number of correct answers
 * @property {number} accuracy - Accuracy percentage (0-100)
 * @property {number} durationMs - Session duration in milliseconds
 * @property {Date} startedAt - Session start time
 * @property {Date} completedAt - Session end time
 */

export const studySessionService = {
  /**
   * Start a new study session
   * POST /study-sessions/start
   * @param {string} setId - Flashcard set ID
   * @param {StudyMode} [mode='learn'] - Study mode
   * @returns {Promise<StudySession>} Created session with cards
   */
  startSession: (setId, mode = 'learn') =>
    axiosClient.post('/study-sessions/start', { setId, mode }),

  /**
   * Submit an answer for a card
   * POST /study-sessions/:sessionId/answer
   * @param {string} sessionId - Study session ID
   * @param {string} cardId - Card ID
   * @param {boolean} isCorrect - Whether the answer was correct
   * @returns {Promise<void>}
   */
  submitAnswer: (sessionId, cardId, isCorrect) =>
    axiosClient.post(`/study-sessions/${sessionId}/answer`, { cardId, isCorrect }),

  /**
   * Complete a study session
   * POST /study-sessions/:sessionId/complete
   * @param {string} sessionId - Study session ID
   * @returns {Promise<StudySession>} Completed session with results
   */
  completeSession: (sessionId) =>
    axiosClient.post(`/study-sessions/${sessionId}/complete`),

  /**
   * Get user's study sessions
   * GET /study-sessions/my
   * @param {Object} [params] - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Items per page
   * @param {StudyMode} [params.mode] - Filter by mode
   * @returns {Promise<{sessions: StudySession[], total: number, page: number}>}
   */
  getMySessions: (params = {}) =>
    axiosClient.get('/study-sessions/my', { params }),

  /**
   * Get a specific session by ID
   * GET /study-sessions/:sessionId
   * @param {string} sessionId
   * @returns {Promise<StudySession>}
   */
  getById: (sessionId) =>
    axiosClient.get(`/study-sessions/${sessionId}`),

  /**
   * Delete a study session
   * DELETE /study-sessions/:sessionId
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  deleteSession: (sessionId) =>
    axiosClient.delete(`/study-sessions/${sessionId}`),
};

export default studySessionService;
