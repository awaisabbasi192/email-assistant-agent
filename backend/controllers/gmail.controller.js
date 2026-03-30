import GmailService from '../services/gmailService.js';

/**
 * Get Gmail OAuth authorization URL
 */
export const getAuthUrl = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { authUrl, state } = GmailService.getAuthUrl(req.user.userId);

    res.json({ authUrl });
  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
};

/**
 * Handle OAuth callback
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

    // Store encrypted tokens
    await GmailService.storeTokens(userId, tokens);

    // Redirect to dashboard with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/dashboard.html?gmail=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error);

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
