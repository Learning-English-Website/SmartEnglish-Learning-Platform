/**
 * Note API Integration Tests
 * Tests: Get Notes, Create Note, Update Note, Delete Note
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
const noteRoutes = require('../src/modules/notes/note.routes');

describe('Note API', () => {
  let app;
  let authToken;
  let testUser;
  let testSet;
  let testCard;

    beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/notes', noteRoutes);
    
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

    testCard = await Flashcard.create({
      set: testSet._id,
      front: 'Hello',
      back: 'Xin chao',
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
  // GET /api/notes/card/:cardId (Get Notes)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/notes/card/:cardId', () => {
    it('should return notes for a card', async () => {
      const res = await request(app)
        .get(`/api/notes/card/${testCard._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 404 for non-existent card', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/notes/card/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get(`/api/notes/card/${testCard._id}`);

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/notes (Create Note)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/notes', () => {
    it('should create a note', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: testCard._id.toString(),
          content: 'This is a test note',
          title: 'Test Note',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('This is a test note');
    });

    it('should create a note without title', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: testCard._id.toString(),
          content: 'Note content only',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('');
    });

    it('should return 400 for missing cardId', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test note' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty content', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: testCard._id.toString(),
          content: '',
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent card', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: fakeId.toString(),
          content: 'Test note',
        });

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/notes')
        .send({
          cardId: testCard._id.toString(),
          content: 'Test note',
        });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/notes/:id (Update Note)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      // Create a note first
      const createRes = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: testCard._id.toString(),
          content: 'Original content',
          title: 'Original title',
        });
      noteId = createRes.body.data._id;
    });

    it('should update note content', async () => {
      const res = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Updated content');
    });

    it('should update note title', async () => {
      const res = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated title');
    });

    it('should return 400 for empty content', async () => {
      const res = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/notes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/notes/:id (Delete Note)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: testCard._id.toString(),
          content: 'Note to delete',
        });
      noteId = createRes.body.data._id;
    });

    it('should delete a note', async () => {
      const res = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/notes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
