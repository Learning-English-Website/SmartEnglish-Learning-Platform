const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../user/user.model');
const redis = require('../../config/redis');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../shared/utils/jwt');
const { AppError } = require('../../shared/errors/AppError');
const eventBus = require('../../shared/events/eventBus');

// Google token verifier — accepts both web and android client IDs in one call
const GOOGLE_CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
].filter(Boolean);

const verifyGoogleToken = async (idToken) => {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_IDS,
  });
  return ticket.getPayload();
};

// Redis key helpers
const REFRESH_KEY = (userId) => `refresh:${userId}`;
const EMAIL_VERIFY_OTP_KEY = (email) => `otp:verify:${email.toLowerCase()}`;
const RESET_OTP_KEY = (email) => `otp:reset:${email.toLowerCase()}`;
const OTP_TTL_SECONDS = 10 * 60;

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');
const normalizeEmail = (email) => email.trim().toLowerCase();

class AuthService {
  /**
   * Register a new user and send verification OTP.
   */
  async register({ email, username, password }) {
    const normalizedEmail = normalizeEmail(email);
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
        console.log(`🔑 [OTP] Registration OTP for existing unverified user ${existing.email}: ${otp}`);
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

    console.log(`🔑 [OTP] Registration OTP for new user ${normalizedEmail}: ${otp}`);

    return {
      email: normalizedEmail,
      requiresEmailVerification: true,
    };
  }

  /**
   * Login with email + password. Returns { user, accessToken, refreshToken }.
   */
  async login(email, password) {
    const user = await User.findByEmail(normalizeEmail(email));
    if (!user) throw new AppError('Invalid email or password', 401);

    if (!user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status === 'locked') {
      throw new AppError('Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.', 403);
    }

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

    // ── Trigger notifications & emails on login ──────────────────────────────────
    this._triggerLoginNotifications(user).catch(err =>
      console.error('[Auth] Login notification error:', err.message)
    );

    return { user: user.toPublicProfile(), accessToken, refreshToken };
  }

  /**
   * Internal: send streak reminders + weekly report on login
   */
  async _triggerLoginNotifications(user) {
    const notificationService = require('../notification/notification.service');
    const notificationEmailService = require('../../shared/services/notificationEmail.service');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);

    const lastStudy = user.streak?.lastStudyDate ? new Date(user.streak.lastStudyDate) : null;
    const hasStudiedToday = lastStudy && lastStudy >= today;
    const currentStreak = user.streak?.current || 0;

    const emailReminderEnabled = user.emailReminderEnabled !== false;
    const lastSent = user.lastStreakReminderSentAt ? new Date(user.lastStreakReminderSentAt) : null;
    const lastSentKey = lastSent ? lastSent.toISOString().slice(0, 10) : null;
    const alreadySentToday = lastSentKey === todayKey;

    // ── Streak reminder: user has active streak but hasn't studied today ──
    // Respect emailReminderEnabled + send once per day
    if (emailReminderEnabled && currentStreak > 0 && !hasStudiedToday && !alreadySentToday) {
      await notificationService.createNotification({
        userId: user._id,
        type: 'reminder',
        title: 'Đừng bỏ lỡ chuỗi!',
        body: `Bạn có chuỗi ${currentStreak} ngày. Hoàn thành bài học ngay để không mất streak!`,
        actionUrl: '/duolingo/learn',
      });

      // Also emit event for email handler
      eventBus.emit('streak:reminder', {
        userId: user._id.toString(),
        streak: currentStreak,
      });

      await User.updateOne(
        { _id: user._id },
        { $set: { lastStreakReminderSentAt: new Date() } }
      );
    }

