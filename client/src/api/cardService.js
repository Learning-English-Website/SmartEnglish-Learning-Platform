import axiosClient from './axiosClient';

/**
 * Flashcard (Card) CRUD service
 */
export const cardService = {
  /** GET /flashcards/set/:setId → Flashcard[] */
  getBySetId: (setId) => axiosClient.get(`/flashcards/set/${setId}`),

  /**
   * POST /flashcards/set/:setId → Flashcard
   * @param {string} setId
   * @param {{ front: string, back: string, pronunciation?: string, example?: string, note?: string }} data
   */
  create: (setId, data) => axiosClient.post(`/flashcards/set/${setId}`, data),

  /**
   * POST /flashcards/set/:setId/bulk → Flashcard[]
   * @param {string} setId
   * @param {{ front: string, back: string }[]} cards
   */
  bulkCreate: (setId, cards) =>
    axiosClient.post(`/flashcards/set/${setId}/bulk`, { cards }),

  /**
   * PUT /flashcards/:cardId → Flashcard
   */
  update: (cardId, data) => axiosClient.put(`/flashcards/${cardId}`, data),

  /** DELETE /flashcards/:cardId */
  delete: (cardId) => axiosClient.delete(`/flashcards/${cardId}`),

  /**
   * PUT /flashcards/set/:setId/reorder
   * @param {string} setId
   * @param {string[]} cardIds  ordered array of card IDs
   */
  reorder: (setId, cardIds) =>
    axiosClient.put(`/flashcards/set/${setId}/reorder`, { cardIds }),
};
