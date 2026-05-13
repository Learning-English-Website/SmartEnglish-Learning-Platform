const express = require('express');
const router = express.Router();

const { getAll, create, update, remove, addSet, removeSet } = require('./folder.controller');
const { validate } = require('../../middleware/validation.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { createSchema, updateSchema, addSetSchema } = require('./folder.validation');

// All routes require authentication
router.use(authenticate);

// GET /api/folders
router.get('/', getAll);

// POST /api/folders
router.post('/', validate(createSchema), create);

// PUT /api/folders/:id
router.put('/:id', validate(updateSchema), update);

// DELETE /api/folders/:id
router.delete('/:id', remove);

// POST /api/folders/:id/sets
router.post('/:id/sets', validate(addSetSchema), addSet);

// DELETE /api/folders/:id/sets/:setId
router.delete('/:id/sets/:setId', removeSet);

module.exports = router;
