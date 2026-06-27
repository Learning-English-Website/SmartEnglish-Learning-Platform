/**
 * Admin Security API Integration Tests
 * Tests: CSKH and Admin permission limits on User administration APIs
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
const Folder = require('../src/models/folder.model');
const adminRoutes = require('../src/modules/admin/admin.routes');

describe('Admin & CSKH Security Restrictions', () => {
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
    const { authenticate } = require('../src/middleware/auth.middleware');
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
      email: 'admin_security@example.com',
      username: 'adminsec',
      password: hashedPassword,
      isVerified: true,
      role: 'admin',
    });

    cskhUser = await User.create({
      email: 'cskh_security@example.com',
      username: 'cskhsec',
      password: hashedPassword,
      isVerified: true,
      role: 'cskh',
    });

    studentUser = await User.create({
      email: 'student_security@example.com',
      username: 'studentsec',
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

  describe('CSKH Permission Restrictions', () => {
    it('should NOT allow CSKH to update user role', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${studentUser._id}/role`)
        .set('Authorization', `Bearer ${cskhToken}`)
        .send({ role: 'teacher' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/(Admin access required|permission)/i);

      // Verify role didn't change in DB
      const freshUser = await User.findById(studentUser._id);
      expect(freshUser.role).toBe('student');
    });

    it('should NOT allow CSKH to update user details', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${cskhToken}`)
        .send({ username: 'hackerstudent' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/(Admin access required|permission)/i);

      // Verify username didn't change in DB
      const freshUser = await User.findById(studentUser._id);
      expect(freshUser.username).toBe('studentsec');
    });

    it('should NOT allow CSKH to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${cskhToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/(Admin access required|permission)/i);

      // Verify user still exists in DB
      const freshUser = await User.findById(studentUser._id);
      expect(freshUser).not.toBeNull();
    });

    it('should allow CSKH to view users list', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${cskhToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThan(0);
    });

    it('should allow CSKH to manage premium status', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${studentUser._id}/premium`)
        .set('Authorization', `Bearer ${cskhToken}`)
        .send({ premiumType: 'premium', durationDays: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const freshUser = await User.findById(studentUser._id);
      expect(freshUser.premium).toBe('premium');
    });
  });

  describe('Admin Full Permissions', () => {
    it('should allow Admin to update user role', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${studentUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'teacher' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const freshUser = await User.findById(studentUser._id);
      expect(freshUser.role).toBe('teacher');
    });

    it('should allow Admin to update user details', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'updatedbyadmin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const freshUser = await User.findById(studentUser._id);
      expect(freshUser.username).toBe('updatedbyadmin');
    });

    it('should allow Admin to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const freshUser = await User.findById(studentUser._id);
      expect(freshUser).toBeNull();
    });

    it('should hide system favorite folders from admin folder list by default', async () => {
      await Folder.create([
        { user: studentUser._id, name: 'Yêu thích' },
        { user: studentUser._id, name: 'Student Folder' },
      ]);

      const res = await request(app)
        .get('/api/admin/folders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.folders.some((folder) => folder.name === 'Yêu thích')).toBe(false);
      expect(res.body.data.folders.some((folder) => folder.name === 'Student Folder')).toBe(true);
    });

    it('should include system favorite folders only when requested', async () => {
      await Folder.create({ user: studentUser._id, name: 'Yêu thích' });

      const res = await request(app)
        .get('/api/admin/folders')
        .query({ includeSystem: 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.folders.some((folder) => folder.name === 'Yêu thích')).toBe(true);
    });

    it('should not allow Admin to delete system favorite folders', async () => {
      const favoriteFolder = await Folder.create({ user: studentUser._id, name: 'Yêu thích' });

      const res = await request(app)
        .delete(`/api/admin/folders/${favoriteFolder._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await Folder.findById(favoriteFolder._id)).toBeTruthy();
    });
  });
});
