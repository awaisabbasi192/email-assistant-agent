import { google } from 'googleapis';
import { encrypt, decrypt, generateRandomString } from '../utils/encryption.js';
import StorageService from './storageService.js';
import LoggingService from './loggingService.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Initialize OAuth2 client
 */
function getOAuth2Client() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  let REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

  // For local development, use localhost
  if (process.env.NODE_ENV !== 'production') {
    REDIRECT_URI = 'http://localhost:3000/api/gmail/callback';
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error('❌ Gmail OAuth Configuration Missing:');
    console.error('   GOOGLE_CLIENT_ID:', CLIENT_ID ? '✅ SET' : '❌ NOT SET');
    console.error('   GOOGLE_CLIENT_SECRET:', CLIENT_SECRET ? '✅ SET' : '❌ NOT SET');
    console.error('   GOOGLE_REDIRECT_URI:', REDIRECT_URI ? '✅ SET' : '❌ NOT SET');
    throw new Error('Gmail OAuth credentials not configured in environment variables');
  }

  console.log('📍 OAuth2 Client initialized with:');
  console.log('   CLIENT_ID:', CLIENT_ID.substring(0, 20) + '...');
  console.log('   REDIRECT_URI:', REDIRECT_URI);

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

class GmailService {
  /**
   * Generate OAuth2 authorization URL
   */
  static getAuthUrl(userId) {
    try {
      const oauth2 = getOAuth2Client();

      // Generate state for CSRF protection
      const state = generateRandomString();

      // Store state temporarily (could use session or cache)
      // For now, we'll include userId in state: userId:randomstring

      const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: `${userId}:${state}`,
        prompt: 'consent' // Force consent to get refresh token
      });

