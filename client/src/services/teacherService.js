import axiosClient from '../api/axiosClient';

const BASE = '/teacher'; // Separated path for teacher curriculum management

export const teacherService = {
  // Courses
  getCourses: (params) => axiosClient.get(`${BASE}/courses`, { params }),
  getCourse: (id) => axiosClient.get(`${BASE}/courses/${id}`),
  getCourseTree: (courseId) => axiosClient.get(`${BASE}/courses/${courseId}/tree`),
  reorderUnits: (courseId, unitIds) => axiosClient.put(`${BASE}/courses/${courseId}/reorder-units`, { unitIds }),
  createCourse: (data) => axiosClient.post(`${BASE}/courses`, data),
  updateCourse: (id, data) => axiosClient.put(`${BASE}/courses/${id}`, data),
  deleteCourse: (id) => axiosClient.delete(`${BASE}/courses/${id}`),

  // Units
  getUnits: (arg) => {
    if (typeof arg === 'string') return axiosClient.get(`${BASE}/units`, { params: { courseId: arg } });
    return axiosClient.get(`${BASE}/units`, { params: arg });
  },
  getUnit: (id) => axiosClient.get(`${BASE}/units/${id}`),
  reorderLessons: (unitId, lessonIds) => axiosClient.put(`${BASE}/units/${unitId}/reorder-lessons`, { lessonIds }),
  createUnit: (data) => axiosClient.post(`${BASE}/units`, data),
  updateUnit: (id, data) => axiosClient.put(`${BASE}/units/${id}`, data),
  deleteUnit: (id) => axiosClient.delete(`${BASE}/units/${id}`),

  // Lessons
  getLessons: (arg) => {
    if (typeof arg === 'string') return axiosClient.get(`${BASE}/lessons`, { params: { unitId: arg } });
    return axiosClient.get(`${BASE}/lessons`, { params: arg });
  },
  getLesson: (id) => axiosClient.get(`${BASE}/lessons/${id}`),
  reorderChallenges: (lessonId, challengeIds) => axiosClient.put(`${BASE}/lessons/${lessonId}/reorder-challenges`, { challengeIds }),
  createLesson: (data) => axiosClient.post(`${BASE}/lessons`, data),
  updateLesson: (id, data) => axiosClient.put(`${BASE}/lessons/${id}`, data),
  deleteLesson: (id) => axiosClient.delete(`${BASE}/lessons/${id}`),

  // Challenges
  getChallenges: (params) => axiosClient.get(`${BASE}/challenges`, { params }),
  getChallenge: (id) => axiosClient.get(`${BASE}/challenges/${id}`),
  createChallenge: (data) => axiosClient.post(`${BASE}/challenges`, data),
  updateChallenge: (id, data) => axiosClient.put(`${BASE}/challenges/${id}`, data),
  deleteChallenge: (id) => axiosClient.delete(`${BASE}/challenges/${id}`),

  // Challenge Options
  getChallengeOptions: (challengeId) => axiosClient.get(`${BASE}/challenge-options`, challengeId ? { params: { challengeId } } : {}),
  createChallengeOption: (data) => axiosClient.post(`${BASE}/challenge-options`, data),
  updateChallengeOption: (id, data) => axiosClient.put(`${BASE}/challenge-options/${id}`, data),
  deleteChallengeOption: (id) => axiosClient.delete(`${BASE}/challenge-options/${id}`),

  // Daily Challenges
  getDailyChallenges: (params) => axiosClient.get(`${BASE}/daily-challenges`, { params }),
  saveDailyChallenge: (data) => axiosClient.post(`${BASE}/daily-challenges`, data),
  deleteDailyChallenge: (date) => axiosClient.delete(`${BASE}/daily-challenges/${date}`),
};
