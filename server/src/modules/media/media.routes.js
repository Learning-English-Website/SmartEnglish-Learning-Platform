const express = require('express');
const router = express.Router();
const { uploadImage, deleteImage } = require('./media.controller');
const { upload } = require('../../config/upload.config');

// POST /api/media/upload - Upload an image
router.post('/upload', upload.single('image'), uploadImage);

// DELETE /api/media/delete - Delete an image
router.delete('/delete', deleteImage);

module.exports = router;
