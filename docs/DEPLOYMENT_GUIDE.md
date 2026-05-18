# BuildHub Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2026-05-17

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Server](#running-the-server)
6. [Testing](#testing)
7. [Health Checks](#health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

- **Node.js:** v18+ ([Download](https://nodejs.org/))
- **npm:** v9+ (comes with Node.js)
- **MySQL:** v8+ ([XAMPP](https://www.apachefriends.org/) for local development)
- **Git:** For version control

### Check Installation

```bash
node --version      # v18.0.0 or higher
npm --version       # v9.0.0 or higher
mysql --version     # mysql Ver 8.0+ using protocol version 10
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd building-management-backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies listed in `package.json`:
- Express.js
- Prisma ORM
- TypeScript
- Jest (testing)
- And more

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma client based on the schema.

---

## Environment Configuration

### 1. Create `.env` File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Edit `.env` with Local Values

```env
# Database
DATABASE_URL="mysql://root:@127.0.0.1:3306/buildhub"

# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# JWT (Phase 2)
ACCESS_TOKEN_SECRET=your-super-secret-access-key
ADMIN_TOKEN_SECRET=your-super-secret-admin-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@buildhub.casa

# Files
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=debug
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/dbname` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3001` |
| `API_URL` | Public API URL | `http://localhost:3001` |
| `ACCESS_TOKEN_SECRET` | JWT secret for access tokens | 32+ char random string |
| `ADMIN_TOKEN_SECRET` | JWT secret for admin tokens | 32+ char random string |
| `REFRESH_TOKEN_SECRET` | JWT secret for refresh tokens | 32+ char random string |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xxxxx` |
| `SENDGRID_FROM_EMAIL` | Sender email address | `noreply@buildhub.casa` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max file size (bytes) | `10485760` (10MB) |
| `LOG_LEVEL` | Log verbosity | `debug` \| `info` \| `error` |
| `SENTRY_DSN` | Sentry error tracking (optional) | Leave empty if not using |

---

## Database Setup

### 1. Start MySQL (XAMPP)

**On macOS:**
```bash
# Start XAMPP
open /Applications/XAMPP/xamppfiles/htdocs

# Or use command line
sudo /Applications/XAMPP/xamppfiles/bin/mysql.server start
```

**On Windows:**
- Click XAMPP Control Panel → Click "Start" next to MySQL

**Verify MySQL is Running:**
```bash
mysql -u root -p
# Press Enter (no password by default)
# Type: exit
```

### 2. Create Database

```bash
mysql -u root
```

Then run:
```sql
CREATE DATABASE IF NOT EXISTS buildhub;
EXIT;
```

### 3. Run Prisma Migrations

```bash
npm run prisma:migrate
```

This:
- Creates all tables from `prisma/schema.prisma`
- Sets up relationships and indexes
- Applies any pending migrations

### 4. Seed Database (Optional)

```bash
npm run prisma:seed
```

This populates the database with initial test data.

### 5. Verify Database

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio
```

Opens browser at `http://localhost:5555` to inspect database.

---

## Running the Server

### Development Mode

```bash
npm run dev
```

Expected output:
```
Server running on port 3001
Database connected
```

The server:
- Runs on `http://localhost:3001`
- Auto-reloads on file changes (ts-node)
- Logs requests to console
- Connects to MySQL database

### Production Mode

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- tests/admin-clients.test.ts
```

### Run Test Script (Shell)

```bash
bash backend/tests/run-tests.sh
```

This runs curl-based API tests against the running server.

---

## Health Checks

### Basic Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T12:00:00.000Z",
  "uptime": 3600
}
```

### Database Health Check

```bash
curl http://localhost:3001/health/db
```

Response:
```json
{
  "status": "ok",
  "message": "Database connection successful"
}
```

### Full API Test

```bash
curl -X POST http://localhost:3001/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Building",
    "subdomain": "test-building",
    "accountType": "BUILDING",
    "userQuota": 50,
    "paymentPlan": "Pro",
    "contractStartDate": "2024-01-01T00:00:00Z",
    "contractEndDate": "2025-12-31T23:59:59Z"
  }'
```

---

## Troubleshooting

### Issue: MySQL Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:3306`

**Solution:**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL (XAMPP)
/Applications/XAMPP/xamppfiles/bin/mysql.server start

# Verify connection
mysql -u root
```

### Issue: Database Not Found

**Error:** `Unknown database 'buildhub'`

**Solution:**
```bash
# Create database
mysql -u root -e "CREATE DATABASE buildhub;"

# Run migrations
npm run prisma:migrate
```

### Issue: Prisma Client Not Generated

**Error:** `PrismaClient is not instantiated`

**Solution:**
```bash
npm run prisma:generate
npm install
```

### Issue: TypeScript Compilation Error

**Error:** `Property does not exist on type...`

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

### Issue: CORS Error in Frontend

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
Update `.env`:
```env
CORS_ORIGIN=http://localhost:5173
# Or multiple origins
CORS_ORIGIN=http://localhost:5173,https://buildhub.casa
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured in `.env.production`
- [ ] MySQL database created and migrations applied
- [ ] SSL/TLS certificates obtained (for HTTPS)
- [ ] Domain DNS configured
- [ ] Secrets stored in secure vault (not in `.env`)
- [ ] Database backups configured
- [ ] Error tracking (Sentry) configured
- [ ] Email service (SendGrid) API key verified

### Building for Production

```bash
# Install dependencies (clean install)
npm ci

# Generate Prisma client
npm run prisma:generate

# TypeScript build
npm run build

# Verify build
ls -la dist/
```

### Environment for Production

Create `.env.production`:

```env
DATABASE_URL="mysql://produser:SecurePassword@prod-db-host:3306/buildhub"
NODE_ENV=production
PORT=3001
API_URL=https://api.buildhub.casa

ACCESS_TOKEN_SECRET=<very-long-random-string>
ADMIN_TOKEN_SECRET=<very-long-random-string>
REFRESH_TOKEN_SECRET=<very-long-random-string>

CORS_ORIGIN=https://buildhub.casa,https://admin.buildhub.casa

SENDGRID_API_KEY=<sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@buildhub.casa

LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-project-url
```

### Running on Production Server

```bash
# Using systemd service
sudo systemctl start buildhub
sudo systemctl status buildhub
sudo systemctl logs -u buildhub -f

# Or using PM2 (process manager)
npm install -g pm2
pm2 start dist/server.js --name "buildhub-api"
pm2 save
pm2 startup
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN npm run prisma:generate
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t buildhub-api:1.0.0 .
docker run -p 3001:3001 \
  -e DATABASE_URL="mysql://user:pass@db:3306/buildhub" \
  -e NODE_ENV=production \
  buildhub-api:1.0.0
```

### Database Backups

```bash
# Daily backup
mysqldump -u root buildhub > backups/buildhub-$(date +%Y%m%d).sql

# Restore from backup
mysql -u root buildhub < backups/buildhub-20260517.sql
```

### Monitoring

- Use Sentry for error tracking
- Use PM2/systemd logs for application logs
- Monitor database performance with MySQL Workbench
- Set up uptime monitoring (UptimeRobot, Pingdom)

---

## Next Steps

1. Complete the setup above
2. Run `npm run dev` to start server
3. Run tests with `bash tests/run-tests.sh`
4. Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint details
5. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
6. Check [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for contributing guidelines

---

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review error logs: `npm run dev` output
- Check database with: `npm run prisma:studio`
- Contact: dev@buildhub.casa
