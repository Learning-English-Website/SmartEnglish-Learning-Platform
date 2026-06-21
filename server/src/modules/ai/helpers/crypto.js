const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

/**
 * Derived 32-byte key from the environment secret using SHA-256.
 * This guarantees a consistent 32-byte key size for AES-256.
 */
const getEncryptionKey = () => {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('AI_KEY_ENCRYPTION_SECRET is not configured in environment variables.');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a plain text string using aes-256-gcm.
 * Returns IV, Auth Tag, and Ciphertext joined by colons.
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Formatted encrypted string (iv:tag:ciphertext)
 */
exports.encrypt = (text) => {
  const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag(); // Retrieve AEAD tag

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts a ciphertext string using aes-256-gcm.
 * Gracefully handles parsing, format, and decryption errors by returning null.
 * @param {string} encryptedText - Encrypted string (iv:tag:ciphertext)
 * @returns {string|null} - Decrypted plain text, or null if decryption fails
 */
exports.decrypt = (encryptedText) => {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') return null;

    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedHex, 'hex');
    
    // GCM IV must be 12 bytes, Tag must be 16 bytes
    if (iv.length !== 12 || tag.length !== 16) return null;

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedTextBuffer, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Graceful error logging if needed in development, return null to avoid crashing 500
    return null;
  }
};
