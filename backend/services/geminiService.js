import StorageService from './storageService.js';
import LoggingService from './loggingService.js';

const MODEL_NAME = 'llama-3.3-70b-versatile'; // Latest Llama model
const RATE_LIMIT_PER_MINUTE = 30; // Groq free tier
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Get Groq API Key
 */
function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not set in environment variables');
  }
  return apiKey;
}

class GeminiService {
  /**
   * Generate email reply using Groq AI
   */
  static async generateReply(emailData, options = {}) {
    try {
      // Check rate limits
      const withinRateLimit = await this._checkRateLimit();
      if (!withinRateLimit) {
        throw new Error(
          'Rate limit exceeded. Please try again in a moment. (30 requests per minute)'
        );
      }

      // Build prompt
      const { subject, from, body } = emailData;
      const tone = options.tone || 'professional';

      const prompt = this._buildPrompt(subject, from, body, tone);

      // Call Groq API
      const apiKey = getGroqApiKey();
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const reply = data.choices[0]?.message?.content || '';

      // Log usage
      await LoggingService.logApiUsage('global', 'groq', 1);

      // Record rate limit hit
      await this._recordRequest();

      return reply.trim();
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error(`Failed to generate reply: ${error.message}`);
    }
  }

  /**
   * Generate multiple reply options
   */
  static async generateReplyOptions(emailData, count = 3) {
    try {
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

      const apiKey = getGroqApiKey();
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const fullResponse = data.choices[0]?.message?.content || '';
      const responses = fullResponse.trim().split('\n\n');

      // Parse responses
      const options = [];
      responses.forEach((option) => {
        if (option.trim()) {
          options.push(option.trim());
        }
      });

      // Log usage
      await LoggingService.logApiUsage('global', 'groq', 1);

      return options.slice(0, count);
    } catch (error) {
      console.error('Groq API error:', error);
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
      const recentRequests = data.globalRateLimits.groqLastMinute.filter((ts) => {
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

      // Initialize if doesn't exist
      if (!data.globalRateLimits.groqLastMinute) {
        data.globalRateLimits.groqLastMinute = [];
      }

      // Add current timestamp
      data.globalRateLimits.groqLastMinute.push({
        timestamp: new Date().toISOString()
      });

      // Clean up old entries (older than 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      data.globalRateLimits.groqLastMinute = data.globalRateLimits.groqLastMinute.filter(
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

Guidelines:
- Keep replies brief (2-4 sentences for short emails, 3-6 for longer ones)
- Match the tone of the original email
- Address the main points
- Use appropriate greeting (Hi/Hello/Dear)
- Use appropriate closing (Best regards/Sincerely/Thanks)
- Do NOT include subject line, greeting, or signature - ONLY the body text

Generate a reply to this email.`;

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
