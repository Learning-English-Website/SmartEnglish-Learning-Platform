import axiosClient from '../api/axiosClient';

const BASE = '/admin';

export const adminService = {
  // Stats
  getStats: (params) => axiosClient.get(`${BASE}/stats`, { params }),

  // Courses
  getCourses: (params) => axiosClient.get(`${BASE}/courses`, { params }),
  getCourse: (id) => axiosClient.get(`${BASE}/courses/${id}`),
  createCourse: (data) => axiosClient.post(`${BASE}/courses`, data),
  updateCourse: (id, data) => axiosClient.put(`${BASE}/courses/${id}`, data),
  deleteCourse: (id) => axiosClient.delete(`${BASE}/courses/${id}`),

  // Units
  getUnits: (arg) => {
    if (typeof arg === 'string') return axiosClient.get(`${BASE}/units`, { params: { courseId: arg } });
    return axiosClient.get(`${BASE}/units`, { params: arg });
  },
  getUnit: (id) => axiosClient.get(`${BASE}/units/${id}`),
  createUnit: (data) => axiosClient.post(`${BASE}/units`, data),
  updateUnit: (id, data) => axiosClient.put(`${BASE}/units/${id}`, data),
  deleteUnit: (id) => axiosClient.delete(`${BASE}/units/${id}`),

  // Lessons
  getLessons: (arg) => {
    if (typeof arg === 'string') return axiosClient.get(`${BASE}/lessons`, { params: { unitId: arg } });
    return axiosClient.get(`${BASE}/lessons`, { params: arg });
  },
  getLesson: (id) => axiosClient.get(`${BASE}/lessons/${id}`),
  createLesson: (data) => axiosClient.post(`${BASE}/lessons`, data),
  updateLesson: (id, data) => axiosClient.put(`${BASE}/lessons/${id}`, data),
  deleteLesson: (id) => axiosClient.delete(`${BASE}/lessons/${id}`),

  // Challenges
  getChallenges: (params) =>
    axiosClient.get(`${BASE}/challenges`, { params }),
  getChallenge: (id) => axiosClient.get(`${BASE}/challenges/${id}`),
  createChallenge: (data) => axiosClient.post(`${BASE}/challenges`, data),
  updateChallenge: (id, data) => axiosClient.put(`${BASE}/challenges/${id}`, data),
  deleteChallenge: (id) => axiosClient.delete(`${BASE}/challenges/${id}`),

  // Challenge Options
  getChallengeOptions: (challengeId) =>
    axiosClient.get(`${BASE}/challenge-options`, challengeId ? { params: { challengeId } } : {}),
  createChallengeOption: (data) => axiosClient.post(`${BASE}/challenge-options`, data),
  updateChallengeOption: (id, data) => axiosClient.put(`${BASE}/challenge-options/${id}`, data),
  deleteChallengeOption: (id) => axiosClient.delete(`${BASE}/challenge-options/${id}`),

  // Flashcard Sets
  getFlashcardSets: (params) => axiosClient.get(`${BASE}/flashcard-sets`, { params }),
  getFlashcardSet: (id) => axiosClient.get(`${BASE}/flashcard-sets/${id}`),
  deleteFlashcardSet: (id) => axiosClient.delete(`${BASE}/flashcard-sets/${id}`),

  // Folders
  getAllFolders: (params) => axiosClient.get(`${BASE}/folders`, { params }),
  getFolder: (id) => axiosClient.get(`${BASE}/folders/${id}`),
  deleteFolder: (id) => axiosClient.delete(`${BASE}/folders/${id}`),

  // Community Sets
  getCommunitySets: (params) => axiosClient.get(`${BASE}/community-sets`, { params }),
  deleteCommunitySet: (id) => axiosClient.delete(`${BASE}/community-sets/${id}`),

  // Users
  getUsers: (params) => axiosClient.get(`${BASE}/users`, { params }),
  getUser: (id) => axiosClient.get(`${BASE}/users/${id}`),
  updateUser: (id, data) => axiosClient.put(`${BASE}/users/${id}`, data),
  updateUserRole: (id, role) => axiosClient.put(`${BASE}/users/${id}/role`, { role }),
  updateUserStatus: (id, status) => axiosClient.put(`${BASE}/users/${id}/status`, { status }),
  updateUserPremium: (id, premiumType, durationDays) => axiosClient.put(`${BASE}/users/${id}/premium`, { premiumType, durationDays }),
  deleteUser: (id) => axiosClient.delete(`${BASE}/users/${id}`),

  // Orders
  getOrders: (params) => axiosClient.get(`${BASE}/orders`, { params }),
  verifyOrderPayment: (orderId) => axiosClient.post(`${BASE}/orders/${orderId}/verify`),
  updateOrderStatusManually: (orderId, status) => axiosClient.put(`${BASE}/orders/${orderId}/status`, { status }),

  // Feedback
  getFeedbacks: (params) => axiosClient.get('/feedback/admin', { params }),
  getFeedbackDetail: (id) => axiosClient.get(`/feedback/admin/${id}`),
  replyFeedback: (id, data) => axiosClient.put(`/feedback/admin/${id}`, data),
  submitFeedback: (data) => axiosClient.post('/feedback', data),
};
