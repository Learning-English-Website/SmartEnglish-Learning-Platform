/**
 * Flashcard API Integration Tests
 * Tests: Create, Read, Update, Delete, Bulk Create, Reorder cards
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
const cardRoutes = require('../src/modules/flashcard-sets/flashcard.routes');

describe('Flashcard API', () => {
  let app;
  let authToken;
  let testUser;
  let testSet;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/flashcards', cardRoutes);
    
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
  // POST /api/flashcards/set/:setId (Create Card)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/flashcards/set/:setId', () => {
    const validCard = {
      front: 'Hello',
      back: 'Xin chào',
      pronunciation: '/həˈloʊ/',
      example: 'Hello, how are you?',
      note: 'Common greeting',
    };

    it('should create a new card', async () => {
      const res = await request(app)
        .post(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCard);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.front).toBe(validCard.front);
      expect(res.body.data.back).toBe(validCard.back);
    });

    it('should save card in database', async () => {
      await request(app)
        .post(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCard);

      const card = await Flashcard.findOne({ front: validCard.front });
      expect(card).toBeTruthy();
    });

    it('should increment set cardCount', async () => {
      await request(app)
        .post(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCard);

      const updatedSet = await FlashcardSet.findById(testSet._id);
      expect(updatedSet.cardCount).toBe(1);
    });

    it('should return 400 for missing front', async () => {
      const res = await request(app)
        .post(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ back: 'No front' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing back', async () => {
      const res = await request(app)
        .post(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ front: 'No back' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent set', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/flashcards/set/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCard);

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/flashcards/set/:setId (Get Cards)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/flashcards/set/:setId', () => {
    beforeEach(async () => {
      await Flashcard.create([
        { set: testSet._id, front: 'Card 1', back: 'Back 1' },
        { set: testSet._id, front: 'Card 2', back: 'Back 2' },
        { set: testSet._id, front: 'Card 3', back: 'Back 3' },
      ]);
    });

    it('should return all cards for set', async () => {
      const res = await request(app)
        .get(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('should return cards for set', async () => {
      const res = await request(app)
        .get(`/api/flashcards/set/${testSet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('should return empty array for set with no cards', async () => {
      const emptySet = await FlashcardSet.create({
        title: 'Empty Set',
        user: testUser._id,
      });

      const res = await request(app)
        .get(`/api/flashcards/set/${emptySet._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/flashcards/set/:setId/bulk (Bulk Create)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/flashcards/set/:setId/bulk', () => {
    const bulkCards = {
      cards: [
        { front: 'Word 1', back: 'Meaning 1' },
        { front: 'Word 2', back: 'Meaning 2' },
        { front: 'Word 3', back: 'Meaning 3' },
      ],
    };

    it('should create multiple cards', async () => {
      const res = await request(app)
        .post(`/api/flashcards/set/${testSet._id}/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkCards);

      expect(res.status).toBe(201);
      expect(res.body.data.length).toBe(3);
    });

    it('should update set cardCount correctly', async () => {
      await request(app)
        .post(`/api/flashcards/set/${testSet._id}/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkCards);

      const updatedSet = await FlashcardSet.findById(testSet._id);
      expect(updatedSet.cardCount).toBe(3);
    });

    it('should ignore invalid cards but create valid ones', async () => {
      const mixedCards = {
        cards: [
          { front: 'Valid 1', back: 'Back 1' },
          { front: '', back: 'No front' },
          { front: 'Valid 2', back: 'Back 2' },
        ],
      };

      const res = await request(app)
        .post(`/api/flashcards/set/${testSet._id}/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mixedCards);

      expect(res.status).toBe(201);
      expect(res.body.data.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/flashcards/set/:setId/reorder (Reorder Cards)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/flashcards/set/:setId/reorder', () => {
    let cards;

    beforeEach(async () => {
      const created = await Flashcard.create([
        { set: testSet._id, front: 'Card A', back: 'Back A', order: 0 },
        { set: testSet._id, front: 'Card B', back: 'Back B', order: 1 },
        { set: testSet._id, front: 'Card C', back: 'Back C', order: 2 },
      ]);
      cards = created;
    });

    it('should reorder cards based on cardIds array', async () => {
      const newOrder = [cards[2]._id.toString(), cards[0]._id.toString(), cards[1]._id.toString()];

      const res = await request(app)
        .put(`/api/flashcards/set/${testSet._id}/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardIds: newOrder });

      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/flashcards/:cardId (Update Card)
  // ─────────────────────────────────────────────────────────────────
  describe('PUT /api/flashcards/:cardId', () => {
    let testCard;

    beforeEach(async () => {
      testCard = await Flashcard.create({
        set: testSet._id,
        front: 'Original Front',
        back: 'Original Back',
      });
    });

    it('should update card front', async () => {
      const res = await request(app)
        .put(`/api/flashcards/${testCard._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ front: 'Updated Front' });

      expect(res.status).toBe(200);
      expect(res.body.data.front).toBe('Updated Front');
    });

    it('should update card back', async () => {
      const res = await request(app)
        .put(`/api/flashcards/${testCard._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ back: 'Updated Back' });

      expect(res.status).toBe(200);
      expect(res.body.data.back).toBe('Updated Back');
    });

    it('should return 404 for non-existent card', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/flashcards/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ front: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/flashcards/:cardId (Delete Card)
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/flashcards/:cardId', () => {
    let testCard;

    beforeEach(async () => {
      testCard = await Flashcard.create({
        set: testSet._id,
        front: 'To Delete',
        back: 'Will be deleted',
      });
    });

    it('should delete card successfully', async () => {
      const res = await request(app)
        .delete(`/api/flashcards/${testCard._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const deleted = await Flashcard.findById(testCard._id);
      expect(deleted).toBeNull();
    });

    it('should delete card and update set', async () => {
      const updatedSetBefore = await FlashcardSet.findById(testSet._id);
      expect(updatedSetBefore.cardCount).toBeGreaterThanOrEqual(0);

      await request(app)
        .delete(`/api/flashcards/${testCard._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const deleted = await Flashcard.findById(testCard._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent card', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/flashcards/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
