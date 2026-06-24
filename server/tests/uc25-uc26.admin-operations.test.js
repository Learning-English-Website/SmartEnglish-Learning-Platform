/**
 * Admin Operations API Integration Tests (UC25, UC26)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const Feedback = require('../src/models/feedback.model');
const Order = require('../src/models/order.model');
const adminRoutes = require('../src/modules/admin/admin.routes');
const feedbackRoutes = require('../src/modules/feedback/feedback.routes');

describe('Admin Operations (UC25, UC26)', () => {
  let app;
  let adminToken;
  let cskhToken;
  let studentUser;
  let adminUser;
  let cskhUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Setup authentication middleware injection
    app.use('/api/admin', adminRoutes);
    app.use('/api/feedback', feedbackRoutes);

    // Add error handler for debugging
    app.use((err, req, res, next) => {
      const statusCode = err.statusCode || err.status || 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Internal server error',
        }
      });
    });
  });

  beforeEach(async () => {
    // Hash password once to speed up tests
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);

    adminUser = await User.create({
      email: 'admin_security_op@example.com',
      username: 'adminsecop',
      password: hashedPassword,
      isVerified: true,
      role: 'admin',
    });

    cskhUser = await User.create({
      email: 'cskh_security_op@example.com',
      username: 'cskhsecop',
      password: hashedPassword,
      isVerified: true,
      role: 'cskh',
    });

    studentUser = await User.create({
      email: 'student_security_op@example.com',
      username: 'studentsecop',
      password: hashedPassword,
      isVerified: true,
      role: 'student',
    });

    adminToken = jwt.sign(
      { sub: adminUser._id.toString(), role: adminUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    cskhToken = jwt.sign(
      { sub: cskhUser._id.toString(), role: cskhUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // UC25 - Cập nhật nhanh trạng thái phản hồi
  // ─────────────────────────────────────────────────────────────────
  describe('UC25 - CSKH & Admin Feedback Management', () => {
    let testFeedback;

    beforeEach(async () => {
      testFeedback = await Feedback.create({
        user: studentUser._id,
        title: 'Lỗi phát âm bài học',
        content: 'Bài học Greetings phát âm từ Hello không nghe rõ.',
        category: 'bug',
        status: 'pending',
      });
    });

    it('TC-UC25-03: should allow Admin/CSKH to quickly update feedback status to resolved', async () => {
      const res = await request(app)
        .put(`/api/feedback/admin/${testFeedback._id}`)
        .set('Authorization', `Bearer ${cskhToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');

      const updated = await Feedback.findById(testFeedback._id);
      expect(updated.status).toBe('resolved');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UC26 - Duyệt hóa đơn Premium thủ công / Xem đơn hàng
  // ─────────────────────────────────────────────────────────────────
  describe('UC26 - Order Management & Manual Verification', () => {
    let order1;

    beforeEach(async () => {
      order1 = await Order.create({
        orderId: 'ORDER_123',
        user: studentUser._id,
        method: 'momo',
        amount: 99000,
        status: 'pending',
        transId: 'TXN_123',
      });
    });

    it('TC-UC26-01: should allow Admin to view and search orders with keywords', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .query({ search: 'studentsecop' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThan(0);

      const orderObj = res.body.data.orders[0];
      expect(orderObj).toHaveProperty('orderId');
      expect(orderObj).toHaveProperty('user');
      expect(orderObj).toHaveProperty('method');
      expect(orderObj).toHaveProperty('amount');
      expect(orderObj).toHaveProperty('status');
      expect(orderObj).toHaveProperty('transId');
    });
  });
});
