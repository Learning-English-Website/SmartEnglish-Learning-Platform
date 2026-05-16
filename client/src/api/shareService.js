import axiosClient from './axiosClient';

/**
 * Share & Bookmark service
 */
export const shareService = {
  /**
   * POST /shares → ShareLink
   * @param {string} setId
   */
  share: (setId) =>
    axiosClient.post('/shares', { setId }),

  /**
   * GET /shares/shared/:shareCode → FlashcardSet
   * @param {string} shareCode
   */
  getByLink: (shareCode) =>
    axiosClient.get(`/shares/shared/${shareCode}`),

  /**
   * POST /bookmarks → void
   * @param {string} setId
   */
  bookmark: (setId) =>
    axiosClient.post('/bookmarks', { setId }),

  /**
   * DELETE /bookmarks/:setId → void
   * @param {string} setId
   */
  unbookmark: (setId) =>
    axiosClient.delete(`/bookmarks/${setId}`),

  /**
   * GET /bookmarks → FlashcardSet[]
   */
  getBookmarks: () =>
    axiosClient.get('/bookmarks'),
};
