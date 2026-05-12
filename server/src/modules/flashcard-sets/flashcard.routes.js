const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getCardsBySet,
  createCard,
  bulkCreateCards,
  updateCard,
  deleteCard,
  reorderCards,
} = require('./flashcard.controller');

router.use(authenticate);

// GET  /api/flashcards/set/:setId          → Get all cards in a set
router.get('/set/:setId', getCardsBySet);

// POST /api/flashcards/set/:setId          → Create single card
router.post('/set/:setId', createCard);

// POST /api/flashcards/set/:setId/bulk     → Bulk create cards
router.post('/set/:setId/bulk', bulkCreateCards);

// PUT  /api/flashcards/set/:setId/reorder  → Reorder cards
router.put('/set/:setId/reorder', reorderCards);

// PUT  /api/flashcards/:cardId             → Update a card
router.put('/:cardId', updateCard);

// DELETE /api/flashcards/:cardId           → Delete a card
router.delete('/:cardId', deleteCard);

module.exports = router;
