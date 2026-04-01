import StorageService from '../services/storageService.js';
import LoggingService from '../services/loggingService.js';
import AuthService from '../services/authService.js';

/**
 * Get system statistics
 */
export const getStats = async (req, res) => {
  try {
    const stats = await LoggingService.getStats();

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

/**
 * Get all users
 */
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const data = await StorageService.read('users.json');

    // Filter by search term
    let users = data.users.filter((u) => {
      return (
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase())
      );
    });

    // Sort by creation date (newest first)
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = users.length;
    const skip = (page - 1) * limit;
    users = users.slice(skip, skip + limit);

    // Remove sensitive data
    users = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      gmailConnected: u.gmailConnected,
      createdAt: u.createdAt
    }));

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user details
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await StorageService.findOne('users.json', { id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's activity logs
    const activityLogs = await LoggingService.getActivityLogs({ userId }, 50);

    // Get user's API usage
    const apiUsage = await LoggingService.getUserApiUsage(userId, 30);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        gmailConnected: user.gmailConnected,
        createdAt: user.createdAt,
        settings: user.settings
      },
      activityLogs,
      apiUsage
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

/**
 * Get activity logs
 */
export const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const action = req.query.action || '';
    const userId = req.query.userId || '';

    const data = await StorageService.read('activity_logs.json');

    // Filter logs
    let logs = data.logs;
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (userId) {
      logs = logs.filter((l) => l.userId === userId);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const total = logs.length;
    const skip = (page - 1) * limit;
    const paginatedLogs = logs.slice(skip, skip + limit);

    res.json({
      logs: paginatedLogs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

/**
 * Get API usage metrics
 */
export const getApiUsage = async (req, res) => {
  try {
    const data = await StorageService.read('api_usage.json');

    // Group by date
    const byDate = {};
    data.usage.forEach((entry) => {
      if (!byDate[entry.date]) {
        byDate[entry.date] = {
          date: entry.date,
          gmailApiCalls: 0,
          geminiApiCalls: 0,
          users: 0
        };
      }
      byDate[entry.date].gmailApiCalls += entry.gmailApiCalls || 0;
      byDate[entry.date].geminiApiCalls += entry.geminiApiCalls || 0;
      byDate[entry.date].users += 1;
    });

    // Sort by date
    const usage = Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate totals
    const totals = {
      totalGmailCalls: data.usage.reduce((sum, u) => sum + (u.gmailApiCalls || 0), 0),
      totalGeminiCalls: data.usage.reduce((sum, u) => sum + (u.geminiApiCalls || 0), 0),
      totalTokensUsed: data.usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0),
      totalDraftsCreated: data.usage.reduce((sum, u) => sum + (u.draftsCreated || 0), 0)
    };

    res.json({
      usage,
      totals,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get API usage error:', error);
    res.status(500).json({ error: 'Failed to fetch API usage' });
  }
};

/**
 * Disable user account
 */
export const disableUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await StorageService.findOne('users.json', { id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent disabling admin
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot disable admin user' });
    }

    // Update user status
    await StorageService.update('users.json', { id: userId }, { disabled: true });

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'USER_DISABLED', { targetUserId: userId });

    res.json({ message: 'User disabled successfully' });
  } catch (error) {
    console.error('Disable user error:', error);
    res.status(500).json({ error: 'Failed to disable user' });
  }
};

/**
 * Enable user account
 */
export const enableUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await StorageService.findOne('users.json', { id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user status
    await StorageService.update('users.json', { id: userId }, { disabled: false });

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'USER_ENABLED', { targetUserId: userId });

    res.json({ message: 'User enabled successfully' });
  } catch (error) {
    console.error('Enable user error:', error);
    res.status(500).json({ error: 'Failed to enable user' });
  }
};

/**
 * Reset user password
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'newPassword is required' });
    }

    const user = await StorageService.findOne('users.json', { id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const passwordHash = await AuthService.hashPassword(newPassword);

    // Update user
    await StorageService.update('users.json', { id: userId }, { passwordHash });

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'PASSWORD_RESET', { targetUserId: userId });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Update system settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { signupEnabled, maintenanceMode } = req.body;

    const data = await StorageService.read('admin_config.json');

    if (typeof signupEnabled === 'boolean') {
      data.settings.signupEnabled = signupEnabled;
    }

    if (typeof maintenanceMode === 'boolean') {
      data.settings.maintenanceMode = maintenanceMode;
    }

    await StorageService.write('admin_config.json', data);

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'SETTINGS_UPDATED', { settings: data.settings });

    res.json({ message: 'Settings updated successfully', settings: data.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

/**
 * Export all data (for backup)
 */
export const exportData = async (req, res) => {
  try {
    const users = await StorageService.read('users.json');
    const logs = await StorageService.read('activity_logs.json');
    const usage = await StorageService.read('api_usage.json');

    const exportData = {
      exportDate: new Date().toISOString(),
      totalUsers: users.users.length,
      totalLogs: logs.logs.length,
      users: users.users.map((u) => ({
        ...u,
        passwordHash: '[REDACTED]'
      })),
      activityLogs: logs.logs,
      apiUsage: usage.usage
    };

    // Send as JSON file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=email-assistant-backup.json');
    res.json(exportData);

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'DATA_EXPORTED');
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

/**
 * Clear old logs
 */
export const clearOldLogs = async (req, res) => {
  try {
    const { daysOld } = req.body;

    if (!daysOld || typeof daysOld !== 'number') {
      return res.status(400).json({ error: 'daysOld is required and must be a number' });
    }

    await LoggingService.clearOldLogs(daysOld);

    // Log activity
    await LoggingService.logActivity(req.user.userId, 'LOGS_CLEARED', { daysOld });

    res.json({ message: `Logs older than ${daysOld} days cleared` });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
};
