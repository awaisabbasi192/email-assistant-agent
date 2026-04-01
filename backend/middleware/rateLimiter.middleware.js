import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req, res) => {
    // Skip rate limiting for OPTIONS requests
    return req.method === 'OPTIONS';
  }
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP (for public endpoints)
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for user-specific endpoints
 * 200 requests per 15 minutes per authenticated user
 */
export const userApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each user to 200 requests per windowMs
  keyGenerator: (req, res) => {
    // Rate limit by userId if authenticated, otherwise by IP
    return req.user ? req.user.userId : req.ip;
  },
  message: 'Rate limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for admin endpoints
 * 500 requests per 15 minutes
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Admin rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Rate limit by userId for admin endpoints
    return req.user ? req.user.userId : req.ip;
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 3 requests per 15 minutes (e.g., password reset)
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: 'Too many attempts for this sensitive operation, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return req.method === 'OPTIONS';
  }
});
