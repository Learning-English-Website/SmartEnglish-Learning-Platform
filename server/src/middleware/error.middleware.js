const { ApiResponse } = require('../shared/utils/apiResponse');

/**
 * Global error handler middleware for Express 5.
 * Must be the LAST middleware registered in app.js.
 * Express 5 requires exactly 4 params: (err, req, res, next)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Log the error
  console.error(`[Error] ${statusCode} — ${err.message}`);
  if (isDev && err.stack) {
    console.error(err.stack);
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(ApiResponse.error('Validation failed', 'VALIDATION_ERROR', details));
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json(ApiResponse.error(`${field} already exists`, 'DUPLICATE_KEY'));
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json(ApiResponse.error('Invalid ID format', 'INVALID_ID'));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(ApiResponse.error('Invalid token', 'INVALID_TOKEN'));
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(ApiResponse.error('Token expired', 'TOKEN_EXPIRED'));
  }

  // Operational errors (AppError)
  if (err.isOperational) {
    return res.status(statusCode).json(ApiResponse.error(err.message, `HTTP_${statusCode}`));
  }

  // Unhandled errors
  const message = isDev ? err.message : 'Something went wrong';
  return res.status(500).json(ApiResponse.error(message, 'INTERNAL_ERROR'));
};

module.exports = { errorHandler };
