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
   * Generate lesson and exercises using AI
   * POST /api/ai/lessons/generate
   * @param {{ topic: string, level?: string, count?: number }} data
   */
  generateLesson: (data) =>
    axiosClient.post('/ai/lessons/generate', data, {
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
};
