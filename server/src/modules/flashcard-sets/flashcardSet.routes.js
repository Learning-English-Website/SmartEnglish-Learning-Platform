const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getMySets,
  getPublicSets,
  getSetById,
  createSet,
  updateSet,
  deleteSet,
} = require('./flashcardSet.controller');

// All routes require authentication
router.use(authenticate);

// GET  /api/flashcard-sets/my        → Lấy sets của user hiện tại
router.get('/my', getMySets);

// GET  /api/flashcard-sets/public    → Browse public sets
router.get('/public', getPublicSets);

// GET  /api/flashcard-sets/:id       → Get set by ID
router.get('/:id', getSetById);

// POST /api/flashcard-sets           → Tạo set mới
router.post('/', createSet);

// PUT  /api/flashcard-sets/:id       → Cập nhật set
router.put('/:id', updateSet);

// DELETE /api/flashcard-sets/:id     → Xóa set
router.delete('/:id', deleteSet);

module.exports = router;
