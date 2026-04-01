import AuthService from '../services/authService.js';

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and attaches user to request
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to verify JWT token from URL query parameter
 * Used for OAuth callback handling
 */
export const verifyTokenFromQuery = (req, res, next) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    try {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = AuthService.verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // No-op, user will be undefined
      }
    }

    next();
  } catch (error) {
    next();
  }
};
