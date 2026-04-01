/**
 * Global error handling middleware
 * Should be mounted last in the middleware chain
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error: ' + err.message;
  }

  if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized: ' + err.message;
  }

  if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden: ' + err.message;
  }

  // Don't expose internal errors to client
  if (status === 500) {
    message = 'Internal server error';
  }

  res.status(status).json({
    error: message,
    status: status,
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
};
