/**
 * Middleware to check if user has admin role
 * Must be used after verifyToken middleware
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Check if user is the admin (by email)
 */
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};
