# Quick Start Guide - Email Assistant

## 🚀 Get Up and Running in 10 Minutes

This guide will walk you through setting up and testing the Email Assistant locally before deployment.

---

## Step 1: Get API Credentials (5 minutes)

### Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (name: "Email Assistant")
3. Enable these APIs:
   - Search for "Gmail API" → Click "Enable"
   - Search for "Google Generative AI API" → Click "Enable"

4. Create OAuth2 Credentials:
   - Go to "Credentials" (left sidebar)
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Desktop application"
   - Download JSON file
   - Copy: `Client ID` and `Client Secret`

5. Configure consent screen:
   - Go to "OAuth consent screen"
   - Choose "External" user type
   - Fill in app name: "Email Assistant"
   - Add test user email (your email)
   - Click "Save and Continue"

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key

---

## Step 2: Configure Backend (2 minutes)

1. Create `.env` file in `backend/` folder:

```env
NODE_ENV=development
PORT=3000

# Replace these with your actual values
JWT_SECRET=your-super-secret-256-bit-string-here-at-least-32-chars-long
ENCRYPTION_KEY=another-256-bit-string-for-encryption-at-least-32-chars-long

# From Google Cloud Console
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# From Google AI Studio
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Admin account (create your own)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD_HASH=$2b$12$R9h7cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ee4GVH3w06XYZmCG

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

**Generate secure secrets in terminal:**
```bash
# Go to backend folder
cd backend

# Generate JWT_SECRET (256-bit random)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (256-bit random)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate bcrypt hash for admin password
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-secure-password', 12, (err, hash) => console.log('ADMIN_PASSWORD_HASH=' + hash))"
```

---

## Step 3: Start the Backend (30 seconds)

```bash
cd backend
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║   Email Assistant Server               ║
║   Running on port 3000                 ║
║   Environment: development            ║
╚════════════════════════════════════════╝
Health check: http://localhost:3000/api/health
```

✅ Backend is running!

---

## Step 4: Start the Frontend (1 minute)

**Option A: Simple Python Server (Recommended)**

```bash
cd frontend/public
python -m http.server 3001
# OR if Python 2:
python -m SimpleHTTPServer 3001
```

**Option B: Node.js HTTP Server**

```bash
cd frontend/public
npx http-server -p 3001
```

Now open: **http://localhost:3001**

You should see the landing page! ✅

---

## Step 5: Test the Application (2 minutes)

### Create Test Account

1. Click **"Get Started Free"**
2. Sign up with:
   - Email: `test@example.com`
   - Password: `TestPassword123` (must have uppercase, lowercase, number)
3. Click **"Create Account"**
4. You're logged in! 🎉

### Connect Gmail

1. Click **"Connect Gmail"** button
2. Choose your Google account
3. Click "Allow" to grant permissions
4. You'll be redirected back to dashboard
5. Check: Gmail status should now show **"✅ Connected"**

### Generate an Email Reply

1. You should see a list of your unread emails
2. Click **"✨ Generate Reply"** on any email
3. Watch as AI generates a professional reply
4. Click **"Save as Draft"**
5. Check your Gmail - the draft should be there! 📧

### Try Admin Panel

1. Open: **http://localhost:3001/admin.html**
2. You'll see: "Admin access required" (because you're not an admin)
3. That's expected! ✅

---

## Step 6: Test Backend API (Optional)

Test the health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-03-30T16:11:02.096Z",
  "uptime": 59.4
}
```

Test user signup:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"TestPassword123"}'
```

Should return JWT token and user data ✅

---

## 🎉 You're All Set!

Your Email Assistant is now running locally with all features:

- ✅ User authentication (signup/login)
- ✅ Gmail integration (OAuth2)
- ✅ Email fetching from Gmail
- ✅ AI reply generation (Gemini)
- ✅ Draft creation in Gmail
- ✅ User dashboard
- ✅ Admin panel (when admin account is created)

---

## 📋 Common Issues & Solutions

### "Failed to connect to Gmail"
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Make sure Gmail API is enabled in Google Cloud Console
- Verify `GOOGLE_REDIRECT_URI` matches Google Console settings

### "Gemini API not working"
- Verify `GEMINI_API_KEY` is correct
- Make sure Google Generative AI API is enabled
- Check rate limits (60 requests/minute)

### "Backend not running"
- Make sure you're in `backend/` folder
- Run `npm install` first
- Check port 3000 isn't already in use
- Look at error message in console

### "Frontend not loading"
- Make sure frontend server is running on port 3001
- Check browser console for errors (F12)
- Clear browser cache (Ctrl+Shift+Delete)
- Try different port: `python -m http.server 3002`

### "Cannot save as draft"
- Gmail must be connected
- You need an unread email to reply to
- Check backend logs for errors
- Make sure Gmail API has "modify" scope

---

## 🚀 Next: Deploy to Production

Once everything works locally, follow the **README.md** for deployment to:
- **Backend:** Render (free tier)
- **Frontend:** Vercel (free tier)

See README.md sections:
- "Deploying Backend to Render"
- "Deploying Frontend to Vercel"

---

## 📚 File Reference

Key files you might need to modify:

- **Backend API configuration**: `backend/server.js`
- **Frontend API URL**: `frontend/public/js/api.js`
  - Change `API_URL` for production
- **Gmail settings**: `backend/services/gmailService.js`
- **AI settings**: `backend/services/geminiService.js`
- **Styling**: Any `frontend/public/css/*.css` files

---

## 🆘 Need Help?

1. Check README.md for detailed documentation
2. Look at console errors (browser F12 and backend terminal)
3. Verify all `.env` variables are set correctly
4. Test each component individually:
   - Health check: `curl http://localhost:3000/api/health`
   - Signup: Use the signup form
   - Gmail: Check redirect works

---

**You're ready to go! 🎊**

Start using the Email Assistant and enjoy faster email replies! ✨
