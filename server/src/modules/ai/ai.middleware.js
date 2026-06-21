const { URL } = require('url');
const redis = require('../../config/redis');

// In-memory sliding window fallback cache if Redis is offline or mocked
const memoryCache = new Map();

/**
 * Middleware enforcing CSRF protection on AI endpoints.
 * Validates request Origin or Referer against CLIENT_URL for mutation requests.
 */
exports.requireCsrfForAiRoutes = (req, res, next) => {
  // Only enforce strict checks for state-changing or generation endpoints (mutations)
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  
  if (!isMutation) {
    return next();
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  let allowedOrigin;
  try {
    allowedOrigin = new URL(clientUrl).origin;
  } catch (e) {
    allowedOrigin = clientUrl; // Fallback if CLIENT_URL is not a valid URL structure
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Mutation routes require at least one of Origin or Referer to be present
  if (!origin && !referer) {
    return res.status(403).json({ 
      success: false,
      message: "Yêu cầu bị từ chối do thiếu thông tin Origin/Referer (CSRF Blocked)." 
    });
  }

  // Verify Origin if present
  if (origin) {
    try {
      const requestOrigin = new URL(origin).origin;
      if (requestOrigin !== allowedOrigin) {
        return res.status(403).json({ 
          success: false,
          message: "Không được phép thực hiện từ nguồn gốc này (CSRF Blocked)." 
        });
      }
    } catch (e) {
      return res.status(403).json({ 
        success: false,
        message: "Nguồn gốc Origin không hợp lệ (CSRF Blocked)." 
      });
    }
  } else if (referer) {
    // Fallback to Referer check only if Origin is completely missing
    try {
      const requestRefererOrigin = new URL(referer).origin;
      if (requestRefererOrigin !== allowedOrigin) {
        return res.status(403).json({ 
          success: false,
          message: "Không được phép thực hiện từ liên kết nguồn này (CSRF Blocked)." 
        });
      }
    } catch (e) {
      return res.status(403).json({ 
        success: false,
        message: "Liên kết nguồn Referer không hợp lệ (CSRF Blocked)." 
      });
    }
  }

  next();
};

/**
 * Custom Rate Limiting middleware on a per-user and per-feature basis.
 * Default: Max 5 requests per minute per user per feature.
 */
exports.rateLimitUserFeature = (featureName, maxRequests = 5, windowSeconds = 60) => {
  return async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
      return next(); // Skip if user is not authenticated
    }

    const key = `ratelimit:ai:${featureName}:${userId.toString()}`;
    
    // Check if Redis is mock or not connected (mockRedis doesn't support TTL mode 'EX' in normal ioredis format sometimes, we check availability)
    const isRedisAvailable = redis && typeof redis.get === 'function' && process.env.NODE_ENV !== 'test';

    if (isRedisAvailable) {
      try {
        const currentVal = await redis.get(key);
        if (currentVal) {
          const count = parseInt(currentVal, 10);
          if (count >= maxRequests) {
            return res.status(429).json({
              success: false,
              message: `Bạn đã vượt quá giới hạn lượt gọi tính năng ${featureName}. Vui lòng thử lại sau.`
            });
          }
          await redis.set(key, count + 1, 'EX', windowSeconds);
        } else {
          await redis.set(key, 1, 'EX', windowSeconds);
        }
        return next();
      } catch (err) {
        console.warn("[RateLimit] Redis connection failed, falling back to memory:", err.message);
      }
    }

    // In-memory sliding window rate limiting fallback
    const now = Date.now();
    const userLog = memoryCache.get(key) || [];
    
    // Filter timestamps within the current window
    const windowStart = now - (windowSeconds * 1000);
    const validTimestamps = userLog.filter(ts => ts > windowStart);
    
    if (validTimestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: `Bạn đã vượt quá giới hạn lượt gọi tính năng ${featureName}. Vui lòng thử lại sau.`
      });
    }
    
    validTimestamps.push(now);
    memoryCache.set(key, validTimestamps);
    next();
  };
};

