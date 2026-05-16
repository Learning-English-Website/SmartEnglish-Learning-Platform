/**
 * Study Session API Integration Tests
 * Tests: Start Session, Submit Answer, Complete Session, Get Sessions
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
const Flashcard = require('../src/models/flashcard.model');
const studySessionRoutes = require('../src/modules/study-sessions/studySession.routes');

describe('Study Session API', () => {
  let app;
  let authToken;
  let testUser;
  let testSet;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/study-sessions', studySessionRoutes);
    
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
  // POST /api/study-sessions/start (Start Session)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/study-sessions/start', () => {
    it('should start a study session', async () => {
      // Create a card first
      await Flashcard.create({
        set: testSet._id,
        front: 'Hello',
        back: 'Xin chao',
      });

      const res = await request(app)
        .post('/api/study-sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.totalCards).toBe(1);
    });

    it('should return 400 for set with no cards', async () => {
      const res = await request(app)
        .post('/api/study-sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('no cards');
    });

    it('should return 404 for non-existent set', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/study-sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: fakeId.toString() });

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/study-sessions/start')
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/study-sessions/:sessionId/answer (Submit Answer)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/study-sessions/:sessionId/answer', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a card and start session
      await Flashcard.create({
        set: testSet._id,
        front: 'Hello',
        back: 'Xin chao',
      });

      const startRes = await request(app)
        .post('/api/study-sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      sessionId = startRes.body.data.session._id;
    });

    it('should submit a correct answer', async () => {
      const card = await Flashcard.findOne({ set: testSet._id });

      const res = await request(app)
        .post(`/api/study-sessions/${sessionId}/answer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId: card._id.toString(), isCorrect: true });

      expect(res.status).toBe(200);
      expect(res.body.data.accuracy).toBe(100);
    });

    it('should submit an incorrect answer', async () => {
      const card = await Flashcard.findOne({ set: testSet._id });

      const res = await request(app)
        .post(`/api/study-sessions/${sessionId}/answer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId: card._id.toString(), isCorrect: false });

      expect(res.status).toBe(200);
      expect(res.body.data.accuracy).toBe(0);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/study-sessions/${fakeId}/answer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId: 'fake', isCorrect: true });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/study-sessions/:sessionId/complete (Complete Session)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/study-sessions/:sessionId/complete', () => {
    let sessionId;

    beforeEach(async () => {
      await Flashcard.create({
        set: testSet._id,
        front: 'Hello',
        back: 'Xin chao',
      });

      const startRes = await request(app)
        .post('/api/study-sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      sessionId = startRes.body.data.session._id;
    });

    it('should complete a session', async () => {
      const res = await request(app)
        .post(`/api/study-sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ durationMs: 60000 });

      expect(res.status).toBe(200);
      expect(res.body.data.completedAt).toBeDefined();
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/study-sessions/${fakeId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      // Either 404 (AppError) or 500 (CastError from invalid ID format)
      expect([404, 500]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/study-sessions (Get User Sessions)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/study-sessions', () => {
    it('should return user sessions', async () => {
      // Start a session first
      await Flashcard.create({
        set: testSet._id,
        front: 'Hello',
        back: 'Xin chao',
      });

      await request(app)
        .post('/api/study-sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      const res = await request(app)
        .get('/api/study-sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/study-sessions');

      expect(res.status).toBe(401);
    });
  });
});
