# Backend Deployment Guide

## Option 1: Deploy to Railway (Recommended - 3 minutes)

### Steps:

1. **Go to** https://railway.app
2. **Sign up/Login** with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. **Select** `awaisabbasi192/email-assistant-agent`
5. Railway will auto-detect the project

### Configure Railway:

Once deployed:

1. Go to **Settings** of the Railway project
2. Click **Environment Variables**
3. Add these variables:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=dd982137d220a519d236c0b0b4f4d42b5142f68e8fd4364bbc4554ee4fb44bba
ENCRYPTION_KEY=10a0f1fc5ae1b59efd0c399b8616fe23f2082fe5c5f4867183035c18ba766ae9
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://YOUR-RAILWAY-URL/api/gmail/callback
GEMINI_API_KEY=your-gemini-api-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2b$10$abcdefghijklmnopqrstuvwxyz
FRONTEND_URL=https://email-assistant-agent-8ueg.vercel.app
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Redeploy** after adding variables
5. Copy the **Railway URL** (will be like `https://xxx.railway.app`)

### Update Frontend:

Once you have the Railway backend URL, update `frontend/public/js/api.js`:

Line 12 - Change:
```javascript
return window.API_URL || '/api';
```

To:
```javascript
return window.API_URL || 'https://YOUR-RAILWAY-URL/api';
```

Then commit and push to redeploy Vercel frontend.

---

## Option 2: Run Locally (Development)

```bash
cd backend
npm install
node server.js
```

Backend will run on `http://localhost:3000`

---

## Option 3: Deploy to Render

Similar to Railway, connect GitHub repo at https://render.com

---

**After deployment, test the API:**
```bash
curl https://YOUR-BACKEND-URL/api/health
```

Should return `200 OK`
