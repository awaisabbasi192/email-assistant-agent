import StorageService from './storageService.js';

class LoggingService {
  /**
   * Log user activity
   */
  static async logActivity(userId, action, metadata = {}) {
    try {
      const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        timestamp: new Date().toISOString(),
        metadata
      };

      await StorageService.append('activity_logs.json', logEntry);
      return logEntry;
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging shouldn't crash the main operation
    }
  }

  /**
   * Log API usage
   */
  static async logApiUsage(userId, apiType, count = 1) {
    try {
      const date = new Date().toISOString().split('T')[0];

      // Find existing entry for today
      const data = await StorageService.read('api_usage.json');
      const existingEntry = data.usage.find(u => u.userId === userId && u.date === date);

      if (existingEntry) {
        // Update existing entry
        if (apiType === 'gmail') {
          existingEntry.gmailApiCalls = (existingEntry.gmailApiCalls || 0) + count;
        } else if (apiType === 'gemini') {
          existingEntry.geminiApiCalls = (existingEntry.geminiApiCalls || 0) + count;
        }
        await StorageService.write('api_usage.json', data);
      } else {
        // Create new entry
        const newEntry = {
          userId,
          date,
          gmailApiCalls: apiType === 'gmail' ? count : 0,
          geminiApiCalls: apiType === 'gemini' ? count : 0,
          tokensUsed: 0,
          draftsCreated: 0,
          errors: 0
        };
        await StorageService.append('api_usage.json', newEntry);
      }
    } catch (error) {
      console.error('Failed to log API usage:', error);
    }
  }

  /**
   * Log error
   */
  static async logError(error, context = {}) {
    try {
      const logEntry = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        context
      };

      // Store in separate structure (could enhance to separate file)
      console.error('Error logged:', logEntry);
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }

  /**
   * Get activity logs with filtering
   */
  static async getActivityLogs(filters = {}, limit = 100, skip = 0) {
    try {
      const logs = await StorageService.find('activity_logs.json', filters);

      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      return logs.slice(skip, skip + limit);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      return [];
    }
  }

  /**
   * Get API usage for a user
   */
  static async getUserApiUsage(userId, days = 30) {
    try {
      const allUsage = await StorageService.find('api_usage.json', { userId });

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return allUsage.filter(u => new Date(u.date) >= cutoffDate);
    } catch (error) {
      console.error('Failed to fetch API usage:', error);
      return [];
    }
  }

  /**
   * Get total stats
   */
  static async getStats() {
    try {
      const users = await StorageService.read('users.json');
      const logs = await StorageService.read('activity_logs.json');
      const usage = await StorageService.read('api_usage.json');

      const totalUsers = users.users.length;
      const gmailConnected = users.users.filter(u => u.gmailConnected).length;
      const totalLogins = logs.logs.filter(l => l.action === 'LOGIN').length;
      const totalDrafts = logs.logs.filter(l => l.action === 'DRAFT_CREATE').length;

      // Calculate API usage for today
      const today = new Date().toISOString().split('T')[0];
      const todayUsage = usage.usage.filter(u => u.date === today);
      const totalGmailCalls = todayUsage.reduce((sum, u) => sum + (u.gmailApiCalls || 0), 0);
      const totalGeminiCalls = todayUsage.reduce((sum, u) => sum + (u.geminiApiCalls || 0), 0);

      return {
        totalUsers,
        gmailConnected,
        totalLogins,
        totalDrafts,
        todayGmailCalls: totalGmailCalls,
        todayGeminiCalls: totalGeminiCalls,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalUsers: 0,
        gmailConnected: 0,
        totalLogins: 0,
        totalDrafts: 0,
        todayGmailCalls: 0,
        todayGeminiCalls: 0
      };
    }
  }

  /**
   * Clear old logs (older than X days)
   */
  static async clearOldLogs(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const logs = await StorageService.read('activity_logs.json');
      logs.logs = logs.logs.filter(l => new Date(l.timestamp) >= cutoffDate);

      await StorageService.write('activity_logs.json', logs);
    } catch (error) {
      console.error('Failed to clear old logs:', error);
    }
  }
}

export default LoggingService;
