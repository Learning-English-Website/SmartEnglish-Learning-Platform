const rateLimit = require('express-rate-limit');
const { ApiResponse } = require('../shared/utils/apiResponse');

/**
 * Strict rate limiter for login endpoint: 5 requests per 15 minutes.
 * Protects against brute-force attacks.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      ApiResponse.error(
        'Too many login attempts. Please try again after 15 minutes.',
        'RATE_LIMIT_EXCEEDED'
      )
    );
  },
});

/**
 * General rate limiter: 100 requests per 15 minutes.
 * Applied globally to all API routes.
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      ApiResponse.error('Too many requests. Please slow down.', 'RATE_LIMIT_EXCEEDED')
    );
  },
});

module.exports = { loginRateLimiter, generalRateLimiter };
