// Global API Configuration
// Backend URL - update this to change where API calls go

// TEMPORARY: Use localhost backend for testing
// Change this to your production backend URL
const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://email-assistant-agent-production.up.railway.app';

const API_URL = BACKEND_URL + '/api';
