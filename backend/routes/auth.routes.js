import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', authLimiter, authController.signup);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', authLimiter, authController.login);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', verifyToken, authController.getCurrentUser);

/**
 * PUT /api/auth/settings
 * Update user settings
 */
router.put('/settings', verifyToken, authController.updateSettings);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', verifyToken, authController.logout);

export default router;
