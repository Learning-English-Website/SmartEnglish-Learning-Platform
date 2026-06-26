/**
 * FlashcardSet API Integration Tests (UC08 - UC10)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Mock event bus
jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const FlashcardSet = require('../src/models/flashcardSet.model');
const Folder = require('../src/models/folder.model');
const Tag = require('../src/models/tag.model');
const setRoutes = require('../src/modules/flashcard-sets/flashcardSet.routes');
const folderRoutes = require('../src/modules/folders/folder.routes');
const { errorHandler } = require('../src/middleware/error.middleware');

describe('FlashcardSet API Integration Tests (UC08 - UC10)', () => {
  let app;
  let testUser;
  let authToken;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/flashcard-sets', setRoutes);
    app.use('/api/folders', folderRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Clean database before each run
    await User.deleteMany({});
    await FlashcardSet.deleteMany({});
    await Folder.deleteMany({});
    await Tag.deleteMany({});

    testUser = await User.create({
      email: 'student@example.com',
      username: 'studentuser',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString(), role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // UC08 - Tạo bộ thẻ học mới
  // ─────────────────────────────────────────────────────────────────
  describe('UC08 - Tạo bộ thẻ học mới', () => {
    it('TC-UC08-01: should create a new flashcard set with valid data and add it to folder', async () => {
      // 1. Seed folder and tag
      const folder = await Folder.create({
        user: testUser._id,
        name: 'Từ vựng cơ bản',
      });

      const tag = await Tag.create({
        user: testUser._id,
        name: 'English',
        color: '#6366f1',
      });

      // 2. Create Flashcard Set
      const payload = {
        title: 'English Vocabulary for Beginners',
        description: 'Các từ vựng cơ bản thông dụng',
        isPublic: true,
        tags: [tag._id.toString()],
      };

      const setRes = await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(setRes.status).toBe(201);
      expect(setRes.body.success).toBe(true);
      expect(setRes.body.data.title).toBe(payload.title);
      expect(setRes.body.data.isPublic).toBe(true);

      const setId = setRes.body.data._id;
      expect(setId).toBeTruthy();

      // 3. Link Set to Folder
      const folderRes = await request(app)
        .post(`/api/folders/${folder._id}/sets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: setId });

      expect(folderRes.status).toBe(200);
      expect(folderRes.body.success).toBe(true);

      // Verify in DB
      const updatedFolder = await Folder.findById(folder._id);
      expect(updatedFolder.sets.map(s => s.toString())).toContain(setId);
    });

    it('TC-UC08-02: should reject set creation if title is empty or missing', async () => {
      const res = await request(app)
        .post('/api/flashcard-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Từ vựng ôn thi',
          isPublic: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Title must be at least 3 characters');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UC09 - Chỉnh sửa thông tin bộ thẻ học
  // ─────────────────────────────────────────────────────────────────
  describe('UC09 - Chỉnh sửa thông tin bộ thẻ học', () => {
    it('TC-UC09-01: should update flashcard set information successfully', async () => {
      // 1. Seed initial set
      const initialSet = await FlashcardSet.create({
        user: testUser._id,
        title: 'English Vocabulary for Beginners',
        description: 'Các từ vựng cơ bản',
        isPublic: true,
        cardCount: 0,
      });

      // Seed new tag and folder
      const tag = await Tag.create({
        user: testUser._id,
        name: 'Vocabulary',
        color: '#ff0000',
      });

      const folder = await Folder.create({
        user: testUser._id,
        name: 'English level 1',
      });

      // 2. Perform Update
      const updatePayload = {
        title: 'Vocabulary English - Level 1',
        description: 'Sách từ vựng tiếng Anh',
        isPublic: false,
        tags: [tag._id.toString()],
      };

      const updateRes = await request(app)
        .put(`/api/flashcard-sets/${initialSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload);

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.title).toBe(updatePayload.title);
      expect(updateRes.body.data.isPublic).toBe(false);

      // Link to new folder
      const folderRes = await request(app)
        .post(`/api/folders/${folder._id}/sets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ setId: initialSet._id.toString() });

      expect(folderRes.status).toBe(200);

      // Verify in DB
      const dbSet = await FlashcardSet.findById(initialSet._id);
      expect(dbSet.title).toBe(updatePayload.title);
      expect(dbSet.isPublic).toBe(false);
      expect(dbSet.tags.map(t => t.toString())).toContain(tag._id.toString());
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UC10 - Xóa bộ thẻ học
  // ─────────────────────────────────────────────────────────────────
  describe('UC10 - Xóa bộ thẻ học', () => {
    it('TC-UC10-01: should delete flashcard set successfully', async () => {
      // Seed a set to delete
      const set = await FlashcardSet.create({
        user: testUser._id,
        title: 'Vocabulary English - Level 1',
        description: 'ToDelete',
        isPublic: false,
      });

      const deleteRes = await request(app)
        .delete(`/api/flashcard-sets/${set._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify deleted from DB
      const dbSet = await FlashcardSet.findById(set._id);
      expect(dbSet).toBeNull();
    });
  });
});
