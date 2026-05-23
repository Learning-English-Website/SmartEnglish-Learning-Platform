const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../../config/upload.config');
const { asyncHandler } = require('../../shared/utils/asyncHandler');

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

/**
 * Upload a single image
 * POST /api/media/upload
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided',
    });
  }

  // Return relative path — client constructs the full URL via VITE_API_URL
  const imageUrl = `/uploads/images/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    url: imageUrl,
    filename: req.file.filename,
    size: req.file.size,
  });
});

/**
 * Delete an image
 * DELETE /api/media/delete
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({
      success: false,
      message: 'Filename is required',
    });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }

  fs.unlinkSync(filePath);

  res.json({
    success: true,
    message: 'Image deleted successfully',
  });
});

module.exports = {
  uploadImage,
  deleteImage,
};
