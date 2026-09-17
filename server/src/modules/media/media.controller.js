const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../../config/upload.config');
const cloudinaryConfig = require('../../config/cloudinary.config');
const { asyncHandler } = require('../../shared/utils/asyncHandler');

const getBaseServerUrl = (req) => {
  if (process.env.SERVER_URL) return process.env.SERVER_URL.replace(/\/+$/, '');
  if (process.env.API_URL) return process.env.API_URL.replace(/\/+$/, '');
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
  return `${protocol}://${host}`;
};

/**
 * Upload a single image
 * POST /api/media/upload
 * Field name: 'image'
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided',
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hasCloudinary = cloudinaryConfig.isCloudinaryConfigured();

  // Rule 1: In production, Cloudinary is the ONLY upload provider.
  if (isProduction) {
    if (!hasCloudinary) {
      return res.status(500).json({
        success: false,
        message: 'Production cloud storage is not configured. Upload unavailable.',
      });
    }

    try {
      const result = await cloudinaryConfig.uploadToCloudinary(req.file.buffer);
      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully to cloud',
        url: result.url,
        filename: result.publicId,
        size: result.size,
        provider: 'cloudinary',
      });
    } catch (cloudErr) {
      console.error('[MediaController] Cloudinary upload failed in production:', cloudErr);
      return res.status(502).json({
        success: false,
        message: 'Cloud storage upload failed. Please try again.',
        error: cloudErr.message || 'Upload failed',
      });
    }
  }

  // Rule 2: In development/test, if Cloudinary credentials are configured, upload to Cloudinary
  if (hasCloudinary) {
    try {
      const result = await cloudinaryConfig.uploadToCloudinary(req.file.buffer);
      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully to cloud',
        url: result.url,
        filename: result.publicId,
        size: result.size,
        provider: 'cloudinary',
      });
    } catch (cloudErr) {
      console.error('[MediaController] Configured Cloudinary upload failed:', cloudErr);
      // Fail-closed: Must NOT fall back to local disk after configured Cloudinary attempt fails
      return res.status(502).json({
        success: false,
        message: 'Cloud storage upload failed. Please try again.',
        error: cloudErr.message || 'Upload failed',
      });
    }
  }

  // Rule 3: Local disk fallback is allowed ONLY in development/test when Cloudinary is NOT configured.
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(req.file.originalname || '.jpg').toLowerCase();
  const filename = `${uniqueSuffix}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.promises.writeFile(filePath, req.file.buffer);

  const serverBase = getBaseServerUrl(req);
  const imageUrl = `${serverBase}/uploads/images/${filename}`;

  return res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    url: imageUrl,
    filename,
    size: req.file.size,
    provider: 'local',
  });
});

/**
 * Delete an image
 * DELETE /api/media/delete
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { filename, provider } = req.body;

  if (!filename) {
    return res.status(400).json({
      success: false,
      message: 'Filename is required',
    });
  }

  // Determine target provider deterministically
  const isCloudinaryTarget =
    provider === 'cloudinary' ||
    (provider !== 'local' && (filename.startsWith('memoris/') || (!filename.includes('.') && !filename.includes('/') && !filename.includes('\\'))));

  if (isCloudinaryTarget) {
    if (cloudinaryConfig.isCloudinaryConfigured()) {
      try {
        await cloudinaryConfig.deleteFromCloudinary(filename);
        return res.json({
          success: true,
          message: 'Image deleted from cloud successfully',
        });
      } catch (err) {
        console.error('[MediaController] Cloudinary delete failed:', err);
        return res.status(502).json({
          success: false,
          message: 'Failed to delete image from cloud storage',
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        message: 'Cloud storage is not configured to delete this asset',
      });
    }
  }

  // Local fallback deletion (safe against path traversal)
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }

  return res.json({
    success: true,
    message: 'Image deleted successfully',
  });
});

module.exports = {
  uploadImage,
  deleteImage,
};
