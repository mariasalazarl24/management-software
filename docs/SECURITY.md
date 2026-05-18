# BuildHub Security Guide

**Version:** 1.0.0  
**Last Updated:** 2026-05-17

---

## Security Overview

This document outlines the security architecture, vulnerability prevention, and best practices for BuildHub.

---

## Input Validation

### Zod Schema Validation

All endpoints use Zod for input validation:

```typescript
// Validates type, length, format
const createClientSchema = z.object({
  companyName: z.string().min(2).max(255),
  subdomain: z.string().regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i),
  userQuota: z.number().int().min(1).max(10000),
  contractStartDate: z.coerce.date(),
  contractEndDate: z.coerce.date(),
});

// Validation enforced before business logic
try {
  const data = createClientSchema.parse(req.body);
  // Safe to use data
} catch (error) {
  // Return 400 with validation errors
  res.status(400).json({ error: 'Validation error', details: error.errors });
}
```

### SQL Injection Prevention

Using Prisma ORM (not raw SQL) prevents SQL injection:

```typescript
// ✅ SAFE - Prisma handles parameterization
const client = await prisma.b2BClient.findUnique({
  where: { subdomain: userInput },  // Parameterized
});

// ❌ UNSAFE - Never do this
const client = await prisma.$queryRaw`
  SELECT * FROM B2BClient WHERE subdomain = '${userInput}'  // Vulnerable!
`;
```

### String Length & Type Validation

```typescript
const schema = z.object({
  // String: must be 2-255 characters
  companyName: z.string().min(2).max(255),
  
  // Number: must be integer between 1-10000
  userQuota: z.number().int().min(1).max(10000),
  
  // Date: must be valid ISO8601
  contractStartDate: z.coerce.date(),
  
  // Enum: must be one of these values
  accountType: z.enum(['BUILDING', 'ADCOMPLEX']),
});
```

### Cross-Site Scripting (XSS) Prevention

- Frontend: React/Vue sanitizes HTML by default
- API Returns JSON (not HTML) - cannot be injected
- No eval() or innerHTML() in code

---

## Authentication & Authorization

### JWT Token Security

```typescript
// Generate tokens with expiry
const token = jwt.sign(
  { userId, email, role },
  JWT_SECRET,
  { expiresIn: '1h' }  // ← Expires after 1 hour
);

// Verify tokens before accepting
const payload = jwt.verify(token, JWT_SECRET);
// Throws error if token invalid, expired, or wrong secret
```

### Secret Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| DATABASE_URL | `.env.production` (vault) | On password change |
| JWT_SECRET | `.env.production` (vault) | Monthly |
| API_KEYS (SendGrid) | `.env.production` (vault) | Quarterly |

**Best Practice:** Use secret vault (AWS Secrets Manager, HashiCorp Vault)

```bash
# Generate secure random secrets
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Role-Based Access Control (RBAC)

**Phase 1:** No auth enforcement (stub middleware)

**Phase 2 Plan:**

```typescript
// Define roles
enum AdminRole {
  SUPERADMIN,           // Full access
  ADMIN_DASHBOARD,      // Metrics/dashboard only
}