      return { authUrl, state };
    } catch (error) {
      throw new Error(`Failed to generate auth URL: ${error.message}`);
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code) {
    try {
      const oauth2 = getOAuth2Client();
      const { tokens } = await oauth2.getToken(code);

      // Get user info
      oauth2.setCredentials(tokens);
      const oauth2Service = google.oauth2({ version: 'v2', auth: oauth2 });
      const { data: userInfo } = await oauth2Service.userinfo.get();

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        email: userInfo.email,
        name: userInfo.name
      };
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  /**
   * Store encrypted tokens for user
   */
  static async storeTokens(userId, tokens) {
    try {
      let tokenData = { tokens: [] };

      // Try to read existing data
      try {
        tokenData = await StorageService.read('gmail_tokens.json');
      } catch (error) {
        // File doesn't exist yet, create new structure
        console.log('📝 Creating new gmail_tokens.json file');
        tokenData = { tokens: [] };
      }

      // Ensure tokens array exists
      if (!tokenData.tokens) {
        tokenData.tokens = [];
      }

      // Remove existing tokens for this user
      tokenData.tokens = tokenData.tokens.filter(t => t.userId !== userId);

      // Add new tokens (encrypted)
      tokenData.tokens.push({
        userId,
        gmailEmail: tokens.email,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiryDate: tokens.expiryDate,
        scopes: SCOPES,
        connectedAt: new Date().toISOString()
      });

      console.log('💾 Writing Gmail tokens for user:', userId);
      await StorageService.write('gmail_tokens.json', tokenData);
      console.log('✅ Gmail tokens stored successfully');

      // Update user record
      console.log('📝 Updating user gmailConnected status');
      await StorageService.update('users.json', { id: userId }, { gmailConnected: true });

      // Log activity
      await LoggingService.logActivity(userId, 'GMAIL_CONNECT', {
        email: tokens.email
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Get decrypted tokens for user
   */
  static async getTokens(userId) {
    try {
      const tokenData = await StorageService.read('gmail_tokens.json');
      const userTokens = tokenData.tokens.find(t => t.userId === userId);

      if (!userTokens) {
        throw new Error('Gmail not connected');
      }

      return {
        accessToken: decrypt(userTokens.accessToken),
        refreshToken: decrypt(userTokens.refreshToken),
        expiryDate: userTokens.expiryDate,
        email: userTokens.gmailEmail
      };
    } catch (error) {
      throw new Error(`Failed to retrieve tokens: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(userId) {
    try {
      const tokens = await this.getTokens(userId);
      const oauth2 = getOAuth2Client();

      oauth2.setCredentials({
        refresh_token: tokens.refreshToken
      });

      const { credentials } = await oauth2.refreshAccessToken();

      // Update stored tokens
      const tokenData = await StorageService.read('gmail_tokens.json');
      const userTokenEntry = tokenData.tokens.find(t => t.userId === userId);

      if (userTokenEntry) {
        userTokenEntry.accessToken = encrypt(credentials.access_token);
        userTokenEntry.expiryDate = credentials.expiry_date;
        await StorageService.write('gmail_tokens.json', tokenData);
      }

      return credentials.access_token;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Fetch unread emails
   */
  static async fetchUnreadEmails(userId, maxResults = 10) {
    try {
      const tokens = await this.getTokens(userId);
      const oauth2 = getOAuth2Client();

      oauth2.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2 });

      // Fetch unread messages
      const { data } = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: Math.min(maxResults, 20)
      });

      if (!data.messages) {
        return [];
      }

      // Fetch full message content for each message
      const emails = await Promise.all(
        data.messages.map(async (msg) => {
          try {
            const { data: fullMsg } = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full'
            });

            return this._parseEmail(fullMsg);
          } catch (error) {
            console.error(`Failed to fetch email ${msg.id}:`, error);
            return null;
          }
        })
      );

      // Filter out null values
      const validEmails = emails.filter(e => e !== null);

      // Log activity
      await LoggingService.logActivity(userId, 'EMAIL_FETCH', {
        count: validEmails.length
      });

      return validEmails;
    } catch (error) {
      throw new Error(`Failed to fetch emails: ${error.message}`);
    }
  }

  /**
   * Create a draft reply
   */
  static async createDraft(userId, emailId, replyContent) {
    try {
      const tokens = await this.getTokens(userId);
      const oauth2 = getOAuth2Client();

      oauth2.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2 });

      // Get original email
      const { data: originalMsg } = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });

      const originalEmail = this._parseEmail(originalMsg);

      // Build reply message
      const replySubject = originalEmail.subject.startsWith('Re:')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;

      // Extract email address from "Name <email@domain.com>" format
      const toEmail = originalEmail.from.match(/<([^>]+)>/)
        ? originalEmail.from.match(/<([^>]+)>/)[1]
        : originalEmail.from.split('<')[0].trim();

      // Create raw message
      const rawMessage = this._createRawMessage({
        to: toEmail,
        subject: replySubject,
        body: replyContent,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.references
      });

      // Create draft
      const { data: draft } = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: Buffer.from(rawMessage).toString('base64')
          }
        }
      });

      // Log activity
      await LoggingService.logActivity(userId, 'DRAFT_CREATE', {
        emailId,
        draftId: draft.id
      });

      return draft.id;
    } catch (error) {
      throw new Error(`Failed to create draft: ${error.message}`);
    }
  }

  /**
   * Disconnect Gmail (revoke tokens)
   */
  static async disconnect(userId) {
    try {
      // Remove tokens
      await StorageService.delete('gmail_tokens.json', { userId });

      // Update user record
      await StorageService.update('users.json', { id: userId }, { gmailConnected: false });

      // Log activity
      await LoggingService.logActivity(userId, 'GMAIL_DISCONNECT');

      return true;
    } catch (error) {
      throw new Error(`Failed to disconnect Gmail: ${error.message}`);
    }
  }

  /**
   * Parse email message from Gmail API response
   */
  static _parseEmail(message) {
    const headers = message.payload.headers || [];

    const getHeader = (name) => {
      const header = headers.find(h => h.name === name);
      return header ? header.value : '';
    };

    const subject = getHeader('Subject') || '(No Subject)';
    const from = getHeader('From') || '';
    const to = getHeader('To') || '';
    const date = getHeader('Date') || '';
    const messageId = getHeader('Message-ID') || '';
    const references = getHeader('References') || '';

    // Extract body
    let body = '';
    if (message.payload.body && message.payload.body.data) {
      try {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } catch (error) {
        console.error('Failed to decode message body:', error);
      }
    } else if (message.payload.parts) {
      // Multipart message - find text/plain part
      const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart && textPart.body && textPart.body.data) {
        try {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        } catch (error) {
          console.error('Failed to decode body part:', error);
        }
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      to,
      date,
      body: body.substring(0, 1000), // Limit to 1000 chars
      snippet: message.snippet || '',
      messageId,
      references
    };
  }

  /**
   * Create RFC 2822 formatted raw message
   */
  static _createRawMessage({ to, subject, body, inReplyTo, references }) {
    const timestamp = new Date().toUTCString();

    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `MIME-Version: 1.0`,
      `In-Reply-To: ${inReplyTo || ''}`,
      `References: ${references || ''}`,
      `Date: ${timestamp}`,
      ''
    ];

    return headers.join('\r\n') + '\r\n' + body;
  }
}

export default GmailService;
