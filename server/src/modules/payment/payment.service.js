const momoService = require('./momo.service');
const payosService = require('./payos.service');
const User = require('../user/user.model');
const UserProgress = require('../../models/userProgress.model');
const Order = require('../../models/order.model');

class PaymentService {
  async getPaymentMethods() {
    return {
      momo: {
        name: 'MoMo',
        icon: '/momo-logo.png',
        description: 'Quet ma QR bang ung dung MoMo',
      },
      payos: {
        name: 'PayOS',
        icon: '/payos-logo.png',
        description: 'Thanh toan qua QR VietQR voi ngan hang bat ky',
      },
    };
  }

  async createPayment(userId, method) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const progress = await UserProgress.findOne({ user: userId });
    if (progress?.isPro) {
      throw new Error('Already subscribed to Pro');
    }

    if (method === 'momo') {
      return await momoService.createPayment(userId);
    } else if (method === 'payos') {
      return await payosService.createPayment(userId, user.email);
    } else {
      throw new Error('Invalid payment method');
    }
  }

  async getSubscription(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    
    if (!progress?.isPro) {
      return { isPro: false };
    }

    return {
      isPro: true,
      activatedAt: progress.proActivatedAt,
      expiresAt: progress.proExpiresAt,
      method: progress.proMethod,
      isActive: !progress.proExpiresAt || progress.proExpiresAt > new Date(),
    };
  }

  async verifyPayment(orderId) {
    const order = await Order.findOne({ orderId }).populate('user');
    
    if (!order) {
      return { valid: false, error: 'Order not found' };
    }

    // Active status query fallback for pending orders (crucial for local testing and robustness)
    if (order.status === 'pending') {
      try {
        if (order.method === 'momo') {
          const statusResult = await momoService.checkOrderStatus(orderId);
          console.log('MoMo checkOrderStatus result:', statusResult);
          
          if (statusResult && statusResult.resultCode === 0) {
            order.status = 'completed';
            order.transId = statusResult.transId || (statusResult.transList && statusResult.transList[0]?.transId);
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

            console.log(`MoMo order ${orderId} successfully completed and verified via query API.`);
          }
        } else if (order.method === 'payos') {
          const statusResult = await payosService.checkOrderStatus(orderId);
          console.log('PayOS checkOrderStatus result:', statusResult);
          
          if (statusResult && statusResult.code === '00' && statusResult.data && statusResult.data.status === 'PAID') {
            order.status = 'completed';
            order.transId = statusResult.data.transactions && statusResult.data.transactions[0]?.transactionId;
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

            console.log(`PayOS order ${orderId} successfully completed and verified via query API.`);
          }
        }
      } catch (err) {
        console.error('Error during active order status check:', err);
      }
    }

    return {
      valid: order.status === 'completed',
      status: order.status,
      method: order.method,
      order,
    };
  }
}

module.exports = new PaymentService();
