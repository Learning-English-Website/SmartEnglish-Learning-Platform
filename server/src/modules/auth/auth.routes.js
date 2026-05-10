const express = require('express');
const router = express.Router();

const { register, login, refreshToken, logout, forgotPassword } = require('./auth.controller');
const { validate } = require('../../middleware/validation.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  refreshTokenSchema,
} = require('./auth.validation');

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login  (rate limited — loginRateLimiter disabled: express-rate-limit v8 + Express 5 incompatibility)
router.post('/login', validate(loginSchema), login);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

module.exports = router;
