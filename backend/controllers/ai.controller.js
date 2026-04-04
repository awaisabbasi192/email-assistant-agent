import GeminiService from '../services/geminiService.js';
import LoggingService from '../services/loggingService.js';

/**
 * Generate email reply
 */
export const generateReply = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { subject, from, body, tone, customTone } = req.body;

    // Validate input
    if (!subject || !from || !body) {
      return res.status(400).json({
        error: 'Missing required fields: subject, from, body'
      });
    }

    // Validate email content
    const validation = GeminiService.validateEmailContent({ subject, from, body });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Generate reply
    const reply = await GeminiService.generateReply(
      { subject, from, body },
      {
        tone: tone || 'professional',
        customTone: customTone || null
      }
    );

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'AI_REPLY_GENERATE', {
      subjectLength: subject.length,
      bodyLength: body.length
    });

    res.json({ reply });
  } catch (error) {
    console.error('Generate reply error:', error);

    // Handle rate limit error
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: error.message
      });
    }

    res.status(500).json({ error: 'Failed to generate reply' });
  }
};

/**
 * Generate multiple reply options
 */
export const generateReplyOptions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { subject, from, body, count } = req.body;

    // Validate input
    if (!subject || !from || !body) {
      return res.status(400).json({
        error: 'Missing required fields: subject, from, body'
      });
    }

    // Validate email content
    const validation = GeminiService.validateEmailContent({ subject, from, body });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Generate options
    const options = await GeminiService.generateReplyOptions(
      { subject, from, body },
      Math.min(count || 3, 5)
    );

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'AI_REPLY_OPTIONS', {
      count: options.length
    });

    res.json({ options });
  } catch (error) {
    console.error('Generate reply options error:', error);

    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: error.message
      });
    }

    res.status(500).json({ error: 'Failed to generate reply options' });
  }
};

/**
 * Test Gemini API connection
 */
export const testConnection = async (req, res) => {
  try {
    // Test with a simple prompt
    const reply = await GeminiService.generateReply(
      {
        subject: 'Test',
        from: 'test@example.com',
        body: 'This is a test email.'
      },
      { tone: 'professional' }
    );

    res.json({
      status: 'ok',
      message: 'Gemini API is working',
      sampleReply: reply.substring(0, 100) + '...'
    });
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Gemini API is not working',
      error: error.message
    });
  }
};
