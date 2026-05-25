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
    // Ưu tiên đọc từ HttpOnly cookie, fallback sang Authorization header
    let token = req.cookies?.accessToken;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    console.log(`[Auth] Request: ${req.method} ${req.path} | Token present: ${!!token} | Has cookie: ${!!req.cookies?.accessToken}`);

    if (!token) {
      return next(new AppError('No token provided', 401));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select('-password');
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    console.log(`[Auth] Error type: ${err.name} | message: ${err.message}`);
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
