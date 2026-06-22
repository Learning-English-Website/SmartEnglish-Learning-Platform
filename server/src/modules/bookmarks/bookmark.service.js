const Bookmark = require('../../models/bookmark.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const Folder = require('../../models/folder.model');
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

  // Ensure default "Yêu thích" folder exists and contains this set
  let favoriteFolder = await Folder.findOne({ user: userId, name: 'Yêu thích' });
  if (!favoriteFolder) {
    favoriteFolder = await Folder.create({
      user: userId,
      name: 'Yêu thích',
      parent: null,
      sets: [setId]
    });
  } else {
    if (!favoriteFolder.sets) favoriteFolder.sets = [];
    if (!favoriteFolder.sets.includes(setId)) {
      favoriteFolder.sets.push(setId);
      await favoriteFolder.save();
    }
  }

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

  // Remove the set from default "Yêu thích" folder if it exists
  const favoriteFolder = await Folder.findOne({ user: userId, name: 'Yêu thích' });
  if (favoriteFolder && favoriteFolder.sets) {
    favoriteFolder.sets = favoriteFolder.sets.filter(id => id.toString() !== setId.toString());
    await favoriteFolder.save();
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
