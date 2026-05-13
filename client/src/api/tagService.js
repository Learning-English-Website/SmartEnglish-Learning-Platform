import axiosClient from './axiosClient';

/**
 * Tag CRUD service
 */
export const tagService = {
  /** GET /tags → Tag[] (user's own tags) */
  getAll: () => axiosClient.get('/tags'),

  /** GET /tags/public → Tag[] (tags from public sets) */
  getPublicTags: () => axiosClient.get('/tags/public'),

  /** POST /tags → Tag */
  create: (name) => axiosClient.post('/tags', { name }),

  /** GET /tags/search?q= → Tag[] */
  search: (query) => axiosClient.get('/tags/search', { params: { q: query } }),
};
