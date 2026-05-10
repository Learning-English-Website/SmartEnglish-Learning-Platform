const crypto = require('crypto');
const User = require('../user/user.model');
const redis = require('../../config/redis');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../shared/utils/jwt');
const { AppError } = require('../../shared/errors/AppError');
const eventBus = require('../../shared/events/eventBus');

// Redis key helpers
const REFRESH_KEY = (userId) => `refresh:${userId}`;
const EMAIL_VERIFY_OTP_KEY = (email) => `otp:verify:${email.toLowerCase()}`;
const RESET_OTP_KEY = (email) => `otp:reset:${email.toLowerCase()}`;
const OTP_TTL_SECONDS = 10 * 60;

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

class AuthService {
  /**
   * Register a new user and send verification OTP.
   */
  async register({ email, username, password }) {
    const normalizedEmail = email.toLowerCase();
    // Check duplicates
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existing) {
      if (existing.email === normalizedEmail && !existing.isVerified) {
        const otp = generateOtpCode();
        await redis.set(
          EMAIL_VERIFY_OTP_KEY(normalizedEmail),
          JSON.stringify({ otpHash: hashOtp(otp), userId: existing._id.toString() }),
          'EX',
          OTP_TTL_SECONDS
        );
        eventBus.emit('user:registered', {
          userId: existing._id,
          email: existing.email,
          username: existing.username,
          otp,
        });
        return {
          email: existing.email,
          requiresEmailVerification: true,
        };
      }
      const field = existing.email === normalizedEmail ? 'Email' : 'Username';
      throw new AppError(`${field} already in use`, 409);
    }

    const user = await User.create({ email: normalizedEmail, username, password });
    const otp = generateOtpCode();
    await redis.set(
      EMAIL_VERIFY_OTP_KEY(normalizedEmail),
      JSON.stringify({ otpHash: hashOtp(otp), userId: user._id.toString() }),
      'EX',
      OTP_TTL_SECONDS
    );

    // Emit event for side effects (send OTP email)
    eventBus.emit('user:registered', { userId: user._id, email: normalizedEmail, username, otp });

    return {
      email: normalizedEmail,
      requiresEmailVerification: true,
    };
  }

  /**
   * Login with email + password. Returns { user, accessToken, refreshToken }.
   */
  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) throw new AppError('Invalid email or password', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);
    if (!user.isVerified) {
      throw new AppError('Email not verified. Please verify OTP before login.', 403);
    }

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

  async verifyEmailOtp(email, otp) {
    const normalizedEmail = email.toLowerCase();
    const key = EMAIL_VERIFY_OTP_KEY(normalizedEmail);
    const data = await redis.get(key);
    if (!data) throw new AppError('Invalid or expired OTP', 400);

    const parsed = JSON.parse(data);
    if (parsed.otpHash !== hashOtp(otp)) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    const user = await User.findById(parsed.userId);
    if (!user) throw new AppError('User not found', 404);

    user.isVerified = true;
    await user.save({ validateBeforeSave: false });
    await redis.del(key);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await redis.set(REFRESH_KEY(user._id), refreshToken, 'EX', 7 * 24 * 60 * 60);

    return {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
      message: 'Email verified successfully',
    };
  }

  /**
   * Forgot password: generate OTP, store in Redis (10 min TTL), and emit email event.
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset OTP has been sent.' };

    const otp = generateOtpCode();
    await redis.set(
      RESET_OTP_KEY(email),
      JSON.stringify({ otpHash: hashOtp(otp), userId: user._id.toString() }),
      'EX',
      OTP_TTL_SECONDS
    );

    // Emit event for email sending
    eventBus.emit('user:passwordResetOtp', {
      email,
      username: user.username,
      otp,
    });

    console.log(`🔑 [Dev] Reset OTP for ${email}: ${otp}`);

    return { message: 'If that email exists, a reset OTP has been sent.' };
  }

  async resetPasswordWithOtp({ email, otp, newPassword }) {
    const key = RESET_OTP_KEY(email);
    const data = await redis.get(key);
    if (!data) throw new AppError('Invalid or expired OTP', 400);

    const parsed = JSON.parse(data);
    if (parsed.otpHash !== hashOtp(otp)) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    const user = await User.findById(parsed.userId).select('+password');
    if (!user) throw new AppError('User not found', 404);

    user.password = newPassword;
    await user.save();
    await redis.del(key);

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
