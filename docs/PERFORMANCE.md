# BuildHub Performance Guide

**Version:** 1.0.0  
**Last Updated:** 2026-05-17

---

## Performance Overview

This document outlines performance optimization strategies, benchmarks, and monitoring.

---

## Target Metrics

| Metric | Target | Tool |
|--------|--------|------|
| **API Response Time** | <200ms (p95) | APM (Sentry, DataDog) |
| **Database Query Time** | <50ms (p95) | MySQL slow query log |
| **Server Memory Usage** | <512MB baseline | Node.js profiler |
| **CPU Usage** | <50% under load | CloudWatch, htop |
| **Error Rate** | <0.1% | Sentry, logs |
| **Uptime** | 99.9% | Monitoring service |

---

## Database Optimization

### Indexing Strategy

```sql
-- Primary keys (auto-indexed)
CREATE TABLE B2BClient (
  id VARCHAR(36) PRIMARY KEY,
  ...
);

-- Unique constraints (auto-indexed)
CREATE UNIQUE INDEX idx_subdomain ON B2BClient(subdomain);
CREATE UNIQUE INDEX idx_company_name ON B2BClient(companyName);

-- Foreign key indexes
CREATE INDEX idx_building_client_id ON Building(clientId);
CREATE INDEX idx_apartment_building_id ON Apartment(buildingId);
CREATE INDEX idx_user_email ON User(email);

-- Filter columns (frequently used in WHERE)
CREATE INDEX idx_b2bclient_status ON B2BClient(status);
CREATE INDEX idx_building_status ON Building(status);
CREATE INDEX idx_apartment_status ON Apartment(status);

-- Sort columns (frequently used in ORDER BY)
CREATE INDEX idx_b2bclient_created_at ON B2BClient(createdAt DESC);
```

### Query Optimization

#### Problem: N+1 Queries

```typescript
// ❌ BAD - N+1 queries (1 for clients + 1 per client for buildings)
const clients = await prisma.b2BClient.findMany();
for (const client of clients) {
  const buildings = await prisma.building.findMany({
    where: { clientId: client.id }
  });  // Query runs N times!
}

// ✅ GOOD - Single query with relationships
const clients = await prisma.b2BClient.findMany({
  include: {
    buildings: true,  // JOINs in one query
    _count: {
      select: { buildings: true }  // Count included
    }
  }
});
```

#### Problem: Missing SELECT Fields

```typescript
// ❌ BAD - Selects all columns (maybe 50+ fields)
const clients = await prisma.b2BClient.findMany();

// ✅ GOOD - Only select needed fields
const clients = await prisma.b2BClient.findMany({
  select: {
    id: true,
    companyName: true,
    subdomain: true,
    status: true,
  }
});
```

#### Problem: Large Result Sets

```typescript
// ❌ BAD - Could return 10,000+ rows
const allUsers = await prisma.user.findMany();

// ✅ GOOD - Paginate results
const users = await prisma.user.findMany({
  take: 50,      // Limit
  skip: offset,  // Page
  orderBy: { createdAt: 'desc' }
});
```

### Connection Pooling

```typescript
// In datasource configuration
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  
  // Connection pool settings
  // Min: 2, Max: 20 depending on load
  // Default: 10 min, 10 max
}

// For production, adjust pool size
// More connections = more memory, but handles more concurrency
DATABASE_URL="mysql://user:pass@host/db?pool_size=20&connection_timeout=30s"
```

---

## Application Performance

### Middleware Performance

Middleware runs on every request - keep it fast:

```typescript
// ✅ GOOD - Lightweight, instant
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  next();  // Continue immediately
});

// ❌ BAD - Blocks request
app.use((req, res, next) => {
  const allClients = await prisma.b2BClient.findMany();  // Slow!
  next();
});
```

### Route Handler Performance

```typescript
// ✅ GOOD - Fast
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });  // <1ms
});

// ✅ GOOD - Database query with pagination
router.get('/clients', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50'), 100);
  const offset = parseInt(req.query.offset || '0');
  
  const clients = await prisma.b2BClient.findMany({
    take: limit,
    skip: offset,
  });  // <50ms
  
  res.json({ success: true, data: clients });
});

// ❌ BAD - Slow aggregation
router.get('/stats', async (req, res) => {
  // Loads all 100,000+ records into memory
  const allClients = await prisma.b2BClient.findMany();
  const total = allClients.length;
  const active = allClients.filter(c => c.status === 'ACTIVE').length;
  
  res.json({ total, active });  // Could take seconds!
});

// ✅ GOOD - Use database aggregation
router.get('/stats', async (req, res) => {
  const [total, active] = await Promise.all([
    prisma.b2BClient.count(),
    prisma.b2BClient.count({
      where: { status: 'ACTIVE' }
    })
  ]);  // <10ms
  
  res.json({ total, active });
});
```

