const express = require('express');
const router = express.Router();
const { uploadImage, deleteImage } = require('./media.controller');
const { upload } = require('../../config/upload.config');

const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload error',
      });
    }
    next();
  });
};

// POST /api/media/upload - Upload an image
router.post('/upload', handleUpload, uploadImage);

// DELETE /api/media/delete - Delete an image
router.delete('/delete', deleteImage);

module.exports = router;
