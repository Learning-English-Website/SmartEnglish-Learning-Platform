const Bookmark = require('../../models/bookmark.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const { AppError } = require('../../shared/errors/AppError');

/**
 * Add a bookmark for a flashcard set
 */
const addBookmark = async (userId, setId) => {
  // Verify set exists
  const flashcardSet = await FlashcardSet.findById(setId);
  if (!flashcardSet) {
    throw new AppError('Flashcard set not found', 404);
  }

  // Check if already bookmarked
  const existing = await Bookmark.findOne({ user: userId, set: setId });
  if (existing) {
    return existing;
  }

  // Create bookmark
  const bookmark = await Bookmark.create({
    user: userId,
    set: setId,
  });

  return bookmark;
};

/**
 * Remove a bookmark
 */
const removeBookmark = async (userId, setId) => {
  const bookmark = await Bookmark.findOne({ user: userId, set: setId });
  if (!bookmark) {
    throw new AppError('Bookmark not found', 404);
  }

  await bookmark.deleteOne();
  return null;
};

/**
 * Get all bookmarks for a user
 */
const getUserBookmarks = async (userId) => {
  const bookmarks = await Bookmark.find({ user: userId })
    .populate({
      path: 'set',
      select: 'title description cardCount language user isPublic tags',
      populate: {
        path: 'user',
        select: 'username avatar',
      },
    })
    .sort({ createdAt: -1 });

  // Filter out bookmarks where set was deleted
  const validBookmarks = bookmarks.filter(b => b.set !== null);

  return validBookmarks;
};

/**
 * Check if a set is bookmarked by user
 */
const isBookmarked = async (userId, setId) => {
  const bookmark = await Bookmark.findOne({ user: userId, set: setId });
  return !!bookmark;
};

module.exports = {
  addBookmark,
  removeBookmark,
  getUserBookmarks,
  isBookmarked,
};
