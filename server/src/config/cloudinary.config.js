const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

/**
 * Validates that all three Cloudinary credentials exist and are non-empty.
 * All three must be treated as one single configuration unit.
 */
const isCloudinaryConfigured = () => {
  return Boolean(
    typeof process.env.CLOUDINARY_CLOUD_NAME === 'string' &&
    process.env.CLOUDINARY_CLOUD_NAME.trim() &&
    typeof process.env.CLOUDINARY_API_KEY === 'string' &&
    process.env.CLOUDINARY_API_KEY.trim() &&
    typeof process.env.CLOUDINARY_API_SECRET === 'string' &&
    process.env.CLOUDINARY_API_SECRET.trim()
  );
};

const applyCloudinaryConfig = () => {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true,
    });
    return true;
  }
  return false;
};

// Initial configuration check
applyCloudinaryConfig();

/**
 * Upload an image buffer directly to Cloudinary via stream.
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {Object} [customOptions] - Optional Cloudinary upload options
 * @returns {Promise<{url: string, publicId: string, size: number, format: string}>}
 */
const uploadToCloudinary = (buffer, customOptions = {}) => {
  return new Promise((resolve, reject) => {
    applyCloudinaryConfig();

    const options = {
      folder: 'memoris/images',
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      ...customOptions,
    };

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
      });
    });

    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Delete an image from Cloudinary by public ID.
 * @param {string} publicId
 * @returns {Promise<any>}
 */
const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured() || !publicId) return null;
  applyCloudinaryConfig();
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  applyCloudinaryConfig,
  uploadToCloudinary,
  deleteFromCloudinary,
};
