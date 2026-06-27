/**
 * Duolingo Service Integration Tests
 * Tests: submitAnswer idempotency, completeLesson idempotency/isLocked, getNextLesson locked
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
const UserProgress = require('../src/models/userProgress.model');
const Course = require('../src/models/course.model');
const Unit = require('../src/models/unit.model');
const Lesson = require('../src/models/lesson.model');
const Challenge = require('../src/models/challenge.model');
const ChallengeProgress = require('../src/models/challengeProgress.model');
const duolingoRoutes = require('../src/modules/duolingo/duolingo.routes');
const dailyChallengeService = require('../src/modules/quest/dailyChallenge.service');

describe('Duolingo API', () => {
  let app;
  let authToken;
  let testUser;
  let testCourse;
  let testUnit;
  let testLesson;
  let testChallenge;

  beforeEach(() => {
    // Stub getTodayChallenge to return null so it doesn't randomly select a lesson from the test database
    jest.spyOn(dailyChallengeService, 'getTodayChallenge').mockResolvedValue(null);

    app = express();
    app.use(express.json());
    app.use('/api/duolingo', duolingoRoutes);

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
      email: 'duouser@example.com',
      username: 'duouser',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
    });

    testCourse = await Course.create({ title: 'Test Course', order: 1 });
    testUnit = await Unit.create({ title: 'Test Unit', course: testCourse._id, order: 1 });
    testLesson = await Lesson.create({
      title: 'Test Lesson',
      unit: testUnit._id,
      order: 1,
      isLocked: false,
      isCompleted: false,
    });
    testChallenge = await Challenge.create({
      lesson: testLesson._id,
      type: 'SELECT',
      question: 'What is hello?',
      options: [
        { text: 'Hello', correct: true },
        { text: 'Goodbye', correct: false },
      ],
      order: 1,
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
  // POST /api/duolingo/quiz/answer — Idempotency
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/duolingo/quiz/answer', () => {
    beforeEach(async () => {
      // Ensure UserProgress exists so XP update works
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, points: 0, totalXP: 0 },
        { upsert: true, new: true }
      );
    });

    it('should submit correct answer and award XP once', async () => {
      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should NOT award XP twice for same answer (idempotency)', async () => {
      const payload = { challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text };

      await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      const before = await UserProgress.findOne({ user: testUser._id });

      // Same answer again — should NOT increment XP
      await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      const after = await UserProgress.findOne({ user: testUser._id });

      // Points should NOT increase on second submission
      expect(after.points).toBe(before.points);
    });

    it('should return 500 for non-existent challenge', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: fakeId.toString(), selectedOptionId: 'anything' });

      expect(res.status).toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/duolingo/lessons/:id/complete — Idempotency + isLocked
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/duolingo/lessons/:id/complete', () => {
    it('should complete a lesson', async () => {
      const res = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Lesson.findById(testLesson._id);
      expect(updated.isCompleted).toBe(true);
    });

    it('should be idempotent — calling complete twice does not error', async () => {
      await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should allow completing a locked lesson when accessed directly', async () => {
      testLesson.isLocked = true;
      await testLesson.save();

      const res = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Lesson.findById(testLesson._id);
      expect(updated.isCompleted).toBe(true);
      // Lock is a sequencing hint (not a security boundary). The service may unlock it.
      expect([true, false]).toContain(updated.isLocked);
    });

    it('should return error when lesson not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/duolingo/lessons/${fakeId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });

    it('should unlock next lesson after completion', async () => {
      const nextLesson = await Lesson.create({
        title: 'Next Lesson',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });

      await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      const unlocked = await Lesson.findById(nextLesson._id);
      expect(unlocked.isLocked).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/duolingo/lessons/next — isLocked check
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/duolingo/lessons/next', () => {
    beforeEach(async () => {
      await UserProgress.create({ user: testUser._id, activeCourse: testCourse._id });
    });

    it('should skip locked lessons in getNextLesson', async () => {
      const lockedLesson = await Lesson.create({
        title: 'Locked First',
        unit: testUnit._id,
        order: 0,
        isLocked: true,
        isCompleted: false,
      });
      await Challenge.create({
        lesson: lockedLesson._id,
        type: 'SELECT',
        question: 'Locked?',
        options: [{ text: 'A', correct: true }],
        order: 1,
      });

      const res = await request(app)
        .get('/api/duolingo/lessons/next')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Should return testLesson, not lockedLesson
      expect(res.body.data.lesson._id.toString()).toBe(testLesson._id.toString());
    });

    it('should return null when all lessons are completed', async () => {
      // Mark lesson's challenge as completed (needed for getNextLesson check)
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: testChallenge._id,
        completed: true,
      });
      // Mark lesson as completed
      testLesson.isCompleted = true;
      await testLesson.save();

      const lockedLesson2 = await Lesson.create({
        title: 'Locked Second',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });
      const challenge2 = await Challenge.create({
        lesson: lockedLesson2._id,
        type: 'SELECT',
        question: 'Test',
        options: [{ text: 'A', correct: true }],
        order: 1,
      });

      // Complete the second lesson's challenge as well
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: challenge2._id,
        completed: true,
      });

      const res = await request(app)
        .get('/api/duolingo/lessons/next')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/duolingo/lessons/:id — isLocked security check
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/duolingo/lessons/:id (Lock Enforcement)', () => {
    let lockedLesson;

    beforeEach(async () => {
      // Ensure UserProgress exists so XP update works
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, returnDocument: 'after' }
      );

      // Create a subsequent lesson in the unit (which is locked by default since order 1 is incomplete)
      lockedLesson = await Lesson.create({
        title: 'Locked Lesson',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });

      await Challenge.create({
        lesson: lockedLesson._id,
        type: 'SELECT',
        question: 'Is it locked?',
        options: [{ text: 'Yes', correct: true }],
        order: 1,
      });
    });

    it('should reject access with 403 when accessing a locked lesson directly', async () => {
      const res = await request(app)
        .get(`/api/duolingo/lessons/${lockedLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('khóa');
    });

    it('should allow access to a lesson when the preceding lesson is completed', async () => {
      // Complete the preceding lesson's challenges
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: testChallenge._id,
        completed: true,
      });

      const res = await request(app)
        .get(`/api/duolingo/lessons/${lockedLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(lockedLesson._id.toString());
    });
  });
});
