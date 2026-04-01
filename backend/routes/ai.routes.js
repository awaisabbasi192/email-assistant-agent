import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { verifyToken, optionalAuth } from '../middleware/auth.middleware.js';
import { userApiLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * POST /api/ai/generate-reply
 * Generate an email reply using AI
 * Body: { subject, from, body, tone? }
 */
router.post('/generate-reply', verifyToken, userApiLimiter, aiController.generateReply);

/**
 * POST /api/ai/generate-options
 * Generate multiple reply options
 * Body: { subject, from, body, count? }
 */
router.post('/generate-options', verifyToken, userApiLimiter, aiController.generateReplyOptions);

/**
 * GET /api/ai/test
 * Test Gemini API connection
 */
router.get('/test', optionalAuth, aiController.testConnection);

export default router;
