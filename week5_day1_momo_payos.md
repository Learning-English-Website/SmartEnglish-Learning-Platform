# NGÀY 1 — Momo + PayOS Payments + Pro Subscription

## Tổng quan

**Momo** và **PayOS** là 2 cổng thanh toán phổ biến tại Việt Nam:
- **Momo**: Ví điện tử, thanh toán qua QR code
- **PayOS**: Thanh toán QR VietQR, tích hợp dễ dàng với VN banks
- **Giá**: 500.000đ/tháng

---

## Backend Setup

### 1. MoMo Config

#### Tạo `server/src/config/momo.js`
```javascript
const MoMo = require('@momoj/sdk');

const momo = new MoMo({
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

module.exports = momo;
```

### 2. MoMo Service

#### Tạo `server/src/modules/payment/momo.service.js`
```javascript
const momo = require('../../config/momo');
const UserProgress = require('../../models/userProgress.model');

const PRO_PRICE_VND = 5000;

class MoMoService {
  async createPayment(userId) {
    const User = require('../../models/user.model');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const orderId = `PRO_${userId}_${Date.now()}`;
    const orderInfo = `Pro Subscription - ${user.email}`;
    const amount = PRO_PRICE_VND.toString();
    const returnUrl = `${process.env.CLIENT_URL}/pro/success?method=momo&orderId=${orderId}`;
    const notifyUrl = `${process.env.SERVER_URL}/api/payment/momo/webhook`;

    const requestBody = {
      partnerCode: process.env.MOMO_PARTNER_CODE,
      accessKey: process.env.MOMO_ACCESS_KEY,
      requestId: orderId,
      amount,
      orderId,
      orderInfo,
      returnUrl,
      notifyUrl,
      requestType: 'captureWallet',
      extraData: JSON.stringify({ userId: user._id.toString(), type: 'pro_subscription' }),
    };

    const response = await momo.createPayment(requestBody);
    await this.saveOrder(orderId, userId, 'momo', amount);
    return { payUrl: response.payUrl, orderId };
  }

  async saveOrder(orderId, userId, method, amount) {
    const Order = require('../../models/order.model');
    await Order.create({
      orderId,
      user: userId,
      method,
      amount,
      status: 'pending',
      type: 'pro_subscription',
    });
  }

  async handleWebhook(body) {
    const { orderId, resultCode, transId } = body;
    
    if (resultCode === 0) {
      const Order = require('../../models/order.model');
      const order = await Order.findOne({ orderId });
      
      if (order && order.status === 'pending') {
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
      }
    } else {
      const Order = require('../../models/order.model');
      await Order.findOneAndUpdate({ orderId }, { status: 'failed' });
    }
  }

  async checkOrderStatus(orderId) {
    return await momo.queryTransaction({ orderId });
  }
}

module.exports = new MoMoService();
```

### 3. PayOS Config

#### Tạo `server/src/config/payos.js`
```javascript
const PayOS = require('@payos/node');

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

module.exports = payos;
```

### 4. PayOS Service

#### Tạo `server/src/modules/payment/payos.service.js`
```javascript
const payos = require('../../config/payos');
const UserProgress = require('../../models/userProgress.model');

const PRO_PRICE_VND = 5000;

class PayOSService {
  async createPayment(userId, userEmail) {
    const orderId = `PRO_${userId}_${Date.now()}`;
    const description = 'SmartEnglish Pro Subscription';
    const amount = PRO_PRICE_VND;
    const returnUrl = `${process.env.CLIENT_URL}/pro/success?method=payos&orderId=${orderId}`;
    const cancelUrl = `${process.env.CLIENT_URL}/pro/cancel`;

    const paymentData = {
      orderCode: orderId,
      amount,
      description,
      returnUrl,
      cancelUrl,
      buyerName: userEmail,
      email: userEmail,
    };

    const response = await payos.createPaymentLink(paymentData);
    await this.saveOrder(orderId, userId, 'payos', amount);
    return { checkoutUrl: response.checkoutUrl, orderId };
  }

  async saveOrder(orderId, userId, method, amount) {
    const Order = require('../../models/order.model');
    await Order.create({
      orderId,
      user: userId,
      method,
      amount,
      status: 'pending',
      type: 'pro_subscription',
    });
  }

  async handleWebhook(body) {
    const { orderCode, status, transactionId } = body;
    
    if (status === 'PAID') {
      const Order = require('../../models/order.model');
      const order = await Order.findOne({ orderId: orderCode });
      
      if (order && order.status === 'pending') {
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
      }
    } else {
      const Order = require('../../models/order.model');
      await Order.findOneAndUpdate({ orderId: orderCode }, { status: 'failed' });
    }
  }
}

module.exports = new PayOSService();
```

### 5. Unified Payment Service

