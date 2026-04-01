import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req, res) => {
    return req.method === 'OPTIONS';
  },
  validate: {
    xForwardedForHeader: false
  }
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  validate: {
    xForwardedForHeader: false
  }
});

/**
 * Rate limiter for user-specific endpoints
 */
export const userApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req, res) => {
    return req.user ? req.user.userId : req.ip;
  },
  message: 'Rate limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  validate: {
    xForwardedForHeader: false
  }
});

/**
 * Rate limiter for admin endpoints
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Admin rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req, res) => {
    return req.user ? req.user.userId : req.ip;
  },
  validate: {
    xForwardedForHeader: false
  }
});

/**
 * Strict rate limiter for sensitive operations
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many attempts for this sensitive operation, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req, res) => {
    return req.method === 'OPTIONS';
  },
  validate: {
    xForwardedForHeader: false
  }
});
