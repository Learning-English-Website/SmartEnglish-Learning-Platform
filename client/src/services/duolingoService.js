import axiosClient from '../api/axiosClient';

export const duolingoService = {
  // Courses
  getCourses: () => axiosClient.get('/duolingo/courses'),
  getCourse: (courseId) => axiosClient.get(`/duolingo/courses/${courseId}`),
  selectCourse: (courseId) => axiosClient.post('/duolingo/courses/select', { courseId }),

  // Units
  getUnits: () => axiosClient.get('/duolingo/units'),

  // Lessons
  getLesson: (lessonId) => axiosClient.get(`/duolingo/lessons/${lessonId}`),
  getNextLesson: () => axiosClient.get('/duolingo/lessons/next'),
  completeLesson: (lessonId) => axiosClient.post(`/duolingo/lessons/${lessonId}/complete`),
  practiceLesson: (lessonId) => axiosClient.post(`/duolingo/lessons/${lessonId}/practice`),

  // Quiz
  submitAnswer: (challengeId, selectedOptionId, userAnswer) =>
    axiosClient.post('/duolingo/quiz/answer', { challengeId, selectedOptionId, userAnswer }),

  // Hearts
  getHearts: () => axiosClient.get('/duolingo/hearts'),
  refillHearts: () => axiosClient.post('/duolingo/hearts/refill'),
  reduceHearts: () => axiosClient.post('/duolingo/hearts/reduce'),

  // Leaderboard
  getLeaderboard: (type = 'weekly') => axiosClient.get('/duolingo/leaderboard', { params: { type } }),

  // Media Upload
  uploadAudio: (file, challengeId, fieldname = 'audioSrc') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('challengeId', challengeId);
    formData.append('fieldname', fieldname);
    return axiosClient.post('/duolingo/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadImage: (file, challengeId, fieldname = 'imageSrc') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('challengeId', challengeId);
    formData.append('fieldname', fieldname);
    return axiosClient.post('/duolingo/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
