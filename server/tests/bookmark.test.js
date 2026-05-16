/**
 * Bookmark API Integration Tests
 * Tests: Add Bookmark, Remove Bookmark, Get Bookmarks
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
const bookmarkRoutes = require('../src/modules/bookmarks/bookmark.routes');

describe('Bookmark API', () => {
  let app;
  let authToken;
  let testUser;
  let testSet;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bookmarks', bookmarkRoutes);
    
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
  // POST /api/bookmarks (Add Bookmark)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/bookmarks', () => {
    it('should add a bookmark', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return existing bookmark if already bookmarked', async () => {
      // First bookmark
      await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      // Try again
      const res = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(201);
    });

    it('should return 404 for non-existent set', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: fakeId.toString() });

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/bookmarks')
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/bookmarks (Get User Bookmarks)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/bookmarks', () => {
    it('should return user bookmarks', async () => {
      // Add a bookmark first
      await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      const res = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/bookmarks');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/bookmarks/:setId (Remove Bookmark)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/bookmarks/:setId', () => {
    it('should remove a bookmark', async () => {
      // Add a bookmark first
      await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      const res = await request(app)
        .delete(`/api/bookmarks/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const res = await request(app)
        .delete(`/api/bookmarks/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .delete(`/api/bookmarks/${testSet._id}`);

      expect(res.status).toBe(401);
    });
  });
});
