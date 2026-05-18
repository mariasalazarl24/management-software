# BuildHub Deployment Checklist

**Version:** 1.0.0  
**Last Updated:** 2026-05-17

---

## Pre-Deployment Security Review

### Code Security
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] No console.log statements with sensitive data
- [ ] All environment variables use env vars, not hardcoded values
- [ ] JWT secrets are unique per environment
- [ ] No default credentials left in code
- [ ] Dependencies up-to-date with no known vulnerabilities
  ```bash
  npm audit
  ```
- [ ] Review all git history for accidental commits of secrets
  ```bash
  git log --all --source --remotes -- '*.env*'
  ```

### Authentication & Authorization
- [ ] Auth middleware properly enforces permissions
- [ ] requireSuperAdmin middleware implemented (Phase 2)
- [ ] JWT token expiry is reasonable (not infinite)
- [ ] Password hashing uses bcrypt with adequate salt rounds
- [ ] Session/token refresh flow implemented
- [ ] No auth bypass endpoints
- [ ] All admin endpoints require authentication

### Input Validation
- [ ] All endpoints use Zod schemas for validation
- [ ] Subdomain regex properly rejects special characters
- [ ] String length limits enforced (min/max)
- [ ] Number ranges validated (min/max)
- [ ] Enum types restricted to valid values
- [ ] Email format validated
- [ ] No SQL injection possible (using Prisma ORM)
- [ ] File upload size limited

### CORS & Security Headers
- [ ] CORS origin whitelist configured (not `*`)
- [ ] CORS credentials properly set
- [ ] Content-Type validated
- [ ] X-Frame-Options set to DENY or SAMEORIGIN
- [ ] X-Content-Type-Options set to nosniff
- [ ] X-XSS-Protection enabled
- [ ] Strict-Transport-Security (HSTS) enabled for HTTPS

---

## Database Configuration

### Setup & Migrations
- [ ] Database created with proper collation (utf8mb4)
- [ ] All Prisma migrations applied
  ```bash
  npm run prisma:migrate deploy
  ```
- [ ] Database backup tested and verified
- [ ] Rollback procedure documented
- [ ] Data cleanup scripts created for deleted records

### Indexes & Performance
- [ ] Primary keys defined on all tables
- [ ] Foreign key indexes present on all FK columns
- [ ] Unique constraints on `subdomain`, `companyName`, `email`
- [ ] Composite indexes on frequently filtered columns
- [ ] Query execution plans reviewed
- [ ] No N+1 queries in endpoints
- [ ] Pagination limits prevent large result sets

### Backup & Disaster Recovery
- [ ] Automated daily backups configured
- [ ] Backup retention policy set (30+ days)
- [ ] Backup encryption enabled
- [ ] Backup restore procedure tested quarterly
- [ ] Database failover configured (multi-AZ)
- [ ] Read replicas configured for scale (if needed)
- [ ] Emergency contact for database issues documented

### User Quotas & Limits
- [ ] B2BClient.userQuota enforced in service
- [ ] B2BClient.buildingQuota enforced in service
- [ ] Quota checks prevent overage
- [ ] Rate limiting configured (future: Phase 2)

---

## Environment Configuration

### Production Environment Variables
- [ ] DATABASE_URL uses strong password (20+ chars)
- [ ] DATABASE_URL uses SSL/TLS connection
- [ ] All JWT secrets are 32+ character random strings
- [ ] ACCESS_TOKEN_SECRET != ADMIN_TOKEN_SECRET != REFRESH_TOKEN_SECRET
- [ ] CORS_ORIGIN whitelists specific domains (not `*`)
- [ ] SendGrid API key verified with test send
- [ ] UPLOAD_DIR points to persistent storage (S3, not local)
- [ ] LOG_LEVEL set to "warn" or "info" (not "debug")
- [ ] SENTRY_DSN configured for error tracking
- [ ] No .env file in git repository

### Secrets Management
- [ ] Secrets stored in secure vault (AWS Secrets Manager, etc)
- [ ] Secrets rotated monthly
- [ ] Secret access logged and monitored
- [ ] Least privilege access for secret retrieval
- [ ] Backup secrets stored separately
- [ ] Secret rotation procedure documented

---

## Error Handling & Logging

### Error Messages
- [ ] No sensitive info in error messages (no DB queries, paths)
- [ ] User-friendly error messages returned
- [ ] Detailed logs available internally only
- [ ] 404 vs 403 vs 400 vs 500 properly distinguished
- [ ] Error codes documented for client integration

### Logging
- [ ] All errors logged with timestamp, severity, context
- [ ] Logs do not contain passwords or API keys
- [ ] Log retention policy configured (30+ days)
- [ ] Log aggregation service configured (ELK, CloudWatch)
- [ ] Alerts set for error spikes
- [ ] Sentry or similar captures exceptions
- [ ] Stack traces in development, redacted in production

### Monitoring & Alerts
- [ ] CPU usage monitoring enabled
- [ ] Memory usage monitoring enabled
- [ ] Database connection pool monitoring
- [ ] Response time tracking
- [ ] Error rate monitoring
- [ ] Uptime monitoring (ping service)
- [ ] Alert thresholds configured
- [ ] On-call schedule established

---

## Performance

### Database Performance
- [ ] Database connection pooling configured
- [ ] Connection pool size appropriate (5-20)
- [ ] Slow query log enabled (<100ms threshold)
- [ ] Missing index alerts configured
- [ ] Table and index sizes monitored
- [ ] Deadlock frequency monitored

