const express = require('express');
const router = express.Router();

const { getProfile, getAdminProfile, updateProfile, deleteAccount } = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { updateProfileSchema } = require('./user.validation');

// All user routes require authentication
router.use(authenticate);

// GET /api/users/me
router.get('/me', getProfile);

// GET /api/users/profile (alias for user-facing profile)
router.get('/profile', getProfile);

// GET /api/users/admin/profile (admin only)
router.get('/admin/profile', authorize('admin'), getAdminProfile);

// PUT /api/users/me
router.put('/me', validate(updateProfileSchema), updateProfile);

// DELETE /api/users/me
router.delete('/me', deleteAccount);

module.exports = router;
