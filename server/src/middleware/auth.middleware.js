const { verifyAccessToken } = require('../shared/utils/jwt');
const { AppError } = require('../shared/errors/AppError');
const User = require('../modules/user/user.model');

/**
 * Verifies JWT access token from Authorization header.
 * Attaches decoded user to req.user.
 * Uses next(err) for Express 5 compatibility.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub).select('-password');
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restricts access to specific roles.
 * Usage: authorize('admin', 'teacher')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

module.exports = { authenticate, authorize };
