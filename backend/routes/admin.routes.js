import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/adminAuth.middleware.js';
import { adminLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, requireAdmin, adminLimiter);

/**
 * GET /api/admin/stats
 * Get system statistics overview
 */
router.get('/stats', adminController.getStats);

/**
 * GET /api/admin/users
 * Get list of all users
 * Query params: page, limit, search
 */
router.get('/users', adminController.getUsers);

/**
 * GET /api/admin/users/:userId
 * Get detailed information about a specific user
 */
router.get('/users/:userId', adminController.getUserDetails);

/**
 * POST /api/admin/users/:userId/disable
 * Disable a user account
 */
router.post('/users/:userId/disable', adminController.disableUser);

/**
 * POST /api/admin/users/:userId/enable
 * Enable a user account
 */
router.post('/users/:userId/enable', adminController.enableUser);

/**
 * POST /api/admin/users/:userId/reset-password
 * Reset user password
 * Body: { newPassword }
 */
router.post('/users/:userId/reset-password', adminController.resetUserPassword);

/**
 * GET /api/admin/activity
 * Get activity logs
 * Query params: page, limit, action, userId
 */
router.get('/activity', adminController.getActivityLogs);

/**
 * GET /api/admin/api-usage
 * Get API usage metrics
 */
router.get('/api-usage', adminController.getApiUsage);

/**
 * POST /api/admin/settings
 * Update system settings
 * Body: { signupEnabled?, maintenanceMode? }
 */
router.post('/settings', adminController.updateSettings);

/**
 * GET /api/admin/export
 * Export all data (backup)
 */
router.get('/export', adminController.exportData);

/**
 * POST /api/admin/logs/clear
 * Clear old logs
 * Body: { daysOld }
 */
router.post('/logs/clear', adminController.clearOldLogs);

export default router;
