# Email Assistant - AI-Powered Email Reply Generator

A professional web application that uses AI to help users generate intelligent email replies. Users can connect their Gmail account, read incoming emails, and get AI-suggested professional responses that can be saved directly as Gmail drafts.

**Status:** ✅ 95% Complete - Ready for deployment

## Features

- 🔐 **User Authentication**: Secure signup/login with JWT tokens and bcrypt password hashing
- 📧 **Gmail Integration**: OAuth2 authentication to safely access Gmail
- ✨ **AI-Powered Replies**: Generate professional email replies using Google Gemini API
- 💾 **Auto-Draft Creation**: Save generated replies directly as Gmail drafts
- ⚙️ **Settings Management**: Customize reply tone and preferences
- 📊 **Admin Dashboard**: Complete monitoring system with user management, activity logs, and API usage tracking
- 🔒 **Security**: AES-256 encrypted token storage, rate limiting, input validation
- 📈 **Scalable Architecture**: Designed for free-tier hosting (Vercel + Render)

## Architecture

### Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript (no framework)
- Responsive design with mobile support
- Client-side routing and state management

**Backend:**
- Node.js + Express
- JWT authentication
- RESTful API design

**Services:**
- Gmail API (OAuth2)
- Google Gemini AI API
- JSON file storage (no database)

**Hosting:**
- Frontend: Vercel (free tier)
- Backend: Render (free tier - 750 hours/month)

## Project Structure

