import GmailService from '../services/gmailService.js';
import StorageService from '../services/storageService.js';
import LoggingService from '../services/loggingService.js';

/**
 * Get Gmail OAuth authorization URL
 * Allows both authenticated and unauthenticated users
 */
export const getAuthUrl = async (req, res) => {
  try {
    // If user is authenticated, use their ID. Otherwise, generate a temporary one
    let userId = req.user?.userId;

    if (!userId) {
      // Generate temporary userId for unauthenticated users
      // Format: oauth_TIMESTAMP_RANDOM
      const randomStr = Math.random().toString(36).substring(2, 10);
      userId = `oauth_${Date.now()}_${randomStr}`;
    }

    const { authUrl, state } = GmailService.getAuthUrl(userId);

    res.json({ authUrl, userId });
  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
};

/**
 * Handle OAuth callback
 * Enhanced to handle users without existing sessions
 */
export const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Extract userId from state (format: userId:randomstring)
    const [userId] = state.split(':');
    if (!userId) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for tokens
    const tokens = await GmailService.exchangeCodeForTokens(code);

    // Verify user exists, if not create a temporary one
    let user = await StorageService.findOne('users.json', { id: userId });
    if (!user) {
      // Create a new user with Gmail email if signup wasn't completed
      // This allows direct Gmail connection without traditional signup
      const newUser = {
        id: userId,
        email: tokens.email,
        passwordHash: null, // Gmail OAuth only
        role: 'user',
        createdAt: new Date().toISOString(),
        gmailConnected: true,
        loginMethod: 'gmail',
        settings: {
          autoGenerateReplies: false,
          replyTone: 'professional'
        }
      };

      await StorageService.append('users.json', newUser);
      user = newUser;

      // Log activity
      await LoggingService.logActivity(userId, 'SIGNUP_VIA_GMAIL', {
        email: tokens.email
      });
    } else {
      // Update existing user to mark Gmail as connected
      await StorageService.update('users.json', { id: userId }, { gmailConnected: true });
      user.gmailConnected = true;
    }

    // Store encrypted tokens
    await GmailService.storeTokens(userId, tokens);

    // Generate JWT token for automatic login
    const tokenPayload = {
      userId: userId,
      email: tokens.email,
      role: user.role || 'user',
      gmailConnected: true
    };
    const AuthService = (await import('../services/authService.js')).default;
    const jwtToken = AuthService.generateToken(tokenPayload);

    console.log('✅ OAuth callback successful:', { userId, email: tokens.email, gmailConnected: true });

    // Log activity
    await LoggingService.logActivity(userId, 'GMAIL_CONNECT', {
      email: tokens.email,
      auto_created_user: !user
    });

    // Redirect to dashboard with success and auto-login token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/dashboard.html?gmail=connected&token=${jwtToken}`);
  } catch (error) {
    console.error('❌ OAuth callback error:', error);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/dashboard.html?error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Fetch unread emails
 */
export const getEmails = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults) : 10;

    const emails = await GmailService.fetchUnreadEmails(req.user.userId, maxResults);

    res.json(emails);
  } catch (error) {
    console.error('Get emails error:', error);

    if (error.message.includes('Gmail not connected')) {
      return res.status(400).json({ error: 'Gmail is not connected' });
    }

    res.status(500).json({ error: 'Failed to fetch emails' });
  }
};

/**
 * Create draft reply
 */
export const createDraft = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { emailId, content } = req.body;

    if (!emailId || !content) {
      return res.status(400).json({ error: 'Missing emailId or content' });
    }

    const draftId = await GmailService.createDraft(req.user.userId, emailId, content);

    res.json({
      message: 'Draft created successfully',
      draftId
    });
  } catch (error) {
    console.error('Create draft error:', error);

    if (error.message.includes('Gmail not connected')) {
      return res.status(400).json({ error: 'Gmail is not connected' });
    }

    res.status(500).json({ error: 'Failed to create draft' });
  }
};

/**
 * Disconnect Gmail
 */
export const disconnect = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await GmailService.disconnect(req.user.userId);

    res.json({ message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
};
