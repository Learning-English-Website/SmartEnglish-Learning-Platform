import axiosClient from './axiosClient';

const AI_REQUEST_TIMEOUT_MS = 90000;

/**
 * AI Module Service
 */
export const aiService = {
  /**
   * Check if user has an AI key configured (returns boolean status)
   * GET /api/ai/key/status
   */
  getAiKeyStatus: () => axiosClient.get('/ai/key/status'),

  /**
   * Validate a Gemini API key using Gemini API
   * POST /api/ai/key/validate
   * @param {string} apiKey
   */
  validateKey: (apiKey) => axiosClient.post('/ai/key/validate', { apiKey }),

  /**
   * Encrypt and store Gemini API Key in signed HttpOnly cookie
   * POST /api/ai/key
   * @param {string} apiKey
   * @param {boolean} rememberMe - Whether to persist for 7 days vs session
   */
  setKey: (apiKey, rememberMe) => axiosClient.post('/ai/key', { apiKey, rememberMe }),

  /**
   * Clear Gemini API Key signed cookie
   * DELETE /api/ai/key
   */
  clearKey: () => axiosClient.delete('/ai/key'),

  /**
   * Generate flashcards using AI
   * POST /api/ai/flashcards/generate
   * @param {{ mode: 'topic' | 'text', topic?: string, text?: string, level?: string, count?: number }} data
   */
  generateFlashcards: (data) =>
    axiosClient.post('/ai/flashcards/generate', data, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),

  /**
   * Auto-enhance a single flashcard term using Gemini AI
   * POST /api/ai/flashcards/enhance
   * @param {{ front: string, back?: string, level?: string, context?: string }} data
   */
  enhanceFlashcard: (data) =>
    axiosClient.post('/ai/flashcards/enhance', data, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),

  /**
   * Generate lesson and exercises using AI
   * POST /api/ai/lessons/generate
   * @param {{ topic: string, level?: string, count?: number, challengeTypes?: string[] }} data
   */
  generateLesson: (data) =>
    axiosClient.post('/ai/lessons/generate', data, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),

  /**
   * Generate an AI mistake coach report from wrong answers in a finished lesson
   * POST /api/ai/lessons/mistake-coach
   * @param {{ lessonTitle?: string, level?: string, mistakes: Array<object> }} data
   */
  generateMistakeCoach: (data) =>
    axiosClient.post('/ai/lessons/mistake-coach', data, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),

  /**
   * Create a new AI chatbot session (uses local greeting, no Gemini call)
   * POST /api/ai/chat/sessions
   * @param {{ persona: string, topic: string, level: string }} data
   */
  createChatSession: (data) => axiosClient.post('/ai/chat/sessions', data),

  /**
   * Fetch all chatbot sessions of the user
   * GET /api/ai/chat/sessions
   */
  getChatSessions: () => axiosClient.get('/ai/chat/sessions'),

  /**
   * Fetch messages for a specific session
   * GET /api/ai/chat/sessions/:id/messages
   */
  getChatMessages: (sessionId) => axiosClient.get(`/ai/chat/sessions/${sessionId}/messages`),

  /**
   * Send a message to a session and trigger Gemini response
   * POST /api/ai/chat/sessions/:id/messages
   * @param {string} sessionId
   * @param {{ text?: string, retryMessageId?: string }} data
   */
  sendChatMessage: (sessionId, data) =>
    axiosClient.post(`/ai/chat/sessions/${sessionId}/messages`, data, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),

  /**
   * Delete a chat session and all its messages
   * DELETE /api/ai/chat/sessions/:id
   */
  deleteChatSession: (sessionId) => axiosClient.delete(`/ai/chat/sessions/${sessionId}`),

  /**
   * End a chat session and generate an AI report card summary
   * POST /api/ai/chat/sessions/:id/end
   */
  endChatSession: (sessionId) => axiosClient.post(`/ai/chat/sessions/${sessionId}/end`),

  /**
   * Fetch saved AI report card summary for a session
   * GET /api/ai/chat/sessions/:id/summary
   */
  getChatSummary: (sessionId) => axiosClient.get(`/ai/chat/sessions/${sessionId}/summary`),

  /**
   * Save selected vocabulary to a flashcard set
   * POST /api/ai/chat/sessions/:id/save-vocab
   * @param {string} sessionId
   * @param {{ setId?: string, createNew?: boolean, setName?: string, words: Array<{word, meaning, pronunciation, example}> }} data
   */
  saveVocabToFlashcard: (sessionId, data) => axiosClient.post(`/ai/chat/sessions/${sessionId}/save-vocab`, data)
};
