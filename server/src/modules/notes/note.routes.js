const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getNotesByCardId,
  createNote,
  updateNote,
  deleteNote,
} = require('./note.controller');

// All routes require authentication
router.use(authenticate);

// GET /api/notes/card/:cardId - Get notes for a card
router.get('/card/:cardId', getNotesByCardId);

// POST /api/notes - Create a note
router.post('/', createNote);

// PUT /api/notes/:id - Update a note
router.put('/:id', updateNote);

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', deleteNote);

module.exports = router;
