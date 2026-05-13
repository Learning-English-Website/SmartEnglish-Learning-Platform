const express = require('express');
const router = express.Router();

const { getAll, search, create, update, remove, getPublicTags } = require('./tag.controller');
const { validate } = require('../../middleware/validation.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { createSchema, updateSchema } = require('./tag.validation');

// GET /api/tags/public - Public tags (no auth required)
router.get('/public', getPublicTags);

// All other routes require authentication
router.use(authenticate);

// GET /api/tags
router.get('/', getAll);

// GET /api/tags/search?q=
router.get('/search', search);

// POST /api/tags
router.post('/', validate(createSchema), create);

// PUT /api/tags/:id
router.put('/:id', validate(updateSchema), update);

// DELETE /api/tags/:id
router.delete('/:id', remove);

module.exports = router;
