// Global API Configuration
// This file configures the backend API URL based on environment

window.API_CONFIG = {
  // Determine backend URL based on frontend origin
  getBackendUrl: function() {
    if (window.location.hostname === 'localhost') {
      // Local development
      return 'http://localhost:3000';
    }

    // Production - use the new Vercel-deployed backend
    // For now, Railway backend - but can be updated to any URL
    return 'https://email-assistant-agent-production.up.railway.app';
  },

  // Get full API endpoint
  getApiUrl: function() {
    return this.getBackendUrl() + '/api';
  }
};

// Set API_URL globally for backward compatibility
if (typeof API_URL === 'undefined') {
  var API_URL = window.API_CONFIG.getApiUrl();
}
