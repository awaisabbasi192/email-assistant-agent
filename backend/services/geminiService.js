import { GoogleGenerativeAI } from '@google/generative-ai';
import StorageService from './storageService.js';
import LoggingService from './loggingService.js';

const MODEL_NAME = 'gemini-pro';
const RATE_LIMIT_PER_MINUTE = 60; // Free tier limit

let genAI = null;

/**
 * Initialize Gemini API
 */
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

class GeminiService {
  /**
   * Generate email reply using Gemini AI
   */
  static async generateReply(emailData, options = {}) {
    try {
      // Check rate limits
      const withinRateLimit = await this._checkRateLimit();
      if (!withinRateLimit) {
        throw new Error(
          'Rate limit exceeded. Please try again in a moment. (60 requests per minute)'
        );
      }

      // Build prompt
      const { subject, from, body } = emailData;
      const tone = options.tone || 'professional';

      const prompt = this._buildPrompt(subject, from, body, tone);

      // Call Gemini API
      const genai = getGenAI();
      const model = genai.getGenerativeModel({ model: MODEL_NAME });

      const result = await model.generateContent(prompt);
      const reply = result.response.text().trim();

      // Log usage
      await LoggingService.logApiUsage('global', 'gemini', 1);

      // Record rate limit hit
      await this._recordRequest();

      return reply;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate reply: ${error.message}`);
    }
  }

  /**
   * Generate multiple reply options
   */
  static async generateReplyOptions(emailData, count = 3) {
    try {
      const genai = getGenAI();
      const model = genai.getGenerativeModel({ model: MODEL_NAME });

      const { subject, from, body } = emailData;

      const prompt = `I need ${count} different professional email reply options for this email.

Original Email:
Subject: ${subject}
From: ${from}
Body: ${body}

Generate ${count} different reply options with varying tone:
1. Formal/Professional
2. Friendly/Warm
3. Concise/Direct

Format your response as:
Option 1 (Formal):
[reply text]

Option 2 (Friendly):
[reply text]

Option 3 (Concise):
[reply text]`;

      const result = await model.generateContent(prompt);
      const responses = result.response.text().trim().split('\n\n');

      // Parse responses
      const options = [];
      responses.forEach((option) => {
        if (option.trim()) {
          options.push(option.trim());
        }
      });

      // Log usage
      await LoggingService.logApiUsage('global', 'gemini', 1);

      return options.slice(0, count);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate reply options: ${error.message}`);
    }
  }

  /**
   * Check if request is within rate limit
   */
  static async _checkRateLimit() {
    try {
      const data = await StorageService.read('api_usage.json');

      // Get current minute timestamp
      const now = new Date();
      const currentMinute = new Date(now.getTime() - (now.getTime() % 60000));

      // Count requests in current minute
      const recentRequests = data.globalRateLimits.geminiLastMinute.filter((ts) => {
        const requestTime = new Date(ts.timestamp);
        return requestTime >= currentMinute;
      });

      return recentRequests.length < RATE_LIMIT_PER_MINUTE;
    } catch (error) {
      // If error, allow request (fail open)
      console.error('Rate limit check error:', error);
      return true;
    }
  }

  /**
   * Record API request for rate limiting
   */
  static async _recordRequest() {
    try {
      const data = await StorageService.read('api_usage.json');

      // Add current timestamp
      data.globalRateLimits.geminiLastMinute.push({
        timestamp: new Date().toISOString()
      });

      // Clean up old entries (older than 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      data.globalRateLimits.geminiLastMinute = data.globalRateLimits.geminiLastMinute.filter(
        (entry) => new Date(entry.timestamp) > oneMinuteAgo
      );

      await StorageService.write('api_usage.json', data);
    } catch (error) {
      console.error('Failed to record request:', error);
      // Don't throw - rate limiting shouldn't break the operation
    }
  }

  /**
   * Build system and user prompt
   */
  static _buildPrompt(subject, from, body, tone = 'professional') {
    const systemPrompt = `You are a professional email assistant. Your job is to generate concise, polite, and contextually appropriate email replies.

Guidelines:
- Keep replies brief (2-4 sentences for short emails, 3-6 for longer ones)
- Match the tone of the original email
- Address the main points
- Use appropriate greeting (Hi/Hello/Dear)
- Use appropriate closing (Best regards/Sincerely/Thanks)
- Never make commitments without user approval
- If uncertain, draft a neutral, helpful response
- Do NOT include subject line, greeting, or signature - ONLY the body text`;

    const toneInstructions = {
      professional: 'Use a formal, professional tone.',
      friendly: 'Use a warm, friendly tone.',
      concise: 'Keep it very brief and to the point (1-2 sentences).',
      formal: 'Use a very formal, business-like tone.'
    };

    const userPrompt = `Original Email:
Subject: ${subject}
From: ${from}
Body:
${body}

${toneInstructions[tone] || toneInstructions.professional}

Generate a reply to this email. ONLY provide the email body text, without any greeting, signature, or subject line.`;

    return userPrompt;
  }

  /**
   * Validate email content
   */
  static validateEmailContent(emailData) {
    if (!emailData.subject || !emailData.from || !emailData.body) {
      return { valid: false, error: 'Missing required email fields' };
    }

    if (emailData.body.length < 10) {
      return { valid: false, error: 'Email body too short' };
    }

    if (emailData.body.length > 5000) {
      return { valid: false, error: 'Email body too long' };
    }

    return { valid: true };
  }
}

export default GeminiService;
