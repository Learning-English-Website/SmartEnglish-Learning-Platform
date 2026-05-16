const { ApiResponse } = require('../../shared/utils/apiResponse');
const noteService = require('./note.service');
const { AppError } = require('../../shared/errors/AppError');

/**
 * GET /api/notes/card/:cardId - Get notes for a card
 */
const getNotesByCardId = async (req, res) => {
  const notes = await noteService.getNotesByCardId(req.user._id, req.params.cardId);
  res.json(ApiResponse.success(notes, 'Notes fetched'));
};

/**
 * POST /api/notes - Create a new note
 */
const createNote = async (req, res) => {
  const { cardId, content, title } = req.body;

  if (!cardId) {
    throw new AppError('cardId is required', 400);
  }

  if (!content || content.trim() === '') {
    throw new AppError('content is required', 400);
  }

  const note = await noteService.createNote(req.user._id, cardId, content, title);
  res.status(201).json(ApiResponse.success(note, 'Note created'));
};

/**
 * PUT /api/notes/:id - Update a note
 */
const updateNote = async (req, res) => {
  const { content, title } = req.body;
  const note = await noteService.updateNote(req.user._id, req.params.id, content, title);
  res.json(ApiResponse.success(note, 'Note updated'));
};

/**
 * DELETE /api/notes/:id - Delete a note
 */
const deleteNote = async (req, res) => {
  await noteService.deleteNote(req.user._id, req.params.id);
  res.json(ApiResponse.success(null, 'Note deleted'));
};

module.exports = {
  getNotesByCardId,
  createNote,
  updateNote,
  deleteNote,
};
