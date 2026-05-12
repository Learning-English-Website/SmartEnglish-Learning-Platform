import axiosClient from './axiosClient';

/**
 * Flashcard Set CRUD service
 * All methods return the response data (axiosClient unwraps .data automatically)
 */
export const setService = {
  /** GET /flashcard-sets/my → FlashcardSet[] */
  getMySets: () => axiosClient.get('/flashcard-sets/my'),

  /** GET /flashcard-sets/public?search=&tags=&page= → FlashcardSet[] */
  getPublicSets: (params = {}) =>
    axiosClient.get('/flashcard-sets/public', { params }),

  /** GET /flashcard-sets/:id → FlashcardSet */
  getById: (id) => axiosClient.get(`/flashcard-sets/${id}`),

  /**
   * POST /flashcard-sets → FlashcardSet
   * @param {{ title: string, description: string, language: string, isPublic: boolean, tags: string[] }} data
   */
  create: (data) => axiosClient.post('/flashcard-sets', data),

  /**
   * PUT /flashcard-sets/:id → FlashcardSet
   */
  update: (id, data) => axiosClient.put(`/flashcard-sets/${id}`, data),

  /** DELETE /flashcard-sets/:id */
  delete: (id) => axiosClient.delete(`/flashcard-sets/${id}`),
};
