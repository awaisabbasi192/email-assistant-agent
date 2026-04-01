# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in Email Assistant, please **DO NOT** open a public GitHub issue.

Instead, please report it privately to the maintainers.

### How to Report

1. **Email**: Send a detailed report to `security@example.com`
   - Replace with actual security email in production

2. **Include in Your Report**:
   - Description of the vulnerability
   - Steps to reproduce
   - Affected versions
   - Potential impact
   - Suggested fix (if you have one)

3. **What to Expect**:
   - Acknowledgment within 48 hours
   - Initial assessment within 1 week
   - Regular updates on progress
   - Credit in security advisory (unless you decline)

### Responsible Disclosure

We follow responsible disclosure practices:
- We will work with you to understand the issue
- We will develop and test a fix
- We will release a patched version
- We will publicly disclose the vulnerability
- You will be credited (unless you prefer not to be)

**Timeline:**
- Critical issues: Fix within 7 days
- High priority: Fix within 14 days
- Medium/Low: Fix in next regular release

## Security Best Practices

### For Users

1. **Keep Dependencies Updated**
   ```bash
   npm update
   npm audit
   ```

2. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique secrets
   - Rotate keys regularly
   - Use environment-specific values

3. **Deploy Securely**
   - Use HTTPS everywhere
   - Enable security headers
   - Keep server software updated
   - Regular backups

4. **Gmail Credentials**
   - Never share OAuth tokens
   - Revoke access when no longer needed
   - Use OAuth scopes minimally
   - Enable 2FA on Google accounts

### For Developers

1. **Code Security**
   - Validate all user inputs
   - Sanitize database queries
   - Use HTTPS for API calls
   - Never log sensitive data
   - Use secure random generation for tokens

2. **Dependency Management**
   ```bash
   # Check for vulnerabilities
   npm audit

   # Update packages
   npm update

   # Audit production dependencies only
   npm audit --production
   ```

3. **Secrets Management**
   - Use environment variables
   - Never hardcode secrets
   - Use `.env` files (not in git)
   - Use vault for production
   - Rotate secrets regularly

4. **Authentication**
   - Hash passwords with bcrypt (or similar)
   - Use JWT with strong secrets
   - Implement token expiration
   - Add rate limiting to auth endpoints
   - Log suspicious activities

## Known Security Considerations

### Data Storage

**Current Implementation** (Development):
- Users stored in JSON files
- Passwords hashed with bcryptjs
- OAuth tokens encrypted with AES-256

**Recommendation for Production**:
- Migrate to proper database (PostgreSQL, MongoDB)
- Use database encryption at rest
- Implement audit logging
- Regular backups and disaster recovery

### External APIs

**Gmail API**:
- Uses OAuth 2.0 (secure)
- Tokens encrypted before storage
- Refresh tokens handled securely
- Minimal scopes requested

**Groq API**:
- API keys stored in environment
- No sensitive data sent to API
- Rate limiting implemented
- Timeout protections

### HTTPS/TLS

- **Development**: HTTP only (localhost)
- **Production**: HTTPS required
- Implement HSTS headers
- Use strong cipher suites
- Regular SSL certificate renewal

### Rate Limiting

Implemented on:
- Authentication endpoints: 5 requests/15 mins per IP
- API endpoints: 100 requests/15 mins per user
- Admin endpoints: 500 requests/15 mins

### Input Validation

- Email format validation
- Password strength requirements
- Request size limits (10MB)
- Input sanitization
- No SQL injection (using JSON storage)

## Dependency Security

### Regular Updates

```bash
# Check outdated packages
npm outdated

# Update packages
npm update

# Audit vulnerabilities
npm audit
```

### Vulnerable Packages

Current critical dependencies are regularly audited:
- `express` - Web framework
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing
- `googleapis` - Gmail API

### Dependency Scanning

We use automated scanning:
- GitHub Dependabot
- npm audit
- Manual security reviews

## OWASP Top 10 Protections

1. ✅ **A01:2021 Broken Access Control**
   - JWT authentication
   - Role-based access control
   - Protected endpoints

2. ✅ **A02:2021 Cryptographic Failures**
   - AES-256 encryption
   - HTTPS/TLS
   - Strong hashing algorithms

3. ✅ **A03:2021 Injection**
   - Input validation
   - No dynamic SQL (using JSON)
   - XSS protection

4. ✅ **A04:2021 Insecure Design**
   - Security by design
   - Threat modeling
   - Secure defaults

5. ✅ **A05:2021 Security Misconfiguration**
   - Security headers
   - Environment-based config
   - Minimal permissions

6. ✅ **A06:2021 Vulnerable Components**
   - Dependency scanning
   - Regular updates
   - Audit tools

7. ✅ **A07:2021 Authentication Failures**
   - Strong password requirements
   - Token expiration
   - Rate limiting

8. ✅ **A08:2021 Software/Data Integrity Failures**
   - Signed commits
   - Dependency verification
   - Code reviews

9. ✅ **A09:2021 Logging/Monitoring Failures**
   - Activity logging
   - Error tracking
   - Audit trails

10. ✅ **A10:2021 SSRF**
    - URL validation
    - Allowlist approach
    - External API vetting

## Security Testing

### Manual Testing

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Test rate limiting
for i in {1..10}; do curl http://localhost:3000/api/health; done

# Test XSS protection
curl -X POST http://localhost:3000/api/auth/signup \
  -d '{"email":"<script>alert(1)</script>","password":"Test123!"}'
```

### Automated Testing

```bash
# Security headers check
curl -I http://localhost:3000

# Dependency vulnerabilities
npm audit

# Code linting with security rules
npm run lint
```

## Security Headers

Production deployment includes:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

## Incident Response

### If You Find a Vulnerability

1. **Do Not**:
   - Publicly disclose it
   - Share proof of concept
   - Access other users' data
   - Modify data

2. **Do**:
   - Report it privately
   - Include detailed information
   - Be patient
   - Work with maintainers

### Our Response

1. Verify the vulnerability
2. Develop a fix
3. Create security patch
4. Release update
5. Publish advisory
6. Credit reporter

## Security Contacts

- **Email**: security@example.com
- **GitHub Security Advisory**: [Link to submit]
- **Maintainer**: [Primary maintainer contact]

## Version Support

| Version | Status | Support Until |
|---------|--------|---------------|
| 1.x     | Active | 2026-12-31   |
| 0.x     | EOL    | 2025-06-30   |

## Change Log

### Security Updates

See [CHANGELOG.md](CHANGELOG.md) for security-related updates.

---

**Last Updated**: March 2025
**Status**: Active Maintenance

Thank you for helping keep Email Assistant secure! 🔒