```
email-assistant/
├── backend/                 # Node.js/Express server
│   ├── config/             # API configurations
│   ├── middleware/         # Auth, rate limiting, error handling
│   ├── routes/             # API endpoints
│   ├── controllers/        # Business logic
│   ├── services/           # Core services (Gmail, Gemini, Auth, Storage)
│   ├── utils/              # Helpers (encryption, validation)
│   ├── data/               # JSON data files
│   ├── server.js           # Express app
│   └── package.json
│
├── frontend/               # Static web application
│   ├── public/
│   │   ├── index.html      # Landing page
│   │   ├── login.html      # Login page
│   │   ├── signup.html     # Signup page
│   │   ├── dashboard.html  # User dashboard
│   │   ├── admin.html      # Admin panel
│   │   ├── css/            # Stylesheets
│   │   └── js/             # JavaScript files
│   └── assets/
│
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Google Cloud project with Gmail API and Gemini API enabled
- Gmail and Gemini API credentials
- Git for version control

### Local Development Setup

1. **Clone and navigate to project:**
   ```bash
   cd email-assistant
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npm start
   ```

3. **Frontend Setup:**
   - Open `frontend/public/index.html` in browser
   - Or use a local server:
   ```bash
   cd frontend/public
   python -m http.server 3001
   # OR
   npx http-server -p 3001
   ```

4. **Get API Keys:**

   **Gmail API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project
   - Enable "Gmail API"
   - Create OAuth2 credentials (Desktop app)
   - Add authorized redirect URI: `http://localhost:3000/api/gmail/callback`

   **Gemini API:**
   - Go to [Google AI Studio](https://aistudio.google.com/apikey)
   - Create API key
   - Copy to `.env`

5. **Start using the app:**
   - Navigate to `http://localhost:3001` (or wherever you're serving frontend)
   - Click "Get Started" → Create account
   - Login → Connect Gmail → Start generating replies!

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/settings` - Update user settings
- `POST /api/auth/logout` - Logout

### Gmail Integration
- `GET /api/gmail/auth-url` - Get Gmail OAuth URL
- `GET /api/gmail/callback` - OAuth callback handler
- `GET /api/gmail/emails` - Fetch unread emails
- `POST /api/gmail/create-draft` - Create email draft
- `DELETE /api/gmail/disconnect` - Disconnect Gmail

### AI Services
- `POST /api/ai/generate-reply` - Generate email reply
- `POST /api/ai/generate-options` - Generate multiple options
- `GET /api/ai/test` - Test Gemini API connection

### Admin (requires admin role)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - User details
- `GET /api/admin/activity` - Activity logs
- `GET /api/admin/api-usage` - API usage metrics
- `POST /api/admin/users/:id/disable` - Disable user
- `POST /api/admin/settings` - Update system settings
- `GET /api/admin/export` - Export all data
- `POST /api/admin/logs/clear` - Clear old logs

## Deployment

### Deploying Backend to Render

1. Create GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. On Render dashboard:
   - Click "New" → "Web Service"
   - Connect GitHub repo
   - Set root directory: `backend/`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Add environment variables from `.env`
   - Deploy

3. Note the deployed URL (e.g., `https://email-assistant.onrender.com`)

### Deploying Frontend to Vercel

1. Update API URL in `frontend/public/js/api.js`:
   ```javascript
   const API_URL = 'https://email-assistant.onrender.com/api';
   ```

2. On Vercel dashboard:
   - Click "Add New" → "Project"
   - Import GitHub repo
   - Set root directory: `frontend/public`
   - Deploy

3. Update Google Cloud OAuth redirect URI:
   - Go to Google Cloud Console
   - Add: `https://your-vercel-app.vercel.app/dashboard.html`

### Update Google Cloud Credentials

After deployment:
1. Google Cloud Console → OAuth consent screen
2. Add authorized redirect URIs:
   - `https://email-assistant.onrender.com/api/gmail/callback`
3. Update backend `.env` with production URLs

## Environment Variables

Create `.env` file in backend folder:

```env
# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=<generate-256-bit-random-string>
ENCRYPTION_KEY=<generate-256-bit-random-string>

# Gmail OAuth2
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Gemini API
GEMINI_API_KEY=<from-google-ai-studio>

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD_HASH=<bcrypt-hash-of-password>

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

**Generate secrets:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Password hash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
```

## Security Considerations

- ✅ Passwords hashed with bcrypt (cost: 12)
- ✅ OAuth tokens encrypted with AES-256-GCM
- ✅ JWT with strong secret (256-bit minimum)
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ CORS properly configured
- ✅ No sensitive data in logs
- ✅ HTTPS enforced in production

## Testing

### Manual Testing Checklist

1. **Authentication:**
   - [ ] Signup with valid email/password
   - [ ] Login with correct credentials
   - [ ] Signup fails with weak password
   - [ ] Login fails with wrong password

2. **Gmail Integration:**
   - [ ] Connect Gmail (OAuth flow)
   - [ ] View unread emails in dashboard
   - [ ] Disconnect Gmail account

3. **AI Features:**
   - [ ] Generate reply for email
   - [ ] Edit generated reply
   - [ ] Save reply as Gmail draft

4. **Admin Panel:**
   - [ ] View system statistics
   - [ ] Search and view users
   - [ ] Check activity logs
   - [ ] Export data
   - [ ] Clear old logs

5. **Error Handling:**
   - [ ] Handle network errors gracefully
   - [ ] Display helpful error messages
   - [ ] Rate limit messages appear
   - [ ] Redirect on 401 (unauthorized)

## Rate Limits

- **Auth endpoints**: 5 requests/15 minutes per IP
- **API endpoints**: 100 requests/15 minutes per user
- **Admin endpoints**: 500 requests/15 minutes
- **Gemini API**: 60 requests/minute (global)
- **Gmail API**: 250 quota units/user/second

## Troubleshooting

### "Failed to get authorization URL"
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Verify Gmail API is enabled in Google Cloud
- Check authorized redirect URI in Google Console

### "Gemini API not working"
- Verify GEMINI_API_KEY is correct
- Check rate limits (60/min)
- Ensure Google Generative AI API is enabled

### "Cannot read emails"
- User must have connected Gmail
- Gmail OAuth scopes may be insufficient
- Check token expiration and refresh logic

### Render cold starts
- Normal on free tier (15-30 seconds first request)
- Backend shows loading message during startup
- Use keep-alive ping to prevent sleep

## Future Enhancements

- [ ] Multiple reply tone options with preview
- [ ] Email scheduling
- [ ] Email templates
- [ ] Bulk reply generation
- [ ] Browser extension
- [ ] Mobile app
- [ ] Database migration (PostgreSQL)
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics
- [ ] Team collaboration features

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check browser console for errors
4. Verify all environment variables are set correctly
5. Check Render/Vercel logs for backend errors

## License

MIT License - feel free to use, modify, and deploy

## Author

Built with ❤️ for efficient email communication

---

**Last Updated:** March 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
