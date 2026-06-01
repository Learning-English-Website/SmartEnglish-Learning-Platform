const { createPaymentLink } = require('../../config/payos');
const UserProgress = require('../../models/userProgress.model');
const User = require('../user/user.model');
const Order = require('../../models/order.model');

const PRO_PRICE_VND = 5000; // 5,000 VND

class PayOSService {
  async createPayment(userId, userEmail) {
    const orderCode = Number(Date.now().toString() + Math.floor(Math.random() * 10).toString());
    const description = 'SmartEnglish Pro';
    const returnUrl = `${process.env.CLIENT_URL}/premium/success?method=payos&orderId=${orderCode}`;
    const cancelUrl = `${process.env.CLIENT_URL}/premium/cancel`;

    try {
      const response = await createPaymentLink({
        orderCode,
        amount: PRO_PRICE_VND,
        description,
        returnUrl,
        cancelUrl,
        buyerName: userEmail,
        buyerEmail: userEmail,
      });

      if (response.code !== '00') {
        throw new Error(response.desc || 'PayOS API error');
      }

      await Order.create({
        orderId: orderCode.toString(),
        user: userId,
        method: 'payos',
        amount: PRO_PRICE_VND,
        status: 'pending',
        type: 'pro_subscription',
      });

      return { checkoutUrl: response.data.checkoutUrl, orderId: orderCode.toString() };
    } catch (error) {
      console.error('PayOS createPayment error:', error);
      throw error;
    }
  }

  async handleWebhook(body) {
    const { orderCode, status, transactionId } = body;
    
    const order = await Order.findOne({ orderId: orderCode });
    
    if (!order) {
      console.error('PayOS webhook: Order not found', orderCode);
      return { received: true };
    }

    if (status === 'PAID') {
      if (order.status === 'pending') {
        order.status = 'completed';
        order.transId = transactionId;
        order.paidAt = new Date();
        await order.save();

        await UserProgress.findOneAndUpdate(
          { user: order.user },
          { 
            isPro: true,
            proActivatedAt: new Date(),
            proExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            proMethod: 'payos',
          },
          { upsert: true }
        );

        // Also update User.premium status
        await User.findByIdAndUpdate(order.user, { premium: 'premium' });
        
        console.log('PayOS payment success:', orderCode);
      }
    } else {
      if (order.status === 'pending') {
        order.status = 'failed';
        await order.save();
        console.log('PayOS payment failed:', orderCode, 'status:', status);
      }
    }

    return { received: true };
  }

  async checkOrderStatus(orderId) {
    try {
      const { getPaymentLinkInformation } = require('../../config/payos');
      return await getPaymentLinkInformation(orderId);
    } catch (error) {
      console.error('PayOS checkOrderStatus error:', error);
      throw error;
    }
  }
}

module.exports = new PayOSService();
