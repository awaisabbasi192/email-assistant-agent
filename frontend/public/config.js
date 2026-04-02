// Global API Configuration
// Use environment variable NEXT_PUBLIC_API_URL from Vercel

const API_URL = typeof window !== 'undefined' && window.NEXT_PUBLIC_API_URL
  ? window.NEXT_PUBLIC_API_URL
  : (window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://email-assistant-agent-production.up.railway.app/api');
