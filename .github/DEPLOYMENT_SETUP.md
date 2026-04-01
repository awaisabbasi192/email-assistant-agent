# GitHub Actions Setup Guide

This guide helps you set up GitHub Actions secrets for automated deployment.

## Step 1: Generate Secure Secrets

Open your terminal and run these commands:

```bash
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Save these values** - you'll need them in the next step.

## Step 2: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add each secret:

### Required Secrets

| Secret Name | Value | Source |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.com/api/gmail/callback` | Your deployment URL |
| `JWT_SECRET` | Generated above | Generated above |
| `ENCRYPTION_KEY` | Generated above | Generated above |
| `GROQ_API_KEY` | Your Groq API Key | Groq Console |

### Optional Deployment Secrets

If deploying to Render:
```
RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxxxx?key=xxxxx
```

If deploying to Railway:
```
RAILWAY_TOKEN=your_railway_api_token
```

If deploying to AWS:
```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

## Step 3: Verify Workflows

1. Go to **Actions** tab in your repository
2. You should see two workflows:
   - `Test & Lint` - Runs on every push and PR
   - `Deploy to Production` - Runs on pushes to main/master

## Step 4: Test the Setup

```bash
# Make a small change and push
git add .
git commit -m "test: verify GitHub Actions"
git push origin main
```

Monitor the **Actions** tab to see workflows running.

## Workflow Behavior

### Test & Lint Workflow
- **Trigger**: Every push and pull request
- **Runs**: Linting, unit tests, security checks
- **Status**: Will show ✅ or ❌ on your commits

### Deploy Workflow
- **Trigger**: Push to main/master branch
- **Steps**:
  1. Builds Docker image
  2. Pushes to Docker registry
  3. Deploys to Render (optional)
  4. Deploys to Railway (optional)

## Troubleshooting

### Workflows Not Running
- Check repository Settings → Actions
- Ensure Actions is enabled
- Verify branch name (main or master)

### Deployment Failures
- Check workflow logs (Actions tab)
- Verify all required secrets are set
- Ensure deployment provider credentials are valid

### Permission Errors
- Check if GitHub Actions has permission to push Docker images
- Verify GITHUB_TOKEN is not restricted

## Local Testing Before Push

Test your changes locally before pushing:

```bash
# Install dependencies
cd backend && npm install

# Run linter
npm run lint --if-present

# Run tests
npm test --if-present

# Check for security issues
npm audit

# Build Docker image locally
docker build -t email-assistant:test .
```

## Need Help?

1. Check GitHub Actions logs: Actions tab → Click workflow → View logs
2. Review `.github/workflows/deploy.yml` and `.github/workflows/test.yml`
3. Check platform-specific documentation:
   - [Render Docs](https://render.com/docs)
   - [Railway Docs](https://docs.railway.app)
   - [GitHub Actions Docs](https://docs.github.com/en/actions)