### Application Performance
- [ ] Response times < 200ms for 95th percentile
- [ ] No memory leaks in long-running processes
- [ ] Pagination limits prevent timeout (limit 50-100)
- [ ] Caching strategy implemented where needed
- [ ] Compression enabled (gzip)
- [ ] Static assets cached in CDN

### Load Testing
- [ ] Load tests run at 2x expected traffic
- [ ] Stress tests run to failure point
- [ ] Load tests pass without errors
- [ ] Database handles concurrent connections
- [ ] Response times remain acceptable under load
- [ ] Load test results documented

---

## HTTPS & TLS

### SSL/TLS Certificate
- [ ] Valid certificate obtained (not self-signed)
- [ ] Certificate matches domain(s)
- [ ] Certificate valid for 90+ days
- [ ] Certificate renewal automated
- [ ] Intermediate certificates configured
- [ ] Certificate pinning considered (Phase 2)

### HTTPS Configuration
- [ ] All traffic redirected HTTP → HTTPS
- [ ] HSTS header set (max-age=31536000)
- [ ] TLS 1.2 minimum enforced (TLS 1.3 preferred)
- [ ] Weak ciphers disabled
- [ ] Perfect forward secrecy enabled
- [ ] Certificate transparency logs checked

---

## Deployment Process

### Build & Testing
- [ ] TypeScript compilation succeeds (npm run build)
- [ ] All tests pass (npm test)
- [ ] Test coverage maintained (80%+)
- [ ] Linting passes (npm run lint)
- [ ] No console errors on startup
- [ ] Health checks pass (/health, /health/db)

### Deployment Automation
- [ ] CI/CD pipeline configured (GitHub Actions, GitLab CI, etc)
- [ ] Automated tests run on every commit
- [ ] Build artifacts stored in registry
- [ ] Database migrations automated in pipeline
- [ ] Zero-downtime deployment strategy
- [ ] Automatic rollback on failure

### Staging Environment
- [ ] Staging environment mirrors production
- [ ] Test deployment to staging before production
- [ ] Smoke tests run post-deployment
- [ ] Performance tests pass on staging
- [ ] Staging database is sanitized copy of production

---

## Monitoring Post-Deployment

### Immediate Post-Deployment (1 hour)
- [ ] Server health checks passing
- [ ] No error spikes in logs
- [ ] Database connections healthy
- [ ] API response times normal
- [ ] No customer complaints reported
- [ ] Monitoring dashboards show normal metrics

### First 24 Hours
- [ ] No critical errors reported
- [ ] Database performance stable
- [ ] Memory usage stable
- [ ] Response times stable
- [ ] All endpoints verified manually
- [ ] User signups/logins working
- [ ] File uploads working

### First Week
- [ ] Zero critical incidents
- [ ] Performance remains stable
- [ ] Database backups working
- [ ] Monitoring alerts not triggering
- [ ] Customer feedback positive
- [ ] Log aggregation working

---

## Rollback Procedure

If deployment fails:

1. [ ] Stop accepting new requests (or route to old version)
2. [ ] Rollback application to previous version
3. [ ] Rollback database schema if needed
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```
4. [ ] Verify health checks pass
5. [ ] Test critical endpoints manually
6. [ ] Monitor error rates return to normal
7. [ ] Post-mortem on failure cause
8. [ ] Document issue and fix

---

## Post-Deployment Documentation

### Create/Update:
- [ ] Deployment date and version documented
- [ ] Changes documented in CHANGELOG.md
- [ ] Known issues documented
- [ ] Performance benchmarks recorded
- [ ] Database migration history noted
- [ ] Rollback procedure documented

### Team Communication:
- [ ] Deployment notification sent to team
- [ ] Release notes shared with stakeholders
- [ ] Known issues communicated
- [ ] Estimated impact on users documented
- [ ] Support team briefed on changes

---

## Runbook for Common Issues

### Issue: High Memory Usage
- [ ] Check for memory leaks (restart container)
- [ ] Monitor process with tools like `top`, `htop`
- [ ] Review code for unbounded loops
- [ ] Check database connection pool size
- [ ] Restart container if necessary

### Issue: Database Connection Errors
- [ ] Verify DATABASE_URL is correct
- [ ] Check if database is running
- [ ] Verify network connectivity
- [ ] Check connection pool exhaustion
- [ ] Review slow queries

### Issue: CORS Errors
- [ ] Verify CORS_ORIGIN environment variable
- [ ] Check frontend origin header
- [ ] Verify credentials flag in requests
- [ ] Test with curl to eliminate browser issues

### Issue: 500 Errors
- [ ] Check server logs (Sentry, CloudWatch)
- [ ] Check database for connection issues
- [ ] Check environment variables set correctly
- [ ] Verify all required services running
- [ ] Check disk space on server

### Issue: Slow Response Times
- [ ] Check database query performance
- [ ] Enable query logging to identify bottlenecks
- [ ] Check network latency
- [ ] Check server CPU/memory
- [ ] Review load on database

---

## Sign-Off

- [ ] Security team approved
- [ ] Database team approved
- [ ] DevOps team approved
- [ ] Product manager signed off
- [ ] On-call engineer verified setup

---

**Deployment Approved By:** _____________ **Date:** _____________

**Deployed By:** _____________ **Time:** _____________

**Deployment Completed Successfully:** ☐ YES ☐ NO

**Notes:**

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-17 | Initial checklist for Phase 1 deployment |
