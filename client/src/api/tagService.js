import axiosClient from './axiosClient';

/**
 * Tag CRUD service
 */
export const tagService = {
  /** GET /tags?folderId= → Tag[] */
  getAll: (folderId) => axiosClient.get('/tags', { params: folderId ? { folderId } : {} }),

  /** GET /tags/public → Tag[] (tags from public sets) */
  getPublicTags: () => axiosClient.get('/tags/public'),

  /** POST /tags { name, color, folderId } → Tag */
  create: (name, color, folderId) => axiosClient.post('/tags', { name, color, folderId }),

  /** GET /tags/search?q=&folderId= → Tag[] */
  search: (query, folderId) => axiosClient.get('/tags/search', { params: { q: query, ...(folderId && { folderId }) } }),
};