// Middleware enforces role
function requireSuperAdmin(req, res, next) {
  if (req.adminUser?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

// Use in routes
app.post('/admin/users', requireSuperAdmin, handleCreateUser);
app.get('/admin/dashboard', requireAdminAccess, handleDashboard);
```

---

## CORS & Cross-Site Request Forgery (CSRF)

### CORS Configuration

```typescript
// Whitelist specific origins, never use "*"
cors({
  origin: process.env.CORS_ORIGIN.split(','),  // e.g., "https://buildhub.casa"
  credentials: true,  // Allow cookies in requests
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

### CSRF Prevention

- **SameSite Cookies:** Set to `Strict` or `Lax`
- **CSRF Tokens:** Not needed with SameSite (Phase 2)
- **Check Origin/Referer:** Built into CORS middleware

```typescript
// In production middleware
app.use((req, res, next) => {
  // Allow only trusted origins
  const origin = req.get('Origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

---

## Password Security

### Hashing with Bcrypt

```typescript
import bcrypt from 'bcrypt';

// Hash password with salt rounds
const hashedPassword = await bcrypt.hash(password, 10);  // 10 rounds
// Store hashedPassword in database, never store plaintext

// Verify on login
const isValid = await bcrypt.compare(plaintext, hashedPassword);
```

### Password Strength Requirements

Implement in validation:

```typescript
export function validatePasswordStrength(password: string): boolean {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*]/.test(password);

  return (
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSymbol
  );
}
```

---

## Data Isolation & Multi-Tenancy

### Subdomain-Based Isolation

```
Each client gets isolated subdomain
├─ residencias-palmira.buildhub.casa → clientId: 550e8400-...
├─ complex-monterrey.buildhub.casa → clientId: 123e4567-...
└─ tower-bogota.buildhub.casa → clientId: 456f7890-...

Subdomain router extracts clientId and adds to request.clientContext
All queries filtered by clientId automatically
```

### Query Filtering

Every query includes clientId filter:

```typescript
// Wrong - Returns all buildings
const buildings = await prisma.building.findMany();  // ❌

// Correct - Returns only for this client
const buildings = await prisma.building.findMany({
  where: { clientId: req.clientContext.clientId },  // ✅
});
```

### Enforcement in Service Layer

```typescript
// In b2bClientService.ts
export async function validateClientActive(clientId: string) {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.status !== 'ACTIVE') {
    throw new Error(`Client is ${client.status.toLowerCase()}`);
  }

  // Contract not expired
  if (new Date() > client.contractEndDate) {
    throw new Error('Contract expired');
  }
}

// Use before operations
await validateClientActive(clientId);
```

---

## Database Security

### Connection Security

```env
# Use SSL/TLS for database connections
DATABASE_URL="mysql://user:pass@host/db?sslmode=require&sslStrict=true"
```

### Access Control

- Use read-only database user for read-only operations
- Use separate write user for write operations
- Never use root credentials for application

### Backup Encryption

```bash
# Encrypt database backups
mysqldump -u user -p db | gzip | gpg --encrypt --recipient key-id > backup.sql.gz.gpg
```

---

## Error Messages & Logging

### Safe Error Messages

```typescript
// ✅ GOOD - User-friendly, no sensitive info
res.status(400).json({
  error: 'Subdomain already in use'
});

// ❌ BAD - Leaks database query
res.status(400).json({
  error: 'Unique constraint violation on field "subdomain"',
  query: 'SELECT * FROM B2BClient WHERE subdomain = ...'
});

// ❌ BAD - Leaks server paths
res.status(500).json({
  error: 'Error in /home/user/app/src/services/b2bClientService.ts line 45'
});
```

### Sensitive Data in Logs

```typescript
// ✅ GOOD - Password hash, not plaintext
logger.info('User logged in', { userId, hashedPassword });

// ✅ GOOD - Masked API key
logger.debug('SendGrid API call', { apiKey: 'SG.***' });

// ❌ BAD - Stores plaintext password
logger.debug('Auth attempt', { password: userPassword });

// ❌ BAD - Stores full API key
logger.debug('API call', { apiKey: process.env.SENDGRID_API_KEY });
```

---

## Dependency Security

### Vulnerabilities Check

```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages (with caution)
npm update
```

### Dependency Pinning

```json
{
  "dependencies": {
    // Pin to specific version, review updates
    "express": "4.18.2",
    "prisma": "5.7.1"
  },
  "devDependencies": {
    "typescript": "5.3.3"
  }
}
```

---

## API Rate Limiting

**Status:** Not yet implemented. Plan for Phase 2:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,      // Return RateLimit-* headers
  legacyHeaders: false,       // Disable X-RateLimit-* headers
});

// Apply to all routes
app.use('/admin', limiter);

// Or specific routes
app.post('/admin/clients', limiter, handleCreateClient);
```

---

## File Upload Security

### File Size Limits

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB

app.use(express.json({ limit: MAX_FILE_SIZE }));
app.use(express.urlencoded({ limit: MAX_FILE_SIZE }));
```

### Allowed File Types

```typescript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

function validateFileType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}
```

### Virus Scanning

Not yet implemented. Recommended for Phase 2:

```typescript
// Use ClamAV or similar for virus scanning
const clamscan = new Clamscan();
const { isInfected } = await clamscan.scanFile(filePath);

if (isInfected) {
  throw new Error('File contains malware');
}
```

---

## HTTPS & TLS

### SSL/TLS Requirements

- ✅ TLS 1.2 minimum
- ✅ TLS 1.3 preferred
- ✅ Strong ciphers only
- ✅ Certificate from trusted CA
- ❌ Self-signed certificates (production)

### HTTP Strict Transport Security (HSTS)

```typescript
app.use((req, res, next) => {
  // Force HTTPS for 1 year
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### Certificate Pinning

Recommended for Phase 2 (protects against compromised CAs):

```typescript
// Frontend: Pin certificate hash
// Backend: Verify client certificate
```

---

## Compliance & Auditing

### Data Retention

- B2BClient records: Keep permanently
- User activity logs: Keep for 90 days
- Password reset logs: Keep for 30 days
- Deleted client data: Delete per GDPR request

### Audit Logging

Not yet implemented. Plan for Phase 2:

```typescript
interface AuditLog {
  id: string;
  adminId: string;
  action: 'CLIENT_CREATED' | 'CLIENT_SUSPENDED' | ...;
  resourceId: string;  // clientId
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

// Log every admin action
await logAuditEvent({
  adminId: req.adminUser.id,
  action: 'CLIENT_SUSPENDED',
  resourceId: clientId,
  changes: { status: 'SUSPENDED', reason: ... },
});
```

### GDPR Compliance

- ✅ Secure password hashing
- ✅ HTTPS encryption in transit
- ✅ Database encryption at rest
- ✅ Audit logging for accountability
- ✅ Right to be forgotten (delete by client ID)
- ⚠️ Data breach notification (Phase 2)

---

## Security Checklist

Before each deployment:

- [ ] All dependencies updated (npm audit)
- [ ] No hardcoded secrets in code
- [ ] No console.log with sensitive data
- [ ] All endpoints use Zod validation
- [ ] CORS properly configured (not `*`)
- [ ] Passwords properly hashed
- [ ] JWT tokens have expiry
- [ ] Error messages don't leak info
- [ ] No SQL injection possible (using Prisma)
- [ ] All routes require proper auth (Phase 2)
- [ ] Rate limiting considered
- [ ] HTTPS certificates valid
- [ ] Backups encrypted

---

## Security Incident Response

### If a secret is leaked:

1. [ ] Immediately rotate the secret
2. [ ] Update all systems using the secret
3. [ ] Check logs for unauthorized access
4. [ ] Assess impact (data exposed, systems compromised)
5. [ ] Notify affected users if needed
6. [ ] Document incident and timeline
7. [ ] Review how secret was leaked (prevent repeat)
8. [ ] Update security practices

### If database is breached:

1. [ ] Immediately isolate affected systems
2. [ ] Stop accepting new connections
3. [ ] Review what data was accessed
4. [ ] Force password resets for affected users
5. [ ] Monitor for unauthorized activity
6. [ ] Notify users of breach (legally required)
7. [ ] Restore from clean backup
8. [ ] Investigate root cause

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Prisma Security](https://www.prisma.io/docs/concepts/more/security)

---

## Questions?

- Contact security team: security@buildhub.casa
- Report vulnerabilities: security@buildhub.casa (use PGP key)
- Review code for security issues
