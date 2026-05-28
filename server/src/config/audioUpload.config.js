const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/audio');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Sanitize fieldname to prevent path traversal
const sanitizeFieldname = (fieldname) => {
  if (!fieldname) return 'audio';
  // Remove any path components and special characters
  return fieldname.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50) || 'audio';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    // Use sanitized fieldname to prevent path traversal
    const safeFieldname = sanitizeFieldname(req.body.fieldname);
    const filename = `${safeFieldname}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/x-m4a'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Audio file type not allowed: ${file.mimetype}. Supported: MP3, WAV, OGG, M4A`), false);
  }
};

const audioUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for audio files
  },
});

module.exports = { audioUpload, UPLOAD_DIR };
