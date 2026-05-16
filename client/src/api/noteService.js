import axiosClient from './axiosClient';

export const noteService = {
  /**
   * Get notes for a specific card
   */
  getByCardId: (cardId) => {
    return axiosClient.get(`/notes/card/${cardId}`);
  },

  /**
   * Create a new note
   */
  create: (cardId, content, title = '') => {
    return axiosClient.post('/notes', { cardId, content, title });
  },

  /**
   * Update a note
   */
  update: (noteId, { content, title } = {}) => {
    return axiosClient.put(`/notes/${noteId}`, { content, title });
  },

  /**
   * Delete a note
   */
  delete: (noteId) => {
    return axiosClient.delete(`/notes/${noteId}`);
  },
};

export default noteService;
