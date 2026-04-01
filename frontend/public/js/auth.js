/**
 * Authentication utility functions
 */

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem('authToken');
}

/**
 * Get authentication token
 */
function getToken() {
  return localStorage.getItem('authToken');
}

/**
 * Get user email from storage
 */
function getStoredUserEmail() {
  return localStorage.getItem('userEmail');
}

/**
 * Save authentication data
 */
function saveAuthData(token, email, userId, role = 'user') {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userId', userId);
  localStorage.setItem('userRole', role);
  localStorage.setItem('lastLogin', new Date().toISOString());
}

/**
 * Clear authentication data (logout)
 */
function clearAuthData() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('lastLogin');
}

/**
 * Get user role
 */
function getUserRole() {
  return localStorage.getItem('userRole') || 'user';
}

/**
 * Check if user is admin
 */
function isAdmin() {
  return getUserRole() === 'admin';
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Require authentication - redirect if not logged in
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
  }
}

/**
 * Require admin role - redirect if not admin
 */
function requireAdmin() {
  requireAuth();
  if (!isAdmin()) {
    window.location.href = 'dashboard.html';
  }
}

/**
 * Redirect if already authenticated
 */
function redirectIfAuth(redirectTo = 'dashboard.html') {
  if (isAuthenticated()) {
    window.location.href = redirectTo;
  }
}

