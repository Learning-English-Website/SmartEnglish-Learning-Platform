import axiosClient from './axiosClient';

/**
 * Folder CRUD service
 */
export const folderService = {
  /** GET /folders → Folder[] */
  getAll: () => axiosClient.get('/folders'),

  /** POST /folders → Folder */
  create: (name, parentId) =>
    axiosClient.post('/folders', { name, parentId }),

  /** PUT /folders/:id → Folder */
  update: (id, name) =>
    axiosClient.put(`/folders/${id}`, { name }),

  /** DELETE /folders/:id */
  delete: (id) => axiosClient.delete(`/folders/${id}`),

  /** POST /folders/:id/sets → add set to folder */
  addSet: (folderId, setId) =>
    axiosClient.post(`/folders/${folderId}/sets`, { setId }),

  /** DELETE /folders/:id/sets/:setId → remove set from folder */
  removeSet: (folderId, setId) =>
    axiosClient.delete(`/folders/${folderId}/sets/${setId}`),
};
