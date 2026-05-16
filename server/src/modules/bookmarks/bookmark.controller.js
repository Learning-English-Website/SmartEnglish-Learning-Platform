const { ApiResponse } = require('../../shared/utils/apiResponse');
const bookmarkService = require('./bookmark.service');

/**
 * POST /api/bookmarks - Add bookmark
 */
const addBookmark = async (req, res) => {
  const { setId } = req.body;
  if (!setId) {
    throw new (require('../../shared/errors/AppError'))('setId is required', 400);
  }
  const bookmark = await bookmarkService.addBookmark(req.user._id, setId);
  res.status(201).json(ApiResponse.success(bookmark, 'Bookmark added'));
};

/**
 * DELETE /api/bookmarks/:setId - Remove bookmark
 */
const removeBookmark = async (req, res) => {
  await bookmarkService.removeBookmark(req.user._id, req.params.setId);
  res.json(ApiResponse.success(null, 'Bookmark removed'));
};

/**
 * GET /api/bookmarks - Get all user bookmarks
 */
const getUserBookmarks = async (req, res) => {
  const bookmarks = await bookmarkService.getUserBookmarks(req.user._id);
  res.json(ApiResponse.success(bookmarks, 'Bookmarks fetched'));
};

module.exports = {
  addBookmark,
  removeBookmark,
  getUserBookmarks,
};
