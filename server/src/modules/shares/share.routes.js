const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { createShare, getUserShares, deactivateShare, getByShareCode } = require('./share.controller');

// Public route - get shared set by code
router.get('/shared/:shareCode', getByShareCode);

// Protected routes
router.use(authenticate);

// POST /api/shares - Create share
router.post('/', createShare);

// GET /api/shares - Get user's shares
router.get('/', getUserShares);

// DELETE /api/shares/:id - Deactivate share
router.delete('/:id', deactivateShare);

module.exports = router;
