const mongoose = require('mongoose');
const Bookmark = require('../../models/bookmark.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const { AppError } = require('../../shared/errors/AppError');

const validateSetId = (setId) => {
  if (!mongoose.Types.ObjectId.isValid(setId)) {
    throw new AppError('Invalid flashcard set id', 400);
  }
};

const getAccessibleSet = async (userId, setId) => {
  validateSetId(setId);

  const flashcardSet = await FlashcardSet.findById(setId);
  if (!flashcardSet) {
    throw new AppError('Flashcard set not found', 404);
  }

  const isOwner = flashcardSet.user.toString() === userId.toString();
  if (!flashcardSet.isPublic && !isOwner) {
    throw new AppError('Access denied', 403);
  }

  return flashcardSet;
};

/**
 * Add a bookmark for a flashcard set
 */
const addBookmark = async (userId, setId) => {
  await getAccessibleSet(userId, setId);

  const bookmark = await Bookmark.findOneAndUpdate(
    { user: userId, set: setId },
    { $setOnInsert: { user: userId, set: setId } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  return bookmark;
};

/**
 * Remove a bookmark
 */
const removeBookmark = async (userId, setId) => {
  validateSetId(setId);

  const bookmark = await Bookmark.findOneAndDelete({ user: userId, set: setId });
  if (!bookmark) {
    throw new AppError('Bookmark not found', 404);
  }

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
      populate: [
        { path: 'user', select: 'username avatar' },
        { path: 'tags', select: 'name color' },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  // Filter out deleted sets and sets the user can no longer access.
  const validBookmarks = bookmarks.filter((bookmark) => {
    if (!bookmark.set) return false;
    const setUserId = bookmark.set.user?._id || bookmark.set.user;
    return bookmark.set.isPublic || setUserId?.toString() === userId.toString();
  });

  return validBookmarks;
};

/**
 * Check if a set is bookmarked by user
 */
const isBookmarked = async (userId, setId) => {
  validateSetId(setId);
  const bookmark = await Bookmark.findOne({ user: userId, set: setId });
  return !!bookmark;
};

module.exports = {
  addBookmark,
  removeBookmark,
  getUserBookmarks,
  isBookmarked,
};