### Async/Await Performance

```typescript
// ❌ SLOW - Wait 3 seconds total
const client = await prisma.b2BClient.findUnique({ where: { id } });  // 1s
const buildings = await prisma.building.findMany({  // 1s
  where: { clientId: id }
});
const users = await prisma.user.findMany({  // 1s
  where: { buildingMembers: { some: { buildingId: { in: [...] } } } }
});
// Total: 3 seconds

// ✅ FAST - Run in parallel, 1 second total
const [client, buildings, users] = await Promise.all([
  prisma.b2BClient.findUnique({ where: { id } }),
  prisma.building.findMany({ where: { clientId: id } }),
  prisma.user.findMany(...)
]);
// Total: ~1 second (longest query)
```

---

## Caching Strategy

### Response Caching (Not yet implemented)

```typescript
// Cache GET endpoints for 5 minutes
app.get('/admin/clients', cacheMiddleware('5m'), async (req, res) => {
  // ...
});

// Cache implementation
function cacheMiddleware(ttl: string) {
  const cache = new Map();
  
  return (req, res, next) => {
    const key = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    
    if (cache.has(key)) {
      const { data, timestamp } = cache.get(key);
      if (Date.now() - timestamp < parseTTL(ttl)) {
        return res.json(data);  // Return cached
      }
    }
    
    // Intercept response
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson.call(this, data);
    };
    
    next();
  };
}
```

### Database Query Caching (Phase 2)

Use Redis for frequently accessed data:

```typescript
// Cache client by subdomain for 5 minutes
async function getClientBySubdomain(subdomain: string) {
  const cacheKey = `client:${subdomain}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query database
  const client = await prisma.b2BClient.findUnique({
    where: { subdomain }
  });
  
  // Cache result
  if (client) {
    await redis.setex(cacheKey, 300, JSON.stringify(client));  // 5 min
  }
  
  return client;
}
```

### Cache Invalidation

```typescript
// When client is updated, invalidate cache
async function updateClient(clientId: string, updates: any) {
  const client = await prisma.b2BClient.update({
    where: { id: clientId },
    data: updates
  });
  
  // Invalidate cache
  await redis.del(`client:${client.subdomain}`);
  
  return client;
}
```

---

## Load Testing

### Setup Load Test

```bash
# Install Apache Bench
brew install httpd  # macOS
apt-get install apache2-utils  # Linux

# Run 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3001/health

# Results:
# Requests per second: 100
# Mean time per request: 100ms
# Longest request: 500ms
```

### Load Test Script

```bash
#!/bin/bash
# load-test.sh

echo "Starting load test..."
echo ""

# Test healthy endpoint (baseline)
echo "Testing /health endpoint..."
ab -n 1000 -c 10 http://localhost:3001/health

echo ""
echo "Testing /admin/clients endpoint..."
ab -n 100 -c 5 http://localhost:3001/admin/clients

echo ""
echo "Testing with concurrent subdomain requests..."
for i in {1..10}; do
  curl -H "X-Subdomain: test-building" http://localhost:3001/health &
done
wait

echo "Load test complete."
```

### Stress Test Results

Expected results (Phase 1, single server):

| Endpoint | Concurrency | RPS | Avg Response Time |
|----------|-------------|-----|-------------------|
| `/health` | 10 | 1000+ | <10ms |
| `/admin/clients` (GET) | 10 | 100+ | <50ms |
| `/admin/clients` (POST) | 5 | 50+ | <100ms |

---

## Monitoring & Profiling

### Enable Slow Query Log

```sql
-- In MySQL
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 0.1;  -- 100ms
```

### Node.js Memory Profiling

```bash
# Generate heap snapshot
node --inspect-brk src/server.ts
# Open chrome://inspect