#### Tạo `server/src/modules/payment/payment.service.js`
```javascript
const momoService = require('./momo.service');
const payosService = require('./payos.service');
const User = require('../../models/user.model');
const UserProgress = require('../../models/userProgress.model');

class PaymentService {
  async getPaymentMethods() {
    return {
      momo: {
        name: 'MoMo',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Mo-removebg-preview.png/120px-Mo-removebg-preview.png',
        description: 'Quét mã QR bằng ứng dụng MoMo',
      },
      payos: {
        name: 'PayOS',
        icon: 'https://payos.vn/logo-payos.svg',
        description: 'Thanh toán qua QR VietQR với ngân hàng bất kỳ',
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
      isActive: !progress.proExpiresAt || progress.proExpiresAt > new Date(),
    };
  }

  async verifyPayment(orderId) {
    const Order = require('../../models/order.model');
    const order = await Order.findOne({ orderId }).populate('user');
    
    if (!order) {
      return { valid: false, error: 'Order not found' };
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
```

### 6. Payment Controller

#### Tạo `server/src/modules/payment/payment.controller.js`
```javascript
const paymentService = require('./payment.service');
const momoService = require('./momo.service');
const payosService = require('./payos.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');

class PaymentController {
  getMethods = asyncHandler(async (req, res) => {
    const methods = await paymentService.getPaymentMethods();
    res.json(ApiResponse.success(methods));
  });

  createPayment = asyncHandler(async (req, res) => {
    const { method } = req.body;
    const result = await paymentService.createPayment(req.userId, method);
    res.json(ApiResponse.success(result));
  });

  getSubscription = asyncHandler(async (req, res) => {
    const subscription = await paymentService.getSubscription(req.userId);
    res.json(ApiResponse.success(subscription));
  });

  verifyPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const result = await paymentService.verifyPayment(orderId);
    res.json(ApiResponse.success(result));
  });

  handleMoMoWebhook = asyncHandler(async (req, res) => {
    await momoService.handleWebhook(req.body);
    res.json({ success: true });
  });

  handlePayOSWebhook = asyncHandler(async (req, res) => {
    await payosService.handleWebhook(req.body);
    res.json({ success: true });
  });
}

module.exports = new PaymentController();
```

### 7. Payment Routes

#### Tạo `server/src/modules/payment/payment.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

// Public routes (webhooks)
router.post('/momo/webhook', paymentController.handleMoMoWebhook);
router.post('/payos/webhook', paymentController.handlePayOSWebhook);

// Protected routes
router.use(authMiddleware);
router.get('/methods', paymentController.getMethods);
router.post('/checkout', paymentController.createPayment);
router.get('/subscription', paymentController.getSubscription);
router.get('/verify/:orderId', paymentController.verifyPayment);

module.exports = router;
```

### 8. Order Model

#### Tạo `server/src/models/order.model.js`
```javascript
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  method: { type: String, enum: ['momo', 'payos'], required: true },
  type: { type: String, enum: ['pro_subscription', 'hearts', 'other'], default: 'pro_subscription' },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  transId: { type: String, default: null },
  paidAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
```

---

## Frontend Setup

### 1. Payment Service

#### Tạo `client/src/services/paymentService.js`
```javascript
import api from '../api/axiosClient';

export const paymentService = {
  getMethods: () => api.get('/payment/methods'),
  createCheckout: (method) => api.post('/payment/checkout', { method }),
  getSubscription: () => api.get('/payment/subscription'),
  verifyPayment: (orderId) => api.get(`/payment/verify/${orderId}`),
};
```

### 2. Pro Page

#### Tạo `client/src/pages/Pro/ProPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';
import './ProPage.css';

