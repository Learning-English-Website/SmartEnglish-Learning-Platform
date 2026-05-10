/**
 * Wraps async route handlers to avoid try/catch boilerplate.
 * Any thrown error is passed to Express's next() error middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
