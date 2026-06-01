const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// ===============================
// PUBLIC ROUTES (Webhooks)
// ===============================
router.post('/momo/webhook', paymentController.handleMoMoWebhook);
router.post('/payos/webhook', paymentController.handlePayOSWebhook);

// ===============================
// PROTECTED ROUTES (Need Auth)
// ===============================
router.get('/methods', authenticate, paymentController.getMethods);
router.post('/checkout', authenticate, paymentController.createPayment);
router.get('/subscription', authenticate, paymentController.getSubscription);
router.get('/verify/:orderId', authenticate, paymentController.verifyPayment);

module.exports = router;