export default function ProPage() {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('momo');
  const [methods, setMethods] = useState({});

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data } = await paymentService.getMethods();
      setMethods(data.data);
    } catch (err) {
      console.error('Failed to load methods', err);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await paymentService.createCheckout(selectedMethod);
      window.location.href = data.data.payUrl || data.data.checkoutUrl;
    } catch (err) {
      console.error('Checkout failed', err);
      alert(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-page">
      <div className="pro-hero">
        <h1>Nâng cấp Pro</h1>
        <p>Mở khóa sức mạnh học tập không giới hạn</p>
      </div>

      <div className="pro-features">
        <div className="feature-card">
          <span className="icon">❤️</span>
          <h3>Vô hạn Hearts</h3>
          <p>Học không giới hạn. Không bao giờ hết hearts.</p>
        </div>
        <div className="feature-card">
          <span className="icon">📊</span>
          <h3>Phân tích chi tiết</h3>
          <p>Thống kê và analytics học tập chi tiết.</p>
        </div>
        <div className="feature-card">
          <span className="icon">🎯</span>
          <h3>Chế độ Offline</h3>
          <p>Tải bài học để học offline.</p>
        </div>
        <div className="feature-card">
          <span className="icon">🏆</span>
          <h3>Thành tựu độc quyền</h3>
          <p>Mở khóa thành tựu Pro đặc biệt.</p>
        </div>
      </div>

      <div className="pro-pricing">
        <div className="price-tag">
          <span className="amount">500.000đ</span>
          <span className="period">/ tháng</span>
        </div>

        <div className="payment-methods">
          <h3>Chọn phương thức thanh toán</h3>
          
          <label className={`method-option ${selectedMethod === 'momo' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              name="method" 
              value="momo"
              checked={selectedMethod === 'momo'}
              onChange={(e) => setSelectedMethod(e.target.value)}
            />
            <img src={methods.momo?.icon} alt="MoMo" className="method-icon" />
            <div className="method-info">
              <span className="method-name">MoMo</span>
              <span className="method-desc">Quét mã QR bằng app MoMo</span>
            </div>
          </label>

          <label className={`method-option ${selectedMethod === 'payos' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              name="method" 
              value="payos"
              checked={selectedMethod === 'payos'}
              onChange={(e) => setSelectedMethod(e.target.value)}
            />
            <img src={methods.payos?.icon} alt="PayOS" className="method-icon" />
            <div className="method-info">
              <span className="method-name">PayOS</span>
              <span className="method-desc">Thanh toán qua QR VietQR</span>
            </div>
          </label>
        </div>

        <button 
          className="btn-pro-upgrade" 
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : 'Nâng cấp ngay'}
        </button>
        <p className="cancel-note">Hủy bất kỳ lúc nào. Không cam kết.</p>
      </div>
    </div>
  );
}
```

### 3. Success Page

#### Tạo `client/src/pages/Pro/SuccessPage.jsx`
```javascript
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    if (!orderId) {
      setStatus('invalid');
      return;
    }

    try {
      const { data } = await paymentService.verifyPayment(orderId);
      if (data.data.valid) {
        setStatus('success');
      } else {
        setStatus('pending');
      }
    } catch (err) {
      console.error('Verify error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="success-page">
      {status === 'verifying' && (
        <div className="status-card">
          <div className="spinner"></div>
          <h2>Đang xác minh thanh toán...</h2>
        </div>
      )}

      {status === 'success' && (
        <div className="status-card success">
          <span className="icon">🎉</span>
          <h2>Chúc mừng!</h2>
          <p>Bạn đã trở thành thành viên Pro</p>
          <Link to="/dashboard" className="btn-primary">
            Bắt đầu học ngay
          </Link>
        </div>
      )}

      {status === 'pending' && (
        <div className="status-card pending">
          <span className="icon">⏳</span>
          <h2>Đang xử lý</h2>
          <p>Thanh toán đang được xử lý. Vui lòng đợi trong giây lát.</p>
          <button onClick={verifyPayment} className="btn-secondary">
            Kiểm tra lại
          </button>
        </div>
      )}

      {(status === 'error' || status === 'invalid') && (
        <div className="status-card error">
          <span className="icon">❌</span>
          <h2>Có lỗi xảy ra</h2>
          <p>Vui lòng liên hệ hỗ trợ nếu bạn đã thanh toán.</p>
          <Link to="/pro" className="btn-secondary">
            Thử lại
          </Link>
        </div>
      )}
    </div>
  );
}
```

### 4. Cancel Page

#### Tạo `client/src/pages/Pro/CancelPage.jsx`
```javascript
import { Link } from 'react-router-dom';

export default function CancelPage() {
  return (
    <div className="cancel-page">
      <div className="status-card">
        <span className="icon">😔</span>
        <h2>Đã hủy</h2>
        <p>Thanh toán đã bị hủy. Bạn có thể thử lại bất kỳ lúc nào.</p>
        <Link to="/pro" className="btn-primary">
          Quay lại trang Pro
        </Link>
      </div>
    </div>
  );
}
```

---

## Cập nhật Model

### UserProgress Model

Thêm các fields sau vào `server/src/models/userProgress.model.js`:

```javascript
// Pro subscription
isPro: { type: Boolean, default: false },
proActivatedAt: { type: Date, default: null },
proExpiresAt: { type: Date, default: null },
proMethod: { type: String, enum: ['momo', 'payos', null], default: null },
```

---

## Environment Variables

Thêm vào `.env`:

```env
# MoMo
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key

# PayOS
PAYSOS_CLIENT_ID=your_client_id
PAYSOS_API_KEY=your_api_key
PAYSOS_CHECKSUM_KEY=your_checksum_key
```

---

## Checklist Ngày 1

| # | Task | Status |
|---|---|---|
| 1 | Tạo MoMo config & service | ⬜ |
| 2 | Tạo PayOS config & service | ⬜ |
| 3 | Tạo unified payment service | ⬜ |
| 4 | Tạo payment controller & routes | ⬜ |
| 5 | Tạo Order model | ⬜ |
| 6 | Cập nhật UserProgress model | ⬜ |
| 7 | Tạo frontend Pro page | ⬜ |
| 8 | Tạo Success/Cancel pages | ⬜ |
| 9 | Test thanh toán MoMo | ⬜ |
| 10 | Test thanh toán PayOS | ⬜ |

---

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/payment/methods` | Lấy danh sách payment methods |
| POST | `/api/payment/checkout` | Tạo payment (body: { method }) |
| GET | `/api/payment/subscription` | Lấy thông tin subscription |
| GET | `/api/payment/verify/:orderId` | Verify payment |
| POST | `/api/payment/momo/webhook` | MoMo webhook |
| POST | `/api/payment/payos/webhook` | PayOS webhook |

