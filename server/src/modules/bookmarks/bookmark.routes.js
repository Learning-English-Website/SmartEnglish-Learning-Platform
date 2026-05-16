const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { addBookmark, removeBookmark, getUserBookmarks } = require('./bookmark.controller');

// All routes require authentication
router.use(authenticate);

// POST /api/bookmarks - Add bookmark
router.post('/', addBookmark);

// GET /api/bookmarks - Get user bookmarks
router.get('/', getUserBookmarks);

// DELETE /api/bookmarks/:setId - Remove bookmark
router.delete('/:setId', removeBookmark);

module.exports = router;
