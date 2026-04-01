# Email Assistant - Deployment Guide

This guide provides step-by-step instructions for deploying the Email Assistant to various platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Setup](#github-setup)
3. [Platform-Specific Deployment](#platform-specific-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **GitHub Account**: For code hosting and CI/CD
- **Hosting Account**: Render, Railway, Vercel, or similar
- **Google Cloud Project**: For OAuth credentials
- **Groq API Key**: For AI functionality
- **Domain Name** (Optional): For custom domain

---

## GitHub Setup

### 1. Initialize Git Repository

```bash
cd email-assistant
git init
git add .
git commit -m "Initial commit: Email Assistant"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create new repository: `email-assistant`
3. Add as remote:

```bash
git remote add origin https://github.com/yourusername/email-assistant.git
git branch -M main
git push -u origin main
```

### 3. Set Up GitHub Secrets

For CI/CD and deployments, add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

```
GOOGLE_CLIENT_ID=your_value
GOOGLE_CLIENT_SECRET=your_value
GOOGLE_REDIRECT_URI=your_deployment_url/api/gmail/callback
JWT_SECRET=generate_new_value
ENCRYPTION_KEY=generate_new_value
GROQ_API_KEY=your_value
RENDER_DEPLOY_HOOK=your_render_webhook
RAILWAY_TOKEN=your_railway_token
```

---

## Platform-Specific Deployment

### Option 1: Render (Backend) + Vercel (Frontend)

#### Render Backend Deployment

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub

2. **Connect Repository**
   - Dashboard → New → Web Service
   - Connect GitHub repo
   - Select `email-assistant` repository

3. **Configure Service**
   ```
   Name: email-assistant-backend
   Runtime: Node
   Root Directory: backend
   Build Command: npm install
   Start Command: node server.js
   ```

4. **Add Environment Variables**
   - In Render dashboard, go to Environment
   - Add all variables from `.env.example`:
     - `NODE_ENV=production`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI`
     - `JWT_SECRET`
     - `ENCRYPTION_KEY`
     - `GROQ_API_KEY`
     - `FRONTEND_URL=https://your-vercel-app.vercel.app`

5. **Deploy**
   - Click Deploy
   - Wait for build to complete
   - Copy service URL (e.g., `https://email-assistant-backend.onrender.com`)

#### Vercel Frontend Deployment

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Project**
   - Add New → Project
   - Import `email-assistant` repository

3. **Configure Project**
   ```
   Framework: Other (Static)
   Root Directory: frontend
   Build Command: (leave empty)
   Install Command: (leave empty)
   ```

4. **Environment Variables**
   - Add `REACT_APP_API_URL=https://email-assistant-backend.onrender.com/api`

5. **Deploy**
   - Click Deploy
   - Get frontend URL (e.g., `https://email-assistant.vercel.app`)

#### Update Google OAuth Redirect URIs

1. Google Cloud Console
2. OAuth consent screen → Authorized redirect URIs
3. Add: `https://email-assistant-backend.onrender.com/api/gmail/callback`
4. Update `.env` in Render with `GOOGLE_REDIRECT_URI=https://email-assistant-backend.onrender.com/api/gmail/callback`
5. Update Vercel environment with frontend URL

---

### Option 2: Railway (Full Stack)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Dashboard → New Project
   - Choose "Deploy from GitHub repo"
   - Select `email-assistant`

3. **Set Up Service**
   - Create Node.js service:
   ```
   Root directory: backend
   Start command: node server.js
   Port: 3000
   ```

4. **Add Environment Variables**
   - Variables → Add all from `.env.example`

5. **Deploy**
   - Railway auto-deploys on push to main

---

### Option 3: Docker + Self-Hosted (VPS)

#### Prerequisites
- VPS with Ubuntu 20.04+
- Docker and Docker Compose installed
- Domain configured with DNS

#### Setup

1. **SSH into Server**
```bash
ssh user@your-vps-ip
```

2. **Clone Repository**
```bash
cd /home/user
git clone https://github.com/yourusername/email-assistant.git
cd email-assistant
```

3. **Create .env File**
```bash
cp .env.example .env
nano .env  # Edit with your values
```

4. **Start with Docker Compose**
```bash
docker-compose up -d
```

5. **Set Up Nginx Reverse Proxy**
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create `/etc/nginx/sites-available/email-assistant`:
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/email-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Enable HTTPS**
```bash
sudo certbot --nginx -d yourdomain.com
```

---

### Option 4: Heroku (Deprecated but still working)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create email-assistant

# Set environment variables
heroku config:set GOOGLE_CLIENT_ID=your_value
heroku config:set GOOGLE_CLIENT_SECRET=your_value
# ... set other variables

# Set buildpack
heroku buildpacks:set heroku/nodejs -a email-assistant
heroku config:set NPM_CONFIG_PRODUCTION=false

# Deploy
git push heroku main
```

---

## Environment Configuration

### Required Variables for Production

```env
# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.com/api/gmail/callback

# Security
JWT_SECRET=your_strong_jwt_secret_256_bits
ENCRYPTION_KEY=your_256_bit_hex_encryption_key

# AI
GROQ_API_KEY=your_groq_api_key

# Optional: Database
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### Generate Secure Keys

```bash
# Generate JWT_SECRET (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (256-bit hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Test health endpoint
curl https://your-api-url/api/health

# Test signup
curl -X POST https://your-api-url/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### 2. SSL Certificate

Ensure HTTPS is enabled on all deployments:
- Render: Automatic SSL
- Vercel: Automatic SSL
- Railway: Automatic SSL
- Self-hosted: Use Let's Encrypt with Certbot

### 3. Enable CORS

The backend should accept requests from your frontend domain:
```env
FRONTEND_URL=https://yourdomain.com
```

### 4. Monitor Logs

**Render:**
```bash
# View real-time logs
# Dashboard → Service → Logs
```

**Railway:**
```bash
# View logs in dashboard
# Project → Service → Logs
```

**Docker:**
```bash
docker-compose logs -f backend
```

### 5. Set Up Monitoring

- **Error Tracking**: Use Sentry
- **Performance**: Use New Relic or DataDog
- **Uptime**: Use UptimeRobot

---

## Troubleshooting

### "Gmail not connecting"

**Check:**
1. Verify OAuth redirect URI in Google Cloud Console
2. Ensure GOOGLE_CLIENT_ID and SECRET match
3. Check if scopes are correct in gmailService.js
4. Verify frontend is sending correct authorization requests

### "Token Refresh Failing"

**Check:**
1. ENCRYPTION_KEY matches across all instances
2. JWT_SECRET is consistent
3. Tokens stored properly in database/files

### "GROQ API Rate Limited"

**Solution:**
- Wait for rate limit to reset (30 requests/minute)
- Implement request queueing on client side
- Upgrade Groq plan for higher limits

### "Cold Start Issues" (Render Free Tier)

**Normal behavior:**
- First request after inactivity takes 15-30 seconds
- Add keep-alive ping every 14 minutes

### "500 Internal Server Error"

**Check:**
1. Backend logs for detailed error
2. Environment variables are set correctly
3. External APIs (Google, Groq) are reachable
4. Database/file storage has proper permissions

---

## Rollback Procedure

### Render Rollback

1. Dashboard → Service → Deploys
2. Click on previous deployment
3. Click "Redeploy"

### GitHub Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main
```

---

## Performance Optimization

### Frontend
- Enable gzip compression in Nginx
- Cache static assets (CSS, JS, images)
- Use CDN for assets

### Backend
- Enable response caching for emails
- Implement database indexing
- Use connection pooling
- Enable request compression

---

## Security Hardening

- [ ] Enable HTTPS everywhere
- [ ] Set secure CORS headers
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Regular security audits
- [ ] Update dependencies regularly
- [ ] Use environment secrets management
- [ ] Enable audit logging

---

## Maintenance

### Weekly
- Monitor error logs
- Check API performance metrics
- Review user feedback

### Monthly
- Update dependencies
- Review security advisories
- Backup data
- Performance optimization

### Quarterly
- Security audit
- Load testing
- Disaster recovery testing

---

## Support

For deployment issues:
1. Check logs for specific error
2. Review this guide's troubleshooting section
3. Check platform-specific documentation
4. Open GitHub issue with details

---

**Last Updated:** March 2025
**Version:** 1.0.0
