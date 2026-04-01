# Contributing to Email Assistant

Thank you for your interest in contributing! We welcome contributions from everyone. This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) to keep our community welcoming and inclusive.

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Git
- A GitHub account

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/email-assistant.git
   cd email-assistant
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/email-assistant.git
   ```

### Setup Development Environment

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..

# Copy environment template
cp .env.example backend/.env

# Edit with your local credentials
nano backend/.env
```

### Start Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
# Or use simple HTTP server
python -m http.server 3001
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Tests
- `chore/` - Maintenance

### 2. Make Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update relevant documentation

### 3. Test Your Changes

```bash
# Run linting
cd backend
npm run lint --if-present

# Run tests
npm test --if-present

# Manual testing checklist:
# [ ] Feature works locally
# [ ] No console errors
# [ ] API endpoints respond correctly
# [ ] Error handling works
# [ ] Responsive design (if UI changes)
```

### 4. Commit Changes

```bash
# Use clear, descriptive commit messages
git add .
git commit -m "feat: Add feature description"
```

**Commit message format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (no logic change)
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

**Example:**
```
feat: Add email filtering by sender

Implement ability to filter unread emails by sender address.
Users can now easily find emails from specific people.

Closes #123
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name
```

**On GitHub:**
1. Go to the repository
2. Click "Compare & pull request"
3. Fill in the PR description:
   - What changes were made
   - Why the changes were made
   - How to test the changes
   - Related issues (use `Closes #123`)

4. Wait for review

### 6. Address Review Feedback

- Review the comments
- Make requested changes
- Commit with clear messages
- Push updates
- Respond to comments

## Code Style Guidelines

### JavaScript

```javascript
// Use const by default, let if reassignment needed
const apiUrl = 'https://api.example.com';
let retries = 0;

// Use arrow functions
const handleClick = (event) => {
  console.log(event);
};

// Use template literals
const message = `Hello, ${name}!`;

// Use async/await
const fetchData = async () => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
};

// Comments for why, not what
// Retry logic for rate-limited API responses
if (retries < MAX_RETRIES) {
  retries++;
}
```

### Backend (Node.js/Express)

```javascript
// Controller
export const myEndpoint = async (req, res) => {
  try {
    // Implementation
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Service
class MyService {
  static async myMethod(data) {
    // Business logic
  }
}
```

### Frontend (HTML/CSS/JS)

```html
<!-- Use semantic HTML -->
<button class="btn btn-primary" id="submit-btn">
  Submit
</button>

<!-- CSS classes: component__element--modifier -->
<div class="card card__header--highlighted">
  Content
</div>
```

```css
/* Use CSS variables for consistency */
:root {
  --primary-color: #667eea;
  --spacing-unit: 1rem;
}

/* Use descriptive class names */
.email-list {
  display: flex;
  gap: var(--spacing-unit);
}
```

## Documentation

### Update Docs When:
- Adding new features
- Changing API endpoints
- Updating configuration
- Adding environment variables

### Documentation Files:
- **README.md** - Overview and quick start
- **DEPLOYMENT.md** - Deployment guides
- **API endpoints** - Include in README
- **Code comments** - Explain "why", not "what"

## Security

### Security Issues

**Do NOT open a public issue for security vulnerabilities!**

See [SECURITY.md](SECURITY.md) for responsible disclosure.

### Security Checklist

- [ ] No hardcoded secrets
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (if using database)
- [ ] XSS protection
- [ ] CSRF tokens (if needed)
- [ ] Rate limiting
- [ ] No sensitive data in logs
- [ ] Dependencies are up to date

## Testing

### Write Tests For:
- Critical features
- Bug fixes
- API endpoints
- Edge cases

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# With coverage
npm run coverage
```

## Pull Request Checklist

Before submitting:

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] No new warnings generated
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No breaking changes (or documented)
- [ ] No hardcoded secrets
- [ ] Dependencies updated (if needed)

## Review Process

1. **Automated Checks**
   - Tests must pass
   - Code linting must pass
   - No security issues detected

2. **Human Review**
   - At least one maintainer review
   - Code quality assessment
   - Documentation review
   - Security review

3. **Approval**
   - Address all requested changes
   - Get approval from maintainers
   - Merge when ready

## Common Issues

### "npm audit found vulnerabilities"

```bash
# Update packages
npm update

# Fix automatically
npm audit fix

# Force update (use with caution)
npm audit fix --force
```

### "Cannot find module"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"

```bash
# Change port in .env or code
# Or kill the process
lsof -i :3000
kill -9 <PID>
```

## Getting Help

- **Docs**: Check [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Chat**: Join our community Discord (link in README)

## Recognition

Contributors will be:
- Added to [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Mentioned in release notes
- Thanked publicly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)

Thank you for contributing! 🙌
