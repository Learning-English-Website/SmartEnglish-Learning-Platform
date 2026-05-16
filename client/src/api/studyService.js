import axiosClient from './axiosClient';

/**
 * Study Session service
 */
export const studyService = {
  /**
   * POST /study-sessions/start → StudySession
   * @param {string} setId
   */
  startSession: (setId) =>
    axiosClient.post('/study-sessions/start', { setId }),

  /**
   * POST /study-sessions/:sessionId/answer → void
   * @param {string} sessionId
   * @param {string} cardId
   * @param {boolean} isCorrect
   */
  submitAnswer: (sessionId, cardId, isCorrect) =>
    axiosClient.post(`/study-sessions/${sessionId}/answer`, { cardId, isCorrect }),

  /**
   * POST /study-sessions/:sessionId/complete → StudyResult
   * @param {string} sessionId
   */
  completeSession: (sessionId) =>
    axiosClient.post(`/study-sessions/${sessionId}/complete`),
};
