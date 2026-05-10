const express = require('express');
const router = express.Router();

const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyEmailOtp,
  resetPasswordWithOtp,
} = require('./auth.controller');
const { validate } = require('../../middleware/validation.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { loginRateLimiter } = require('../../middleware/rateLimiter.middleware');
const passport = require('../../config/passport');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailOtpSchema,
  resetPasswordOtpSchema,
} = require('./auth.validation');

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// Google OAuth entry point
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback – set cookies rồi redirect về frontend (KHÔNG truyền token qua URL)
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed` }), (req, res) => {
  const { accessToken, refreshToken } = req.user;
  // Set HttpOnly cookies (giống login thường)
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
  // Redirect về frontend — KHÔNG kèm token trong URL
  res.redirect(`${process.env.CLIENT_URL}/oauth/callback`);
});
// POST /api/auth/login (rate limited)
router.post('/login', loginRateLimiter, validate(loginSchema), login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

// POST /api/auth/verify-email-otp
router.post('/verify-email-otp', validate(verifyEmailOtpSchema), verifyEmailOtp);

// POST /api/auth/reset-password-otp
router.post('/reset-password-otp', validate(resetPasswordOtpSchema), resetPasswordWithOtp);

module.exports = router;
