/**
 * Tag API Integration Tests
 * Tests: Create, Read, Search, Update, Delete tags
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
const Tag = require('../src/models/tag.model');
const tagRoutes = require('../src/modules/tags/tag.routes');

describe('Tag API', () => {
  let app;
  let authToken;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tags', tagRoutes);
    
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
  // POST /api/tags (Create)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/tags', () => {
    it('should create a new tag', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'vocabulary' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('vocabulary');
    });

    it('should save tag in database', async () => {
      await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'grammar' });

      const tag = await Tag.findOne({ name: 'grammar' });
      expect(tag).toBeTruthy();
      expect(tag.user.toString()).toBe(testUser._id.toString());
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate tag name for same user', async () => {
      await Tag.create({ name: 'duplicate', user: testUser._id });

      const res = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'duplicate' });

      expect(res.status).toBe(409);
    });

    it('should allow same tag name for different users', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      await Tag.create({ name: 'shared', user: otherUser._id });

      const res = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'shared' });

      expect(res.status).toBe(201);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/tags')
        .send({ name: 'test' });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/tags (Get All Tags)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/tags', () => {
    beforeEach(async () => {
      await Tag.create([
        { name: 'tag1', user: testUser._id },
        { name: 'tag2', user: testUser._id },
      ]);
    });

    it('should return only user\'s tags', async () => {
      const res = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      res.body.data.forEach(tag => {
        expect(tag.user._id || tag.user).toBe(testUser._id.toString());
      });
    });

    it('should return empty array if no tags', async () => {
      await Tag.deleteMany({});

      const res = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/tags/public (Get Public Tags)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/tags/public', () => {
    beforeEach(async () => {
      const FlashcardSet = require('../src/models/flashcardSet.model');
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const publicSet = await FlashcardSet.create({
        title: 'Public Set',
        user: otherUser._id,
        isPublic: true,
      });

      await Tag.create([
        { name: 'fromPublicSet', user: otherUser._id, sets: [publicSet._id] },
        { name: 'privateTag', user: otherUser._id },
      ]);
    });

    it('should return tags from public sets', async () => {
      const res = await request(app)
        .get('/api/tags/public');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should not require authentication', async () => {
      const res = await request(app)
        .get('/api/tags/public');

      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/tags/search (Search Tags)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/tags/search', () => {
    beforeEach(async () => {
      await Tag.create([
        { name: 'english-vocabulary', user: testUser._id },
        { name: 'english-grammar', user: testUser._id },
        { name: 'math-formulas', user: testUser._id },
      ]);
    });

    it('should search tags by name', async () => {
      const res = await request(app)
        .get('/api/tags/search?q=english')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app)
        .get('/api/tags/search?q=nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/tags/search?q=test');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/tags/:id (Update Tag)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/tags/:id', () => {
    let testTag;

    beforeEach(async () => {
      testTag = await Tag.create({ name: 'oldname', user: testUser._id });
    });

    it('should update tag name', async () => {
      const res = await request(app)
        .put(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'newname' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('newname');
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/tags/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'newname' });

      expect(res.status).toBe(404);
    });

    it('should return 404 for other user\'s tag', async () => {
      const otherUser = await User.create({
        email: 'other3@example.com',
        username: 'other3user',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const otherTag = await Tag.create({ name: 'other', user: otherUser._id });

      const res = await request(app)
        .put(`/api/tags/${otherTag._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'hacked' });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/tags/:id (Delete Tag)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/tags/:id', () => {
    let testTag;

    beforeEach(async () => {
      testTag = await Tag.create({ name: 'todelete', user: testUser._id });
    });

    it('should delete tag successfully', async () => {
      const res = await request(app)
        .delete(`/api/tags/${testTag._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const deleted = await Tag.findById(testTag._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/tags/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
