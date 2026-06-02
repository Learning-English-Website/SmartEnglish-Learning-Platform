const { createPayment, queryTransaction } = require('../../config/momo');
const UserProgress = require('../../models/userProgress.model');
const User = require('../user/user.model');
const Order = require('../../models/order.model');

const PRO_PRICE_VND = 5000; // 5,000 VND

class MoMoService {
  async createPayment(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const orderId = `PRO_${userId}_${Date.now()}`;
    const orderInfo = `Memoris Pro Subscription - ${user.email}`;
    const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/premium/success?method=momo&orderId=${orderId}`;
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const notifyUrl = `${serverUrl}/api/payment/momo/webhook`;

    try {
      const extraData = Buffer.from(JSON.stringify({ userId: user._id.toString(), type: 'pro_subscription' })).toString('base64');

      const response = await createPayment({
        orderId,
        amount: PRO_PRICE_VND,
        orderInfo,
        returnUrl,
        notifyUrl,
        extraData,
      });

      if (response.resultCode !== 0) {
        throw new Error(response.message || 'MoMo API error');
      }

      await Order.create({
        orderId,
        user: userId,
        method: 'momo',
        amount: PRO_PRICE_VND,
        status: 'pending',
        type: 'pro_subscription',
      });

      return { payUrl: response.payUrl, orderId };
    } catch (error) {
      console.error('MoMo createPayment error:', error);
      throw error;
    }
  }

  async handleWebhook(body) {
    const { orderId, resultCode, transId } = body;
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      console.error('MoMo webhook: Order not found', orderId);
      return { received: true };
    }

    if (resultCode === 0) {
      if (order.status === 'pending') {
        order.status = 'completed';
        order.transId = transId;
        order.paidAt = new Date();
        await order.save();

        await UserProgress.findOneAndUpdate(
          { user: order.user },
          { 
            isPro: true,
            proActivatedAt: new Date(),
            proExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            proMethod: 'momo',
          },
          { upsert: true }
        );

        // Also update User.premium status
        await User.findByIdAndUpdate(order.user, { premium: 'premium' });
        
        console.log('MoMo payment success:', orderId);
      }
    } else {
      if (order.status === 'pending') {
        order.status = 'failed';
        await order.save();
        console.log('MoMo payment failed:', orderId, 'resultCode:', resultCode);
      }
    }

    return { received: true };
  }

  async checkOrderStatus(orderId) {
    try {
      return await queryTransaction(orderId);
    } catch (error) {
      console.error('MoMo checkOrderStatus error:', error);
      throw error;
    }
  }
}

module.exports = new MoMoService();
