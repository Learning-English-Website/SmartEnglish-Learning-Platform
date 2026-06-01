/**
 * Quest API Integration Tests
 * Tests: Get Daily Quests, Update Progress, Claim Reward, Stats
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
const DailyQuest = require('../src/models/dailyQuest.model');
const questRoutes = require('../src/modules/quest/quest.routes');

describe('Quest API', () => {
  let app;
  let authToken;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/quests', questRoutes);

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
      email: 'questuser@example.com',
      username: 'questuser',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
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
  // GET /api/quests/daily
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/quests/daily', () => {
    it('should return daily quests for user', async () => {
      const res = await request(app)
        .get('/api/quests/daily')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/quests/daily');
      expect(res.status).toBe(401);
    });

    it('should auto-create quests if none exist for today', async () => {
      const res = await request(app)
        .get('/api/quests/daily')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify quests were created in DB
      const dbQuests = await DailyQuest.find({ user: testUser._id });
      expect(dbQuests.length).toBeGreaterThan(0);
    });

    it('should return existing quests if they already exist for today', async () => {
      // Pre-create an XP quest with a specific targetValue
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await DailyQuest.create({
        user: testUser._id,
        day: today,
        type: 'xp',
        targetValue: 999,
        xpReward: 99,
        progress: 0,
        isCompleted: false,
        rewardClaimed: false,
      });

      const res = await request(app)
        .get('/api/quests/daily')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Should return the manually created quest with custom values
      const xpQuest = res.body.data.find(q => q.type === 'xp' && q.targetValue === 999);
      expect(xpQuest).toBeDefined();
      expect(xpQuest.xpReward).toBe(99);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/quests/stats
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/quests/stats', () => {
    it('should return quest statistics', async () => {
      const res = await request(app)
        .get('/api/quests/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalQuests');
      expect(res.body.data).toHaveProperty('completed');
      expect(res.body.data).toHaveProperty('claimed');
      expect(res.body.data).toHaveProperty('progressPercent');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/quests/stats');
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/quests/:id/claim
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/quests/:id/claim', () => {
    let quest;

    beforeEach(async () => {
      // Create a completed quest for each claim test
      quest = await DailyQuest.create({
        user: testUser._id,
        day: new Date(),
        type: 'xp',
        targetValue: 100,
        xpReward: 15,
        progress: 100,
        isCompleted: true,
        completedAt: new Date(),
        rewardClaimed: false,
      });
    });

    it('should claim a completed quest reward', async () => {
      const res = await request(app)
        .post(`/api/quests/${quest._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('xpAwarded', 15);
      expect(res.body.data).toHaveProperty('newTotalXP');
      expect(res.body.data).toHaveProperty('newLevel');
    });

    it('should return 400 when quest not completed', async () => {
      const incomplete = await DailyQuest.create({
        user: testUser._id,
        day: new Date(),
        type: 'lessons',
        targetValue: 1,
        xpReward: 20,
        progress: 0,
        isCompleted: false,
        rewardClaimed: false,
      });

      const res = await request(app)
        .post(`/api/quests/${incomplete._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 400 when reward already claimed', async () => {
      quest.rewardClaimed = true;
      quest.claimedAt = new Date();
      await quest.save();

      const res = await request(app)
        .post(`/api/quests/${quest._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('should prevent double-claim (atomic)', async () => {
      // Claim first time
      const first = await request(app)
        .post(`/api/quests/${quest._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(first.status).toBe(200);

      // Claim second time — should fail
      const second = await request(app)
        .post(`/api/quests/${quest._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(second.status).toBe(400);
    });

    it('should return 404 for quest belonging to another user', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const otherQuest = await DailyQuest.create({
        user: otherUser._id,
        day: new Date(),
        type: 'xp',
        targetValue: 100,
        xpReward: 15,
        progress: 100,
        isCompleted: true,
        rewardClaimed: false,
      });

      // Atomic update finds nothing (userId mismatch) → returns 404
      const res = await request(app)
        .post(`/api/quests/${otherQuest._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
