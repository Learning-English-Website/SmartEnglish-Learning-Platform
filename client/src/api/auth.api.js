import axiosClient from './axiosClient';

export const authAPI = {
  login: (data) => axiosClient.post('/auth/login', data),
  register: (data) => axiosClient.post('/auth/register', data),
  refresh: (data) => axiosClient.post('/auth/refresh', data),
  logout: () => axiosClient.post('/auth/logout'),
  forgotPassword: (data) => axiosClient.post('/auth/forgot-password', data),
  verifyEmailOtp: (data) => axiosClient.post('/auth/verify-email-otp', data),
  resetPasswordOtp: (data) => axiosClient.post('/auth/reset-password-otp', data),
  getMe: () => axiosClient.get('/users/me'),
  updateProfile: (data) => axiosClient.put('/users/me', data),
};
