const Share = require('../../models/share.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const { AppError } = require('../../shared/errors/AppError');

/**
 * Create a share link for a flashcard set
 */
const createShare = async (userId, setId) => {
  // Verify set exists and belongs to user
  const flashcardSet = await FlashcardSet.findById(setId);
  if (!flashcardSet) {
    throw new AppError('Flashcard set not found', 404);
  }
  if (flashcardSet.user.toString() !== userId.toString()) {
    throw new AppError('Access denied. You can only share your own sets.', 403);
  }

  // Check if already shared
  let share = await Share.findOne({ set: setId, user: userId, isActive: true });
  if (share) {
    return share;
  }

  // Create new share
  share = await Share.create({
    set: setId,
    user: userId,
  });

  return share;
};

/**
 * Get shared set by share code (public access)
 */
const getByShareCode = async (shareCode) => {
  const share = await Share.findOne({ shareCode, isActive: true })
    .populate('user', 'username avatar')
    .populate({
      path: 'set',
      populate: { path: 'user', select: 'username avatar' }
    });

  if (!share) {
    throw new AppError('Share link not found or inactive', 404);
  }

  // Increment view count
  share.viewCount += 1;
  await share.save();

  return share;
};

/**
 * Get all shares created by user
 */
const getUserShares = async (userId) => {
  const shares = await Share.find({ user: userId })
    .populate('set', 'title description cardCount language')
    .sort({ createdAt: -1 });

  return shares;
};

/**
 * Deactivate a share link
 */
const deactivateShare = async (userId, shareId) => {
  const share = await Share.findOne({ _id: shareId, user: userId });
  if (!share) {
    throw new AppError('Share not found', 404);
  }

  share.isActive = false;
  await share.save();

  return share;
};

module.exports = {
  createShare,
  getByShareCode,
  getUserShares,
  deactivateShare,
};
