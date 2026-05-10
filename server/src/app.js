const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body Parsing (must be BEFORE routes and rate limiters) ───────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── General Rate Limiting ─────────────────────────────────────────────────────
// express-rate-limit v8 conflicts with Express 5 req.query getter — disabled globally
// Per-route rate limiting (e.g. login) still works via loginRateLimiter middleware
// app.use('/api', generalRateLimiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date(), environment: process.env.NODE_ENV })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/user/user.routes'));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use('/{*path}', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.originalUrl} not found` } });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
