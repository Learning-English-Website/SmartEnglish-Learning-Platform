const express = require('express');
const router = express.Router();

const { getProfile, updateProfile, deleteAccount } = require('./user.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { updateProfileSchema } = require('./user.validation');

// All user routes require authentication
router.use(authenticate);

// GET /api/users/me
router.get('/me', getProfile);

// PUT /api/users/me
router.put('/me', validate(updateProfileSchema), updateProfile);

// DELETE /api/users/me
router.delete('/me', deleteAccount);

module.exports = router;
