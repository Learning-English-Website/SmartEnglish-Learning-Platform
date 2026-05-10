const jwt = require('jsonwebtoken');

/**
 * Generates a short-lived access token (default 15m).
 */
const generateAccessToken = (user) =>
  jwt.sign(
    { sub: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

/**
 * Generates a long-lived refresh token (default 7d).
 */
const generateRefreshToken = (user) =>
  jwt.sign(
    { sub: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

/**
 * Verifies an access token. Throws if invalid or expired.
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

/**
 * Verifies a refresh token. Throws if invalid or expired.
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
