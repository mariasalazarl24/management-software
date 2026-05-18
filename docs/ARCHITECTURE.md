# BuildHub Architecture

**Version:** 1.0.0  
**Last Updated:** 2026-05-17

---

## System Overview

BuildHub is a multi-tenant SaaS platform for building management. This document describes Phase 1 architecture: multi-tenant routing, data isolation, and B2B client management.

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              (React/Vue/Web Client @ :5173)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway/Reverse Proxy               │
│                    (nginx or cloud CDN)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                     Express.js Server                        │
│                   (Node.js @ localhost:3001)                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Middleware Pipeline                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 1. CORS Middleware                           │   │   │
│  │  │    - Allow cross-origin requests             │   │   │
│  │  │    - Validate origin (CORS_ORIGIN env)       │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 2. Body Parser Middleware                    │   │   │
│  │  │    - Parse JSON requests                     │   │   │
│  │  │    - Parse URL-encoded forms                 │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 3. Subdomain Router Middleware               │   │   │
│  │  │    - Extract subdomain from Host header      │   │   │
│  │  │    - Resolve B2BClient from subdomain        │   │   │
│  │  │    - Attach clientContext to req             │   │   │
│  │  │    - Skip for admin, www, localhost          │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 4. Dev Client Context (localhost only)       │   │   │
│  │  │    - Read X-Client-Id or X-Subdomain headers│   │   │
│  │  │    - For testing tenant-scoped APIs          │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 5. Attach Query Builder                      │   │   │
│  │  │    - Build Prisma filters for clientId       │   │   │
│  │  │    - Enforce data isolation                  │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Route Handlers                         │   │
│  │                                                     │   │
│  │  POST   /admin/clients         Create B2B client   │   │
│  │  GET    /admin/clients         List clients        │   │
│  │  GET    /admin/clients/:id/*   Client operations  │   │
│  │  PATCH  /admin/clients/:id     Update client       │   │
│  │  POST   /admin/clients/:id/*   Actions (suspend)  │   │
│  │                                                     │   │
│  │  /auth, /buildings, /invitations (Phase 2+)       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Service Layer (Business Logic)             │   │
│  │                                                     │   │
│  │  • b2bClientService.ts                            │   │
│  │    - CRUD operations for B2BClient                │   │
│    - Quota validation                               │   │
│    - Status transitions                             │   │
│    - Contract management                            │   │
│  │                                                     │   │
│  │  • authService.ts (Phase 2)                        │   │
│  │  • buildingService.ts                              │   │
│  │  • invitationService.ts                            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓ SQL
┌─────────────────────────────────────────────────────────────┐
│                      MySQL Database                         │
│                   (XAMPP local dev)                         │
│                                                              │
│  Tables (10 Phase 1 models):                                │
│  • B2BClient (main tenant model)                            │
│  • Building (belongs to B2BClient)                          │
│  • Apartment, User, BuildingMember                          │
│  • BuildHubAdminUser (Phase 2)                              │
│  • ClientDeletionRequest (Phase 2)                          │
│  • PasswordResetLog (Phase 2)                               │
│  • Fee, Payment, Announcement, MaintenanceRequest, Report   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Request Flow - Detailed

### Example: POST /admin/clients (Create Client)

```
1. CLIENT REQUEST
   POST https://buildhub.casa/admin/clients
   {
     "companyName": "Residencias Palmira",
     "subdomain": "residencias-palmira",
     "accountType": "BUILDING",
     "userQuota": 50,
     ...
   }

2. ENTERS EXPRESS SERVER (port 3001)
   ↓
   
3. CORS MIDDLEWARE
   ✓ Check origin matches CORS_ORIGIN env var
   ✓ Allow request

   ↓

4. BODY PARSER MIDDLEWARE
   ✓ Parse JSON from request body
   ✓ Validate content-type

   ↓

5. SUBDOMAIN ROUTER MIDDLEWARE
   • Extract Host header: "buildhub.casa"
   • Check if subdomain is reserved (admin, www, localhost)
   • Try to resolve client: null (this is admin, no client context)
   • Set req.clientContext = undefined
   • Attach to request

   ↓

6. DEV CLIENT CONTEXT MIDDLEWARE (localhost only)
   • Skip (not localhost)

   ↓

7. ATTACH QUERY BUILDER MIDDLEWARE
   • req.clientContext is undefined
   • Skip

   ↓

8. ROUTE HANDLER: POST /admin/clients
   
   a) Validate request body with Zod schema
      ✓ companyName: 2-255 chars ✓
      ✓ subdomain: 3-63 chars, regex ✓
      ✓ accountType: enum ✓
      ✓ userQuota: 1-10000 ✓
      ✓ contractDates: start < end ✓
      
   b) Call b2bClientService.createClient(data)
      
      In service:
      • Check subdomain uniqueness
      • Check companyName uniqueness
      • Generate UUID for client
      • Set status = 'ACTIVE'
      • For BUILDING: force buildingQuota = null
      • For ADCOMPLEX: set buildingQuota to provided or default 10
      • Create Prisma record
      
   c) Return success response

   ↓

9. RESPONSE SENT TO CLIENT
   HTTP 201 Created
   {
     "success": true,
     "data": {
       "id": "550e8400-...",
       "companyName": "Residencias Palmira",
       "subdomain": "residencias-palmira",
       "status": "ACTIVE",
       ...
     }
   }

10. DATABASE WRITES
    INSERT INTO B2BClient (...)
    MySQL acknowledges
```

---

## Multi-Tenant Isolation

### Subdomain-Based Routing

Each client gets a unique subdomain:
- `residencias-palmira.buildhub.casa` → clientId: `550e8400-...`
- `complex-monterrey.buildhub.casa` → clientId: `123e4567-...`
- `tower-bogota.buildhub.casa` → clientId: `456f7890-...`

### How Isolation Works

```
                Host Header
                    ↓
           subdomain-name.buildhub.casa
                    ↓
        Subdomain Router Middleware
                    ↓
    Extract "subdomain-name"
                    ↓
    Query: B2BClient where subdomain = "subdomain-name"
                    ↓
           Found B2BClient with:
           • id: "550e8400-..."
           • companyName: "Residencias Palmira"
           • accountType: "BUILDING"
           • userQuota: 50
           • buildingQuota: null
                    ↓
    Attach to request.clientContext:
    {
      clientId: "550e8400-...",
      subdomain: "residencias-palmira",
      companyName: "Residencias Palmira",
      accountType: "BUILDING",
      userQuota: 50,
      buildingQuota: null
    }
                    ↓
    All subsequent operations use clientContext.clientId
    to filter data by tenant
```

### Data Isolation in Queries

The `ClientQueryBuilder` ensures all queries are scoped to client:

```typescript
// Example: Get buildings for a client
const buildings = await prisma.building.findMany({
  where: {
    clientId: req.clientContext.clientId  // ← Always scoped
  }
});

// Example: Get users in a building (nested scope)
const users = await prisma.user.findMany({
  where: {
    buildingMembers: {
      some: {
        building: {
          clientId: req.clientContext.clientId  // ← Nested scope
        }
      }
    }
  }
});
```

---

## Authentication & Authorization (Phase 1)

**Current Status:** Stub implementation

```
POST /admin/clients
         ↓
   [Auth Middleware]
   requireSuperAdmin()  ← Currently just calls next()
         ↓
   Endpoint executes
   (NO REAL AUTH CHECK)
```

**Phase 2 Plan:**

```
POST /admin/users/login
         ↓
   Validate email + password
         ↓
   Generate AdminJWT with role (SUPERADMIN | ADMIN_DASHBOARD)
         ↓
         
Subsequent requests:
POST /admin/clients
   Header: Authorization: Bearer <AdminJWT>
         ↓
   adminAuthMiddleware
   ├─ Extract token
   ├─ Verify signature
   ├─ Decode payload: { adminId, role, ... }
   ├─ Check role = SUPERADMIN
   └─ Attach to req.adminUser
         ↓
   Endpoint executes
```

---

## Database Schema

### Phase 1 Models (Implemented)

```
B2BClient (Tenant Root)
├─ id (UUID, PK)
├─ companyName (unique)
├─ subdomain (unique)
├─ accountType (BUILDING | ADCOMPLEX)
├─ status (ACTIVE | SUSPENDED | CANCELLED)
├─ userQuota, buildingQuota
├─ paymentPlan, paymentAccessRole
├─ contractStartDate, contractEndDate
├─ createdAt, updatedAt
└─ Relations:
   ├─ buildings
   ├─ deletionRequests
   ├─ supportTickets
   ├─ boardMembers
   └─ ...

Building (belongs to B2BClient)
├─ id (UUID, PK)
├─ clientId (FK → B2BClient)
├─ name
├─ address, city, country
├─ totalApartments, yearBuilt
├─ status (ACTIVE | INACTIVE)
└─ Relations:
   ├─ apartments
   ├─ members
   └─ ...

User (Users within buildings)
├─ id (UUID, PK)
├─ email (unique)
├─ password (hashed)
├─ firstName, lastName, phone
├─ role (OWNER | ADMIN | BOARD_MEMBER)
├─ status (PENDING_VERIFICATION | ACTIVE | INACTIVE)
└─ Relations:
   ├─ buildingMembers
   ├─ apartmentOwners
   └─ ...

Apartment (units in buildings)
├─ id (UUID, PK)
├─ buildingId (FK)
├─ unitNumber, floor
├─ bedrooms, bathrooms, areaSqm
├─ status (OCCUPIED | VACANT | MAINTENANCE)
└─ Relations:
   ├─ owners
   ├─ fees
   └─ ...
```

### Phase 2 Models (To Implement)

```
BuildHubAdminUser
├─ id, email (unique), password
├─ firstName, lastName
├─ role (SUPERADMIN | ADMIN_DASHBOARD)
├─ status (ACTIVE | INACTIVE)
└─ Relations:
   ├─ sentDeletionRequests
   └─ passwordResetLogs

ClientDeletionRequest
├─ id, clientId (FK)
├─ requestedById (FK → BuildHubAdminUser)
├─ status (PENDING | APPROVED | REJECTED | DELETED)
├─ reason
├─ approvedById, approvedAt, approvalNotes
└─ ...

PasswordResetLog
├─ id, userId (FK → User)
├─ resetById (FK → BuildHubAdminUser)
├─ resetByRole, userEmail, userRole
└─ ...
```

---

## Error Handling

### Request Validation

```
Invalid Request → Zod Schema Validation
                         ↓
                    Validation Error
                         ↓
                   Return 400 Response
                   {
                     "error": "Validation error",
                     "details": [
                       {
                         "path": ["subdomain"],
                         "message": "Must match pattern..."
                       }
                     ]
                   }
```

### Database Errors

```
Duplicate Key → Prisma Error (P2002)
                       ↓
              Caught by service
                       ↓
              Return 400 Response
              {
                "error": "Subdomain already in use"
              }
```

### Not Found Errors

```
clientId not found → Check in service
                            ↓
                   getClientById() returns null
                            ↓
                    Return 404 Response
                    {
                      "error": "Client not found"
                    }
```

---

## Performance Considerations

### Indexing

```sql
-- Indexes created on critical columns
CREATE INDEX idx_b2bclient_subdomain ON B2BClient(subdomain);
CREATE INDEX idx_b2bclient_company_name ON B2BClient(companyName);
CREATE INDEX idx_building_client_id ON Building(clientId);
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_buildingmember_client_id ON BuildingMember(buildingId);
```

### Query Optimization

**N+1 Query Prevention:**
```typescript
// Good: Single query with relationships
const clients = await prisma.b2BClient.findMany({
  include: {
    _count: {
      select: { buildings: true }
    }
  }
});

// Bad: Would cause N+1 (one query per client for count)
// Avoid in loops
```

**Pagination:**
```typescript
// Use limit + offset for large lists
const clients = await prisma.b2BClient.findMany({
  take: 50,    // limit
  skip: 0,     // offset
  orderBy: { createdAt: 'desc' }
});
```

---

## Deployment Architecture

### Development
```
Frontend (localhost:5173)
    ↓
Express Server (localhost:3001)
    ↓
MySQL (localhost:3306)
```

### Production (Cloud)
```
CloudFlare / AWS CloudFront (CDN)
    ↓
Application Load Balancer (AWS ALB)
    ↓
Multiple Express Servers (Auto-scaled)
    ↓
RDS MySQL Database (Managed, Multi-AZ)
    ↓
S3 / CloudStorage (File uploads)
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Node.js | 18+ |
| **Framework** | Express.js | 4.18 |
| **Language** | TypeScript | 5.3 |
| **ORM** | Prisma | 5.7 |
| **Database** | MySQL | 8.0 |
| **Validation** | Zod | 3.22 |
| **Auth** | JWT (jsonwebtoken) | 9.0 |
| **Password** | bcrypt | 5.1 |
| **Testing** | Jest | 29.7 |
| **Build** | tsc + ts-node | - |

---

## Future Enhancements (Phase 2+)

1. **Authentication Layer**
   - BuildHubAdminUser model
   - JWT admin tokens
   - Password reset flows

2. **Dashboard**
   - Aggregation queries for metrics
   - Real-time updates (WebSocket)
   - Admin notifications

3. **Deletion Workflow**
   - Request creation and approval
   - Cascading deletes
   - Audit trails

4. **Audit Logging**
   - Track all admin actions
   - User activity logs
   - Compliance reports

5. **Performance**
   - Caching (Redis)
   - Query optimization
   - Load testing

---

## References

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — Endpoint details
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — Setup instructions
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Contributing guide
- `/backend/prisma/schema.prisma` — Database schema
- `/backend/src/services/b2bClientService.ts` — Business logic
