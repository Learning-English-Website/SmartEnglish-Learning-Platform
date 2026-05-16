/**
 * User API Integration Tests
 * Tests: Get Profile, Update Profile, Delete Account
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

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
const userRoutes = require('../src/modules/user/user.routes');

describe('User API', () => {
  let app;
  let authToken;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
    
    // Add error handler for debugging
    app.use((err, req, res, next) => {
      console.error('Test Error:', err.message);
      const statusCode = err.statusCode || err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  beforeEach(async () => {
    testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
      role: 'student',
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString(), role: testUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/users/me (Get Profile)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/users/me', () => {
    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.username).toBe(testUser.username);
      expect(res.body.data.password).toBeUndefined();
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/users/me');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/users/me (Update Profile)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/users/me', () => {
    it('should update username', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'newusername' });

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('newusername');
    });

    it('should update avatar', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ avatar: 'https://example.com/avatar.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toBe('https://example.com/avatar.jpg');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/users/me (Delete Account)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/users/me', () => {
    it('should delete user account', async () => {
      const res = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await User.findById(testUser._id);
      expect(deleted).toBeNull();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/users/me');

      expect(res.status).toBe(401);
    });
  });
});
