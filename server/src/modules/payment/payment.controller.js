const paymentService = require('./payment.service');
const momoService = require('./momo.service');
const payosService = require('./payos.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');

class PaymentController {
  getMethods = asyncHandler(async (req, res) => {
    const methods = await paymentService.getPaymentMethods();
    res.json({ success: true, data: methods });
  });

  createPayment = asyncHandler(async (req, res) => {
    const { method } = req.body;
    if (!method) {
      return res.status(400).json({ success: false, error: 'Payment method is required' });
    }
    const result = await paymentService.createPayment(req.userId, method);
    res.json({ success: true, data: result });
  });

  getSubscription = asyncHandler(async (req, res) => {
    const subscription = await paymentService.getSubscription(req.userId);
    res.json({ success: true, data: subscription });
  });

  verifyPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const result = await paymentService.verifyPayment(orderId);
    res.json({ success: true, data: result });
  });

  // MoMo Webhook (public - no auth)
  handleMoMoWebhook = asyncHandler(async (req, res) => {
    await momoService.handleWebhook(req.body);
    res.json({ received: true });
  });

  // PayOS Webhook (public - no auth)
  handlePayOSWebhook = asyncHandler(async (req, res) => {
    await payosService.handleWebhook(req.body);
    res.json({ received: true });
  });
}

module.exports = new PaymentController();
