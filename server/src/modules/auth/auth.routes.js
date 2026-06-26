const express = require('express');
const router = express.Router();

const {
  register,
  resendVerificationOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyResetOtp,
  verifyEmailOtp,
  resetPasswordWithOtp,
  googleAuth,
} = require('./auth.controller');
const { validate } = require('../../middleware/validation.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  loginRateLimiter,
  verifyOtpRateLimiter,
  resendOtpRateLimiter,
} = require('../../middleware/rateLimiter.middleware');
const passport = require('../../config/passport');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resendVerificationOtpSchema,
  verifyEmailOtpSchema,
  resetPasswordOtpSchema,
  googleAuthSchema,
} = require('./auth.validation');

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/resend-verification-otp
router.post('/resend-verification-otp', resendOtpRateLimiter, validate(resendVerificationOtpSchema), resendVerificationOtp);

// Google OAuth entry point — accepts ?redirect=<path> to return user there after login
router.get('/google', (req, res, next) => {
  const { redirect } = req.query;
  const state = redirect ? Buffer.from(JSON.stringify({ redirect })).toString('base64') : '';
  passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

// Google OAuth callback – set cookies rồi redirect về frontend (KHÔNG truyền token qua URL)
router.get('/google/callback', (req, res, next) => {
  let redirectPath = '/';
  try {
    const { state } = req.query;
    if (state) {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      if (decoded.redirect) {
        redirectPath = decoded.redirect;
      }
    }
  } catch (err) {
    console.error('Failed to parse Google OAuth state:', err);
  }

  passport.authenticate('google', { session: false }, (err, authData) => {
    if (err || !authData) {
      if (err && err.message === 'Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.') {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=locked`);
      }
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
    }
    const tokens = authData;
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'none' : 'lax';
    res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: isProd, sameSite, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: isProd, sameSite, sameSite, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect(`${process.env.CLIENT_URL}/oauth/callback?redirect=${encodeURIComponent(redirectPath)}`);
  })(req, res, next);
});
// POST /api/auth/google  (Google ID Token auth for mobile apps)
router.post('/google', validate(googleAuthSchema), googleAuth);

// POST /api/auth/login (rate limited)
router.post('/login', loginRateLimiter, validate(loginSchema), login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', verifyOtpRateLimiter, validate(verifyEmailOtpSchema), verifyResetOtp);

// POST /api/auth/verify-email-otp
router.post('/verify-email-otp', verifyOtpRateLimiter, validate(verifyEmailOtpSchema), verifyEmailOtp);

// POST /api/auth/reset-password-otp
router.post('/reset-password-otp', validate(resetPasswordOtpSchema), resetPasswordWithOtp);

// DEV-ONLY helper to retrieve OTP code (used for automated Postman/E2E test runs)
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  router.get('/dev-get-otp', async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email query parameter is required' });
      }
      
      const redis = require('../../config/redis');
      const crypto = require('crypto');
      
      const emailKey = `otp:verify:${email.toLowerCase()}`;
      const resetKey = `otp:reset:${email.toLowerCase()}`;
      
      let data = await redis.get(emailKey);
      let type = 'verify';
      
      if (!data) {
        data = await redis.get(resetKey);
        type = 'reset';
      }
      
      if (!data) {
        return res.status(404).json({ success: false, message: 'OTP not found in Redis' });
      }
      
      const { otpHash } = JSON.parse(data);
      if (!otpHash) {
        return res.status(500).json({ success: false, message: 'OTP hash not found in cached data' });
      }
      
      // Brute force 6-digit OTP
      let otp = null;
      for (let i = 100000; i <= 999999; i++) {
        const otpStr = String(i);
        const hash = crypto.createHash('sha256').update(otpStr).digest('hex');
        if (hash === otpHash) {
          otp = otpStr;
          break;
        }
      }
      
      if (!otp) {
        return res.status(500).json({ success: false, message: 'Failed to crack OTP hash' });
      }
      
      return res.status(200).json({ success: true, type, otp });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });
}

module.exports = router;
