/**
 * Share API Integration Tests
 * Tests: Create Share, Get by Code, Get User Shares, Deactivate Share
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

const User = require('../src/modules/user/user.model');
const FlashcardSet = require('../src/models/flashcardSet.model');
const shareRoutes = require('../src/modules/shares/share.routes');

describe('Share API', () => {
  let app;
  let authToken;
  let testUser;
  let testSet;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/shares', shareRoutes);
    
    // Add error handler
    app.use((err, req, res, next) => {
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
    });

    testSet = await FlashcardSet.create({
      title: 'Test Set',
      user: testUser._id,
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString(), role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/shares (Create Share)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/shares', () => {
    it('should create a share link for user set', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shareCode).toBeDefined();
    });

    it('should return existing share if already shared', async () => {
      // Create first share
      await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      // Try to create again
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.data.shareCode).toBeDefined();
    });

    it('should return 404 for non-existent set', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: fakeId.toString() });

      expect(res.status).toBe(404);
    });

    it('should return 403 for other user set', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const otherSet = await FlashcardSet.create({
        title: 'Other Set',
        user: otherUser._id,
      });

      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: otherSet._id.toString() });

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/shares')
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/shares/shared/:shareCode (Get by Share Code)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/shares/shared/:shareCode', () => {
    it('should get set by share code', async () => {
      // Create share directly in DB to get the shareCode
      const Share = require('../src/models/share.model');
      const share = await Share.create({
        set: testSet._id,
        user: testUser._id,
      });

      const res = await request(app)
        .get(`/api/shares/shared/${share.shareCode}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shareCode).toBe(share.shareCode);
    });

    it('should return 404 for invalid share code', async () => {
      const res = await request(app)
        .get('/api/shares/shared/invalidcode123');

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/shares (Get User Shares)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/shares', () => {
    it('should return user shares', async () => {
      // Create a share first
      await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      const res = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/shares');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/shares/:id (Deactivate Share)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/shares/:id', () => {
    it('should deactivate a share', async () => {
      // Create a share first
      const shareRes = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      const shareId = shareRes.body.data._id;

      const res = await request(app)
        .delete(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent share', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/shares/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
