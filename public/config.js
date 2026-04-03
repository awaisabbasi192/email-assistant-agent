// Global API Configuration
// Backend URL for API calls

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://email-assistant-agent-production.up.railway.app/api';
