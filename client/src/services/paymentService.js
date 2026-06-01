import api from '../api/axiosClient';

export const paymentService = {
  getMethods: () => api.get('/payment/methods'),
  createCheckout: (method) => api.post('/payment/checkout', { method }),
  getSubscription: () => api.get('/payment/subscription'),
  verifyPayment: (orderId) => api.get(`/payment/verify/${orderId}`),
};
