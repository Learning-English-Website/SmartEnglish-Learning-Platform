const crypto = require('crypto');
const User = require('../user/user.model');
const redis = require('../../config/redis');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../shared/utils/jwt');
const { AppError } = require('../../shared/errors/AppError');
const eventBus = require('../../shared/events/eventBus');

// Redis key helpers
const REFRESH_KEY = (userId) => `refresh:${userId}`;
const RESET_KEY = (token) => `reset:${token}`;

class AuthService {
  /**
   * Register a new user. Returns { user, accessToken, refreshToken }.
   */
  async register({ email, username, password }) {
    // Check duplicates
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username';
      throw new AppError(`${field} already in use`, 409);
    }

    const user = await User.create({ email, username, password });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in Redis (7 days TTL)
    await redis.set(REFRESH_KEY(user._id), refreshToken, 'EX', 7 * 24 * 60 * 60);

    // Emit event for side effects (welcome email, etc.)
    eventBus.emit('user:registered', { userId: user._id, email, username });

    return { user: user.toPublicProfile(), accessToken, refreshToken };
  }

  /**
   * Login with email + password. Returns { user, accessToken, refreshToken }.
   */
  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) throw new AppError('Invalid email or password', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Rotate refresh token in Redis
    await redis.set(REFRESH_KEY(user._id), refreshToken, 'EX', 7 * 24 * 60 * 60);

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    return { user: user.toPublicProfile(), accessToken, refreshToken };
  }

  /**
   * Rotate refresh token. Returns new { accessToken, refreshToken }.
   */
  async refreshToken(token) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const userId = decoded.sub;
    const stored = await redis.get(REFRESH_KEY(userId));
    if (!stored || stored !== token) {
      throw new AppError('Refresh token reuse detected or expired. Please login again.', 401);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 401);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await redis.set(REFRESH_KEY(userId), newRefreshToken, 'EX', 7 * 24 * 60 * 60);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout: delete refresh token from Redis.
   */
  async logout(userId) {
    await redis.del(REFRESH_KEY(userId));
  }

  /**
   * Forgot password: generate a reset token, store in Redis (15 min TTL).
   * In production, this would send an email with the reset link.
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in Redis for 15 minutes
    await redis.set(RESET_KEY(hashedToken), user._id.toString(), 'EX', 15 * 60);

    // Emit event for email sending
    eventBus.emit('user:passwordReset', {
      email,
      resetToken,
      resetUrl: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
    });

    console.log(`🔑 [Dev] Reset token for ${email}: ${resetToken}`);

    return { message: 'If that email exists, a reset link has been sent.' };
  }
}

module.exports = new AuthService();