    // ── Weekly report: every Sunday (day 0) ──
    if (today.getDay() === 0) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6);

      // Aggregate LearningHistory for this week
      const LearningHistory = require('../../models/learningHistory.model');
      const stats = await LearningHistory.aggregate([
        {
          $match: {
            user: user._id,
            date: { $gte: weekStart, $lte: today },
          },
        },
        {
          $group: {
            _id: '$user',
            totalXP: { $sum: '$xpEarned' },
            lessonsCompleted: { $sum: '$lessonsCompleted' },
            cardsReviewed: { $sum: '$cardsReviewed' },
          },
        },
      ]);

      if (stats.length > 0) {
        const weeklyData = {
          totalXP: stats[0].totalXP || 0,
          lessonsCompleted: stats[0].lessonsCompleted || 0,
          streakDays: currentStreak,
          accuracy: 0,
        };
        await notificationEmailService.sendWeeklyReport(user._id.toString(), weeklyData);
      }
    }
  }

  /**
   * Google ID Token auth (for mobile apps). Verify idToken with Google, find or create user.
   */
  async googleAuth(idToken) {
    let payload;
    try {
      payload = await verifyGoogleToken(idToken);
    } catch (err) {
      throw new AppError('Invalid Google ID token', 401);
    }

    const email = payload.email;
    if (!email) throw new AppError('Google account has no email', 400);

    let user = await User.findOne({ email });
    if (user) {
      if (user.status === 'locked') {
        throw new AppError('Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.', 403);
      }
      if (!user.oauth) user.oauth = {};
      if (!user.oauth.googleId) {
        user.oauth.googleId = payload.sub;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      let baseUsername = (payload.name || 'User').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      if (baseUsername.length < 3) baseUsername = (baseUsername + '123').slice(0, 5);
      if (baseUsername.length > 25) baseUsername = baseUsername.slice(0, 25);

      let username = baseUsername;
      let count = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${count}`;
        count++;
      }

      user = await User.create({
        email,
        username,
        password: undefined,
        oauth: { googleId: payload.sub },
        avatar: payload.picture || undefined,
        isVerified: true,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await redis.set(REFRESH_KEY(user._id), refreshToken, 'EX', 7 * 24 * 60 * 60);

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // ── Trigger notifications & emails on login ──────────────────────────────────
    this._triggerLoginNotifications(user).catch(err =>
      console.error('[Auth] Google login notification error:', err.message)
    );

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
    if (user.status === 'locked') {
      throw new AppError('Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.', 403);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Atomically rotate: delete old token and store new token.
    // jwt.sign is deterministic with same inputs; if called within same second,
    // tokens may be identical — but rotation still invalidates the old token.
    await redis.del(REFRESH_KEY(userId));
    await redis.set(REFRESH_KEY(userId), newRefreshToken, 'EX', 7 * 24 * 60 * 60);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout: delete refresh token from Redis.
   */
  async logout(userId) {
    await redis.del(REFRESH_KEY(userId));
  }

  async resendVerificationOtp(email) {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return { message: 'If that email exists and is pending verification, a new OTP has been sent.' };
    }

    if (user.isVerified) {
      // Return same message as "not found" to prevent email enumeration
      return { message: 'If that email exists and is pending verification, a new OTP has been sent.' };
    }

    const otp = generateOtpCode();
    await redis.set(
      EMAIL_VERIFY_OTP_KEY(normalizedEmail),
      JSON.stringify({ otpHash: hashOtp(otp), userId: user._id.toString() }),
      'EX',
      OTP_TTL_SECONDS
    );

    eventBus.emit('user:registered', {
      userId: user._id,
      email: user.email,
      username: user.username,
      otp,
    });

    console.log(`🔑 [OTP] Resent Registration OTP for ${normalizedEmail}: ${otp}`);

    return { message: 'If that email exists and is pending verification, a new OTP has been sent.' };
  }

  async verifyEmailOtp(email, otp) {
    const normalizedEmail = normalizeEmail(email);
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
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset OTP has been sent.' };

    const otp = generateOtpCode();
    await redis.set(
      RESET_OTP_KEY(normalizedEmail),
      JSON.stringify({ otpHash: hashOtp(otp), userId: user._id.toString() }),
      'EX',
      OTP_TTL_SECONDS
    );

    // Emit event for email sending
    eventBus.emit('user:passwordResetOtp', {
      email: normalizedEmail,
      username: user.username,
      otp,
    });

    console.log(`🔑 [OTP] Reset OTP for ${email}: ${otp}`);

    return { message: 'If that email exists, a reset OTP has been sent.' };
  }

  async verifyResetOtp(email, otp) {
    const normalizedEmail = normalizeEmail(email);
    const key = RESET_OTP_KEY(normalizedEmail);
    const data = await redis.get(key);
    if (!data) throw new AppError('Invalid or expired OTP', 400);

    const parsed = JSON.parse(data);
    const hashedOtp = hashOtp(otp);
    if (parsed.otpHash !== hashedOtp) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Invalidate OTP immediately to prevent reuse
    await redis.del(key);

    // Store a one-time verification token (valid for 2 minutes) to allow password reset
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await redis.set(
      `reset:verified:${verifyToken}`,
      JSON.stringify({ userId: parsed.userId.toString() }),
      'EX',
      2 * 60
    );

    return { message: 'OTP verified successfully', resetToken: verifyToken };
  }

  async resetPasswordWithOtp({ email, otp, newPassword, resetToken }) {
    // Check verifyResetOtp path first
    const normalizedEmail = normalizeEmail(email);
    const key = RESET_OTP_KEY(normalizedEmail);
    const data = await redis.get(key);

    let userId;
    // Legacy path: if key still exists, verify OTP again (for clients calling reset directly)
    if (data) {
      const parsed = JSON.parse(data);
      const hashedOtp = hashOtp(otp);
      if (parsed.otpHash !== hashedOtp) {
        throw new AppError('Invalid or expired OTP', 400);
      }
      userId = parsed.userId;
      await redis.del(key);
    } else {
      // New path: use resetToken from verifyResetOtp
      if (!resetToken) throw new AppError('Reset token required', 400);
      const tokenKey = `reset:verified:${resetToken}`;
      const tokenData = await redis.get(tokenKey);
      if (!tokenData) throw new AppError('Reset token expired or invalid', 400);
      const parsedToken = JSON.parse(tokenData);
      userId = parsedToken.userId;
      await redis.del(tokenKey);
    }

    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404);

    user.password = newPassword;
    await user.save();

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
