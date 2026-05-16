/**
 * FlashcardSet API Integration Tests
 * Tests: Create, Read, Update, Delete sets
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
const setRoutes = require('../src/modules/flashcard-sets/flashcardSet.routes');

describe('FlashcardSet API', () => {
  let app;
  let authToken;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/flashcard-sets', setRoutes);
    
    // Add error handler for debugging
    app.use((err, req, res, next) => {
      console.error('FlashcardSet Error:', err.message);
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
  // POST /api/flashcard-sets (Create)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/flashcard-sets', () => {
    const validSet = {
      title: 'English Vocabulary',
      description: 'Basic English words',
      language: 'English',
      isPublic: false,
      tags: [],
    };

    it('should create a new flashcard set', async () => {
      const res = await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSet);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(validSet.title);
      expect(res.body.data.user).toBe(testUser._id.toString());
    });

    it('should save set in database', async () => {
      await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSet);

      const set = await FlashcardSet.findOne({ title: validSet.title });
      expect(set).toBeTruthy();
      expect(set.user.toString()).toBe(testUser._id.toString());
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/flashcard-sets')
        .send(validSet);

      expect(res.status).toBe(401);
    });

    it('should allow creating set with tags', async () => {
      const setWithTags = { ...validSet, tags: ['test'] };
      
      const res = await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(setWithTags);

      expect(res.status).toBe(201);
      expect(res.body.data.tags).toBeDefined();
    });

    it('should default isPublic to false', async () => {
      const res = await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSet);

      expect(res.body.data.isPublic).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/flashcard-sets/my (Get My Sets)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/flashcard-sets/my', () => {
    beforeEach(async () => {
      await FlashcardSet.create([
        { title: 'Set 1', user: testUser._id },
        { title: 'Set 2', user: testUser._id },
        { title: 'Set 3', user: testUser._id },
      ]);
    });

    it('should return only user\'s sets', async () => {
      const res = await request(app)
        .get('/api/flashcard-sets/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      res.body.data.forEach(set => {
        expect(set.user._id || set.user).toBe(testUser._id.toString());
      });
    });

    it('should return empty array if no sets', async () => {
      await FlashcardSet.deleteMany({});

      const res = await request(app)
        .get('/api/flashcard-sets/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/flashcard-sets/my');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/flashcard-sets/public (Get Public Sets)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/flashcard-sets/public', () => {
    beforeEach(async () => {
      await FlashcardSet.create([
        { title: 'Public Set 1', user: testUser._id, isPublic: true },
        { title: 'Public Set 2', user: testUser._id, isPublic: true },
        { title: 'Private Set', user: testUser._id, isPublic: false },
      ]);
    });

    it('should return only public sets', async () => {
      const res = await request(app)
        .get('/api/flashcard-sets/public')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      res.body.data.forEach(set => {
        expect(set.isPublic).toBe(true);
      });
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/api/flashcard-sets/public?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should support search parameter', async () => {
      const res = await request(app)
        .get('/api/flashcard-sets/public?search=Public')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/flashcard-sets/:id (Get Set by ID)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/flashcard-sets/:id', () => {
    let testSet;

    beforeEach(async () => {
      testSet = await FlashcardSet.create({
        title: 'My Private Set',
        user: testUser._id,
        isPublic: false,
      });
    });

    it('should return set for owner', async () => {
      const res = await request(app)
        .get(`/api/flashcard-sets/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe(testSet.title);
    });

    it('should return 404 for non-existent set', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/flashcard-sets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/flashcard-sets/:id (Update Set)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/flashcard-sets/:id', () => {
    let testSet;

    beforeEach(async () => {
      testSet = await FlashcardSet.create({
        title: 'Original Title',
        user: testUser._id,
      });
    });

    it('should update set title', async () => {
      const res = await request(app)
        .put(`/api/flashcard-sets/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should update isPublic status', async () => {
      const res = await request(app)
        .put(`/api/flashcard-sets/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isPublic).toBe(true);
    });

    it('should return 403 for non-owner update attempt', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const otherToken = jwt.sign(
        { sub: otherUser._id.toString(), role: 'student' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .put(`/api/flashcard-sets/${testSet._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/flashcard-sets/:id (Delete Set)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/flashcard-sets/:id', () => {
    let testSet;

    beforeEach(async () => {
      testSet = await FlashcardSet.create({
        title: 'Set to Delete',
        user: testUser._id,
      });
    });

    it('should delete set successfully', async () => {
      const res = await request(app)
        .delete(`/api/flashcard-sets/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await FlashcardSet.findById(testSet._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent set', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/flashcard-sets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-owner delete attempt', async () => {
      const otherUser = await User.create({
        email: 'other2@example.com',
        username: 'other2user',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const otherToken = jwt.sign(
        { sub: otherUser._id.toString(), role: 'student' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .delete(`/api/flashcard-sets/${testSet._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
