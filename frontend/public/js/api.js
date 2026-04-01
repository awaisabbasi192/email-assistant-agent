/**
 * API Client for Email Assistant
 * Handles all HTTP requests to the backend
 */

// Determine API URL based on environment
const API_URL = (() => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000/api';
  }
  // For production, use Railway backend
  return window.API_URL || 'https://email-assistant-agent-production.up.railway.app/api';
})();

// Set API_URL dynamically from window if available
if (typeof window !== 'undefined' && window.API_URL) {
  // API_URL already set above
}

/**
 * Make API call with automatic token handling
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      timeout: 30000
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      if (window.location.pathname !== '/login.html') {
        window.location.href = 'login.html';
      }
    }

    // Handle 429 - rate limited
    if (response.status === 429) {
      const data = await response.json();
      console.warn('Rate limited:', data);
    }

    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * Authentication API calls
 */
const authAPI = {
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  signup: async (email, password) => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  getProfile: async () => {
    return apiCall('/auth/me');
  },

  updateSettings: async (settings) => {
    return apiCall('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', { method: 'POST' });
  }
};

/**
 * Gmail API calls
 */
const gmailAPI = {
  getAuthUrl: async () => {
    return apiCall('/gmail/auth-url');
  },

  getEmails: async (maxResults = 10) => {
    return apiCall(`/gmail/emails?maxResults=${maxResults}`);
  },

  createDraft: async (emailId, content) => {
    return apiCall('/gmail/create-draft', {
      method: 'POST',
      body: JSON.stringify({ emailId, content })
    });
  },

  disconnect: async () => {
    return apiCall('/gmail/disconnect', { method: 'DELETE' });
  }
};

/**
 * AI API calls
 */
const aiAPI = {
  generateReply: async (emailData) => {
    return apiCall('/ai/generate-reply', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  },

  generateOptions: async (emailData, count = 3) => {
    return apiCall('/ai/generate-options', {
      method: 'POST',
      body: JSON.stringify({ ...emailData, count })
    });
  },

  testConnection: async () => {
    return apiCall('/ai/test');
  }
};

/**
 * Admin API calls
 */
const adminAPI = {
  getStats: async () => {
    return apiCall('/admin/stats');
  },

  getUsers: async (page = 1, limit = 20, search = '') => {
    const params = new URLSearchParams({ page, limit, search });
    return apiCall(`/admin/users?${params}`);
  },

  getUserDetails: async (userId) => {
    return apiCall(`/admin/users/${userId}`);
  },

  getActivityLogs: async (page = 1, limit = 50, action = '', userId = '') => {
    const params = new URLSearchParams({ page, limit, action, userId });
    return apiCall(`/admin/activity?${params}`);
  },

  getApiUsage: async () => {
    return apiCall('/admin/api-usage');
  },

  disableUser: async (userId) => {
    return apiCall(`/admin/users/${userId}/disable`, { method: 'POST' });
  },

  enableUser: async (userId) => {
    return apiCall(`/admin/users/${userId}/enable`, { method: 'POST' });
  },

  resetPassword: async (userId, newPassword) => {
    return apiCall(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  updateSettings: async (settings) => {
    return apiCall('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },

  exportData: async () => {
    return apiCall('/admin/export');
  },

  clearLogs: async (daysOld) => {
    return apiCall('/admin/logs/clear', {
      method: 'POST',
      body: JSON.stringify({ daysOld })
    });
  }
};

/**
 * Helper function to handle API responses
 */
async function handleAPIResponse(response) {
  try {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Response handling error:', error);
    throw error;
  }
}

/**
 * Check API health
 */
async function checkHealthy() {
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

