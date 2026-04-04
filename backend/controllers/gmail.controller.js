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
      console.log('📝 Updating user gmailConnected for:', userId);
      await StorageService.update('users.json', { id: userId }, { gmailConnected: true });
    }

    // Store encrypted tokens
    console.log('🔐 Storing Gmail tokens for:', userId);
    await GmailService.storeTokens(userId, tokens);

    // Fetch fresh user data to ensure gmailConnected is set
    const updatedUser = await StorageService.findOne('users.json', { id: userId });
    console.log('👤 Updated user data:', {
      id: updatedUser.id,
      email: updatedUser.email,
      gmailConnected: updatedUser.gmailConnected
    });

    // Generate JWT token for automatic login with correct gmailConnected status
    const tokenPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role || 'user',
      gmailConnected: updatedUser.gmailConnected === true
    };
    const AuthService = (await import('../services/authService.js')).default;
    const jwtToken = AuthService.generateToken(tokenPayload);
    console.log('🎫 JWT Payload:', tokenPayload);

    console.log('✅ OAuth callback successful:', { userId, email: tokens.email, gmailConnected: true });
    console.log('🔐 JWT Token generated:', jwtToken.substring(0, 50) + '...');

    // Log activity
    await LoggingService.logActivity(userId, 'GMAIL_CONNECT', {
      email: tokens.email,
      auto_created_user: !user
    });

    // Redirect to dashboard with success and auto-login token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/dashboard.html?gmail=connected&token=${jwtToken}`;
    console.log('🔄 Redirecting to:', redirectUrl.substring(0, 100) + '...');
    return res.redirect(redirectUrl);
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
 * Send reply email directly
 */
export const sendReply = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { emailId, content } = req.body;

    if (!emailId || !content) {
      return res.status(400).json({ error: 'Missing emailId or content' });
    }

    const result = await GmailService.sendReply(req.user.userId, emailId, content);

    res.json({
      message: 'Email sent successfully',
      messageId: result.id,
      threadId: result.threadId
    });
  } catch (error) {
    console.error('Send reply error:', error);

    if (error.message.includes('Gmail not connected')) {
      return res.status(400).json({ error: 'Gmail is not connected' });
    }

    res.status(500).json({ error: 'Failed to send email' });
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
