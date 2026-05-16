/**
 * Folder API Integration Tests
 * Tests: Create, Read, Update, Delete, Add/Remove Sets
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
const Folder = require('../src/models/folder.model');
const FlashcardSet = require('../src/models/flashcardSet.model');
const folderRoutes = require('../src/modules/folders/folder.routes');

describe('Folder API', () => {
  let app;
  let authToken;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/folders', folderRoutes);
    
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
  // POST /api/folders (Create)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/folders', () => {
    it('should create a new folder', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My Vocabulary' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('My Vocabulary');
    });

    it('should save folder in database', async () => {
      await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder' });

      const folder = await Folder.findOne({ name: 'Test Folder' });
      expect(folder).toBeTruthy();
      expect(folder.user.toString()).toBe(testUser._id.toString());
    });

    it('should create folder with parent', async () => {
      const parent = await Folder.create({
        name: 'Parent',
        user: testUser._id,
      });

      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Child', parentId: parent._id });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/folders')
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/folders (Get All)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/folders', () => {
    beforeEach(async () => {
      await Folder.create([
        { name: 'Folder 1', user: testUser._id },
        { name: 'Folder 2', user: testUser._id },
      ]);
    });

    it('should return only user\'s folders', async () => {
      const res = await request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should return folders with sets populated', async () => {
      const folder = await Folder.create({
        name: 'With Sets',
        user: testUser._id,
        sets: [],
      });

      const res = await request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find(f => f.name === 'With Sets');
      expect(found).toBeTruthy();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/folders');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/folders/:id (Update)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/folders/:id', () => {
    let testFolder;

    beforeEach(async () => {
      testFolder = await Folder.create({
        name: 'Original Name',
        user: testUser._id,
      });
    });

    it('should update folder name', async () => {
      const res = await request(app)
        .put(`/api/folders/${testFolder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent folder', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/folders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return 404 for other user\'s folder', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: await bcrypt.hash('TestPass123!', 10),
        isVerified: true,
      });

      const otherFolder = await Folder.create({
        name: 'Other',
        user: otherUser._id,
      });

      const res = await request(app)
        .put(`/api/folders/${otherFolder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/folders/:id (Delete)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/folders/:id', () => {
    let testFolder;

    beforeEach(async () => {
      testFolder = await Folder.create({
        name: 'To Delete',
        user: testUser._id,
      });
    });

    it('should delete folder successfully', async () => {
      const res = await request(app)
        .delete(`/api/folders/${testFolder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const deleted = await Folder.findById(testFolder._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent folder', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/folders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/folders/:id/sets (Add Set to Folder)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/folders/:id/sets', () => {
    let testFolder;
    let testSet;

    beforeEach(async () => {
      testFolder = await Folder.create({
        name: 'Test Folder',
        user: testUser._id,
        sets: [],
      });

      testSet = await FlashcardSet.create({
        title: 'Test Set',
        user: testUser._id,
      });
    });

    it('should add set to folder', async () => {
      const res = await request(app)
        .post(`/api/folders/${testFolder._id}/sets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.sets).toContain(testSet._id.toString());
    });

    it('should return 404 for non-existent folder', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/folders/${fakeId}/sets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: testSet._id.toString() });

      expect(res.status).toBe(404);
    });

    it('should return 400 for missing setId', async () => {
      const res = await request(app)
        .post(`/api/folders/${testFolder._id}/sets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/folders/:id/sets/:setId (Remove Set from Folder)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/folders/:id/sets/:setId', () => {
    let testFolder;
    let testSet;

    beforeEach(async () => {
      testSet = await FlashcardSet.create({
        title: 'Test Set',
        user: testUser._id,
      });

      testFolder = await Folder.create({
        name: 'Test Folder',
        user: testUser._id,
        sets: [testSet._id],
      });
    });

    it('should remove set from folder', async () => {
      const res = await request(app)
        .delete(`/api/folders/${testFolder._id}/sets/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const updated = await Folder.findById(testFolder._id);
      expect(updated.sets.map(s => s.toString())).not.toContain(testSet._id.toString());
    });

    it('should return 404 for non-existent folder', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/folders/${fakeId}/sets/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