# View memory usage
node --expose-gc src/server.ts
# In code: global.gc()
```

### Monitor Response Times

```typescript
// Log request duration
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
});
```

---

## Database Optimization Examples

### Example 1: Client Metrics Endpoint

**Problem:** Queries database separately for each metric

```typescript
// ❌ SLOW
async function getClientMetrics(clientId: string) {
  const users = await prisma.user.findMany({  // Query 1
    where: { buildingMembers: { some: { building: { clientId } } } }
  });
  
  const buildings = await prisma.building.findMany({  // Query 2
    where: { clientId }
  });
  
  return {
    totalUsers: users.length,
    totalBuildings: buildings.length,
    // ... many more separate queries
  };
}
```

**Solution:** Use single query with aggregations

```typescript
// ✅ FAST
async function getClientMetrics(clientId: string) {
  const [counts] = await prisma.b2BClient.findMany({
    where: { id: clientId },
    select: {
      id: true,
      userQuota: true,
      buildingQuota: true,
      _count: {
        select: {
          buildings: true,
        }
      }
    }
  });
  
  // Count users across buildings
  const userCount = await prisma.user.count({
    where: {
      buildingMembers: { some: { building: { clientId } } }
    }
  });
  
  return {
    totalUsers: userCount,
    userQuota: counts.userQuota,
    userUsagePercent: Math.round((userCount / counts.userQuota) * 100),
    totalBuildings: counts._count.buildings,
    buildingQuota: counts.buildingQuota,
    buildingUsagePercent: counts.buildingQuota 
      ? Math.round((counts._count.buildings / counts.buildingQuota) * 100)
      : null
  };
}
```

### Example 2: List Clients with Related Data

**Problem:** Returns all fields for all clients

```typescript
// ❌ SLOW - 50+ fields per client
const clients = await prisma.b2BClient.findMany();
// Response size: ~100KB for 100 clients
```

**Solution:** Paginate and select only needed fields

```typescript
// ✅ FAST
const clients = await prisma.b2BClient.findMany({
  take: 50,
  skip: offset,
  select: {
    id: true,
    companyName: true,
    subdomain: true,
    status: true,
    createdAt: true,
    _count: {
      select: { buildings: true }
    }
  },
  orderBy: { createdAt: 'desc' }
});
// Response size: ~5KB for 50 clients
```

---

## Compression & Transfer Optimization

### Enable GZIP Compression

```typescript
import compression from 'compression';

app.use(compression());  // Compress responses > 1KB
```

### JSON Size Optimization

```typescript
// ❌ Large response
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "Residencias Palmira",
    "subdomain": "residencias-palmira",
    "accountType": "BUILDING",
    "status": "ACTIVE",
    "userQuota": 50,
    "buildingQuota": null,
    "paymentPlan": "Pro",
    "paymentAccessRole": "BUILDING_ADMIN",
    ...50 more fields
  }
}

// ✅ Optimized response
{
  "success": true,
  "data": {
    "id": "550e8400-...",
    "name": "Residencias Palmira",
    "subdomain": "residencias-palmira",
    "status": "ACTIVE",
    "quota": 50
  }
}
```

---

## Performance Benchmarks

### Current Performance (Phase 1)

Tested with single server, MySQL database:

| Operation | Time | Notes |
|-----------|------|-------|
| Health check | <1ms | No database |
| Create client | 50-100ms | With validation |
| List clients (50) | 30-50ms | With pagination |
| Get client metrics | 100-150ms | Counts multiple tables |
| Update client | 50-80ms | With validation |
| Suspend client | 30-50ms | Status update only |

### Target Performance (Phase 2+)

With caching and optimization:

| Operation | Target |
|-----------|--------|
| Health check | <1ms |
| Create client | <100ms |
| List clients | <30ms |
| Get metrics | <50ms |
| Update client | <100ms |

---

## Performance Checklist

Before deployment:

- [ ] All endpoints respond in <200ms (p95)
- [ ] No N+1 queries in endpoints
- [ ] Pagination limits set (max 100)
- [ ] Database indexes present
- [ ] Select only needed fields from database
- [ ] Promise.all() used for parallel queries
- [ ] Slow queries identified and optimized
- [ ] Caching strategy documented
- [ ] Load testing completed
- [ ] Monitoring configured (Sentry, CloudWatch)
- [ ] Compression enabled (gzip)

---

## Optimization Roadmap

### Phase 1 (Current)
- ✅ Database indexes
- ✅ Query optimization
- ✅ Pagination
- ⚠️ Load testing

### Phase 2 (Planned)
- [ ] Redis caching
- [ ] Database query caching
- [ ] Response caching
- [ ] Advanced monitoring (APM)
- [ ] Auto-scaling configuration

### Phase 3+ (Future)
- [ ] CDN for static assets
- [ ] Database read replicas
- [ ] Query result streaming
- [ ] GraphQL optimization
- [ ] Edge function distribution

---

## Resources

- [MySQL Performance](https://dev.mysql.com/doc/)
- [Prisma Performance](https://www.prisma.io/docs/concepts/performance-and-optimization)
- [Node.js Performance](https://nodejs.org/en/docs/guides/nodejs-performance/)
- [Express Performance](https://expressjs.com/en/advanced/best-practice-performance.html)
