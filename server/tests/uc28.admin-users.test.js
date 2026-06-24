/**
 * Admin User Management API Integration Tests (UC28)
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
const adminRoutes = require('../src/modules/admin/admin.routes');

describe('Admin User Management (UC28)', () => {
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
      email: 'admin_security_us@example.com',
      username: 'adminsecus',
      password: hashedPassword,
      isVerified: true,
      role: 'admin',
    });

    cskhUser = await User.create({
      email: 'cskh_security_us@example.com',
      username: 'cskhsecus',
      password: hashedPassword,
      isVerified: true,
      role: 'cskh',
    });

    studentUser = await User.create({
      email: 'student_security_us@example.com',
      username: 'studentsecus',
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
  // UC28 - Quản lý người dùng
  // ─────────────────────────────────────────────────────────────────
  describe('UC28 - User Management Search, Filter, Lock & Unlock', () => {
    it('TC-UC28-01: should allow Admin/CSKH to view, search, and filter users by role student', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .query({ search: 'studentsecus', role: 'student' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBe(1);
      expect(res.body.data.users[0].username).toBe('studentsecus');
    });

    it('TC-UC28-04: should allow Admin to lock/unlock user accounts and prevent locking self', async () => {
      // Lock student account
      let res = await request(app)
        .put(`/api/admin/users/${studentUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'locked' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      let updatedUser = await User.findById(studentUser._id);
      expect(updatedUser.status).toBe('locked');

      // Unlock student account
      res = await request(app)
        .put(`/api/admin/users/${studentUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      updatedUser = await User.findById(studentUser._id);
      expect(updatedUser.status).toBe('active');

      // Prevent locking self
      res = await request(app)
        .put(`/api/admin/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'locked' });

      expect(res.status).toBe(400); // 400 Bad Request
      expect(res.body.success).toBe(false);
      
      const adminSelf = await User.findById(adminUser._id);
      expect(adminSelf.status).toBe('active');
    });
  });
});
