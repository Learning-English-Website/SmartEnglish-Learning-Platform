const Note = require('../../models/note.model');
const Flashcard = require('../../models/flashcard.model');
const { AppError } = require('../../shared/errors/AppError');

/**
 * Get notes for a specific card
 */
const getNotesByCardId = async (userId, cardId) => {
  // Verify card exists and belongs to user
  const card = await Flashcard.findById(cardId);
  if (!card) {
    throw new AppError('Flashcard not found', 404);
  }

  const notes = await Note.find({ user: userId, card: cardId })
    .sort({ createdAt: -1 });

  return notes;
};

/**
 * Create a new note for a card
 */
const createNote = async (userId, cardId, content, title = '') => {
  // Verify card exists
  const card = await Flashcard.findById(cardId);
  if (!card) {
    throw new AppError('Flashcard not found', 404);
  }

  if (!content || content.trim() === '') {
    throw new AppError('Note content is required', 400);
  }

  const note = await Note.create({
    user: userId,
    card: cardId,
    title: title.trim(),
    content: content.trim(),
    relatedSet: card.set,
  });

  return note;
};

/**
 * Update a note
 */
const updateNote = async (userId, noteId, content, title) => {
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) {
    throw new AppError('Note not found', 404);
  }

  if (content !== undefined) {
    if (!content.trim()) {
      throw new AppError('Note content cannot be empty', 400);
    }
    note.content = content.trim();
  }

  if (title !== undefined) {
    note.title = title.trim();
  }

  await note.save();
  return note;
};

/**
 * Delete a note
 */
const deleteNote = async (userId, noteId) => {
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) {
    throw new AppError('Note not found', 404);
  }

  await note.deleteOne();
  return null;
};

module.exports = {
  getNotesByCardId,
  createNote,
  updateNote,
  deleteNote,
};
