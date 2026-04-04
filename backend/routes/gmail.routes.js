import express from 'express';
import * as gmailController from '../controllers/gmail.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { userApiLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * GET /api/gmail/auth-url
 * Get Gmail OAuth authorization URL
 */
router.get('/auth-url', verifyToken, gmailController.getAuthUrl);

/**
 * GET /api/gmail/callback
 * Handle OAuth callback from Google
 */
router.get('/callback', gmailController.handleCallback);

/**
 * GET /api/gmail/emails
 * Fetch unread emails from Gmail
 * Query params: maxResults (default: 10)
 */
router.get('/emails', verifyToken, userApiLimiter, gmailController.getEmails);

/**
 * POST /api/gmail/create-draft
 * Create a draft reply for an email
 * Body: { emailId, content }
 */
router.post('/create-draft', verifyToken, userApiLimiter, gmailController.createDraft);

/**
 * POST /api/gmail/send-reply
 * Send a reply email directly
 * Body: { emailId, content }
 */
router.post('/send-reply', verifyToken, userApiLimiter, gmailController.sendReply);

/**
 * DELETE /api/gmail/disconnect
 * Disconnect Gmail account
 */
router.delete('/disconnect', verifyToken, gmailController.disconnect);

export default router;
