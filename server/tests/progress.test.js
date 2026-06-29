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
const CardProgress = require('../src/models/cardProgress.model');
const progressRoutes = require('../src/modules/progress/progress.routes');

describe('Progress API', () => {
  let app;
  let authToken;
  let testUser;
  let testSet;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/progress', progressRoutes);

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
      email: 'progress@example.com',
      username: 'progressuser',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
    });

    testSet = await FlashcardSet.create({
      title: 'Progress Set',
      user: testUser._id,
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString(), role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SM-2 due cards consistency', () => {
    it('should not count stale CardProgress rows as due cards on the dashboard', async () => {
      const dueDate = new Date(Date.now() - 60 * 60 * 1000);
      const validCard = await Flashcard.create({
        set: testSet._id,
        front: 'Hello',
        back: 'Xin chao',
      });

      await CardProgress.create([
        {
          user: testUser._id,
          card: validCard._id,
          status: 'LEARNING',
          nextReview: dueDate,
        },
        {
          user: testUser._id,
          card: new mongoose.Types.ObjectId(),
          status: 'LEARNING',
          nextReview: dueDate,
        },
      ]);

      const statsRes = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.dueToday).toBe(1);
      expect(statsRes.body.data.learningCards).toBe(1);

      const dueCardsRes = await request(app)
        .get('/api/progress/due-cards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(dueCardsRes.status).toBe(200);
      expect(dueCardsRes.body.data).toHaveLength(1);
      expect(dueCardsRes.body.data[0]._id).toBe(validCard._id.toString());
    });

    it('should show zero due cards when only orphaned progress records are due', async () => {
      await CardProgress.create({
        user: testUser._id,
        card: new mongoose.Types.ObjectId(),
        status: 'REVIEW',
        nextReview: new Date(Date.now() - 60 * 60 * 1000),
      });

      const statsRes = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.dueToday).toBe(0);

      const dueCardsRes = await request(app)
        .get('/api/progress/due-cards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(dueCardsRes.status).toBe(200);
      expect(dueCardsRes.body.data).toEqual([]);
    });
  });
});
