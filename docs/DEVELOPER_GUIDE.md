# BuildHub Developer Guide

**Version:** 1.0.0  
**Last Updated:** 2026-05-17

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Code Standards](#code-standards)
4. [Adding New Endpoints](#adding-new-endpoints)
5. [Adding Prisma Models](#adding-prisma-models)
6. [Testing](#testing)
7. [Git Workflow](#git-workflow)
8. [Debugging](#debugging)
9. [Common Tasks](#common-tasks)

---

## Getting Started

### Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Set up local database (see DEPLOYMENT_GUIDE.md)
# Make sure MySQL is running, then:
npm run prisma:migrate

# 4. Start development server
npm run dev

# Server should output: "Server running on port 3001"
```

### Verify Setup

```bash
# Test API is working
curl http://localhost:3001/health
# Should return: {"status":"ok",...}

# View database (Prisma Studio)
npm run prisma:studio
# Opens http://localhost:5555
```

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts                 # Express app setup, middleware, routes
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── clients.ts        # B2B client endpoints
│   │   │   ├── users.ts          # (Phase 2) Admin user endpoints
│   │   │   ├── dashboard.ts      # (Phase 2) Dashboard endpoints
│   │   │   └── ...
│   │   ├── auth.ts               # User authentication
│   │   ├── buildings.ts          # Building management
│   │   └── invitations.ts        # Invitation system
│   │
│   ├── middleware/
│   │   ├── auth.ts               # User JWT authentication
│   │   ├── adminAuth.ts          # (Phase 2) Admin JWT authentication
│   │   ├── buildingAuth.ts       # Building-level authorization
│   │   ├── subdomainRouter.ts    # Multi-tenant routing
│   │   └── dataIsolation.ts      # Data isolation enforcement
│   │
│   ├── services/
│   │   ├── b2bClientService.ts   # B2B client business logic
│   │   ├── authService.ts        # Authentication logic
│   │   ├── buildingService.ts    # Building operations
│   │   └── invitationService.ts  # Invitation logic
│   │
│   ├── utils/
│   │   ├── jwt.ts                # JWT token generation/validation
│   │   ├── password.ts           # Password hashing/validation
│   │   ├── permissions.ts        # Role-based permissions
│   │   └── ...
│   │
│   └── types/
│       ├── auth.ts               # Authentication types
│       ├── admin.ts              # (Phase 2) Admin types
│       └── ...
│
├── prisma/
│   ├── schema.prisma             # Database schema definition
│   ├── migrations/               # Database migration history
│   └── seed.ts                   # Database seeding script
│
├── tests/
│   ├── admin-clients.test.ts     # Test suite
│   └── run-tests.sh              # Shell test runner
│
├── docs/
│   ├── API_DOCUMENTATION.md      # Endpoint reference
│   ├── DEPLOYMENT_GUIDE.md       # Setup & deployment
│   ├── ARCHITECTURE.md           # System design
│   └── DEVELOPER_GUIDE.md        # This file
│
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
├── tsconfig.json                 # TypeScript config
├── jest.config.js                # Jest test config
├── package.json                  # Dependencies & scripts
└── README.md                     # Project overview
```

---

## Code Standards

### TypeScript

- **Strict Mode:** Enabled in `tsconfig.json`
- **No implicit any:** All variables must have types
- **File Naming:** `camelCase.ts` (lowercase, no spaces)
- **Exports:** Use named exports, not default exports

```typescript
// ✅ Good
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ❌ Bad
export default function validate(email) {
  return email.includes('@');
}
```

### Request Handlers

All endpoints should follow this pattern:

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// 1. Define Zod schema for validation
const createClientSchema = z.object({
  companyName: z.string().min(2).max(255),
  subdomain: z.string().regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/),
  userQuota: z.number().int().min(1).max(10000),
});

type CreateClientRequest = z.infer<typeof createClientSchema>;

// 2. Implement handler
router.post('/clients', async (req: Request, res: Response) => {
  try {
    // Validate
    const data = createClientSchema.parse(req.body);

    // Execute business logic
    const client = await b2bClientService.createClient(data);

    // Return success
    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    // Handle errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Service Layer

Services contain business logic and database operations:

```typescript
// src/services/exampleService.ts

interface CreateExampleRequest {
  name: string;
  value: number;
}

export const exampleService = {
  // ✅ Validate inputs
  async create(data: CreateExampleRequest) {
    if (data.value < 0) {
      throw new Error('Value must be positive');
    }

    // ✅ Use Prisma with proper error handling
    const record = await prisma.example.create({
      data: {
        name: data.name,
        value: data.value,
      },
    });

    return record;
  },

  // ✅ Handle not found
  async getById(id: string) {
    const record = await prisma.example.findUnique({
      where: { id },
    });

    if (!record) {
      throw new Error('Record not found');
    }

    return record;
  },

  // ✅ Use pagination for large queries
  async listAll(limit: number = 50, offset: number = 0) {
    const records = await prisma.example.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return records;
  },
};
```

### Error Handling

```typescript
// ✅ Consistent error responses
const errorResponses = {
  // Validation errors
  validation: (details: any) => ({
    status: 400,
    body: { success: false, error: 'Validation error', details },
  }),

  // Resource not found
  notFound: (resource: string) => ({
    status: 404,
    body: { success: false, error: `${resource} not found` },
  }),

  // Business logic error
  conflict: (message: string) => ({
    status: 400,
    body: { success: false, error: message },
  }),

  // Server error
  server: (message?: string) => ({
    status: 500,
    body: { success: false, error: 'Internal server error', message },
  }),
};

// Usage in endpoint
try {
  const client = await getClient(clientId);
} catch (error) {
  const { status, body } = errorResponses.notFound('Client');
  return res.status(status).json(body);
}
```

---

## Adding New Endpoints

### Step 1: Define the Schema

Create file: `src/routes/admin/new-feature.ts`

```typescript
import { z } from 'zod';

export const createNewFeatureSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export type CreateNewFeatureRequest = z.infer<typeof createNewFeatureSchema>;
```

### Step 2: Create the Service

Create file: `src/services/newFeatureService.ts`

```typescript
import { prisma } from '@/db';

export const newFeatureService = {
  async create(data: CreateNewFeatureRequest) {
    // Validate business rules
    const existing = await prisma.newFeature.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('Name already exists');
    }

    // Create record
    const feature = await prisma.newFeature.create({
      data,
    });

    return feature;
  },

  async getById(id: string) {
    const feature = await prisma.newFeature.findUnique({
      where: { id },
    });

    if (!feature) {
      throw new Error('Feature not found');
    }

    return feature;
  },
};
```

### Step 3: Create the Endpoint

Update: `src/routes/admin/new-feature.ts`

```typescript
import { Router, Request, Response } from 'express';
import { createNewFeatureSchema } from '@/types';
import { newFeatureService } from '@/services/newFeatureService';
import { z } from 'zod';

const router = Router();

// POST /admin/new-features
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createNewFeatureSchema.parse(req.body);
    const feature = await newFeatureService.create(data);

    res.status(201).json({
      success: true,
      data: feature,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Step 4: Register in server.ts

```typescript
import newFeatureRouter from '@/routes/admin/new-feature';

// In middleware section:
app.use('/admin/new-features', newFeatureRouter);
```

### Step 5: Test the Endpoint

```bash
# Start server
npm run dev

# Test in terminal
curl -X POST http://localhost:3001/admin/new-features \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Feature",
    "description": "A test feature"
  }'
```

---

## Adding Prisma Models

### Step 1: Update Schema

Edit: `prisma/schema.prisma`

```prisma
model NewFeature {
  id        String   @id @default(uuid())
  name      String   @unique
  description String?
  active    Boolean  @default(true)
  
  // Foreign keys
  createdBy String?
  user      User?    @relation(fields: [createdBy], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([createdBy])
}
```

### Step 2: Create Migration

```bash
npm run prisma:migrate
# Follow prompts, e.g., "add_new_feature"
```

### Step 3: Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 4: Add Types

Create: `src/types/newFeature.ts`

```typescript
export interface NewFeature {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 5: Update Services

Use the new model in services:

```typescript
const feature = await prisma.newFeature.create({
  data: {
    name: 'Test',
    createdBy: userId,
  },
  include: {
    user: true,  // Auto-completion now works!
  },
});
```

---

## Testing

### Write Tests

Create: `tests/new-feature.test.ts`

```typescript
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

describe('New Feature API', () => {
  it('should create a new feature', async () => {
    const response = await fetch(`${API_URL}/admin/new-features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Feature',
        description: 'A test',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Feature');
  });

  it('should reject duplicate names', async () => {
    // Create first
    await fetch(`${API_URL}/admin/new-features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate' }),
    });

    // Try to create duplicate
    const response = await fetch(`${API_URL}/admin/new-features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate' }),
    });

    expect(response.status).toBe(400);
  });
});
```

### Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Specific file
npm test -- tests/new-feature.test.ts

# Shell-based tests (while server runs)
bash tests/run-tests.sh
```

---

## Git Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/add-new-endpoint
```

Branch naming convention: `feature/*` (new features), `fix/*` (bug fixes), `docs/*` (documentation)

### 2. Make Changes

```bash
# Add new files
git add src/routes/admin/new-feature.ts

# Check status
git status

# Commit with clear message
git commit -m "feat: add new feature endpoint

- POST /admin/new-features create endpoint
- Validation with Zod schema
- Service layer with error handling"
```

### 3. Test Before Push

```bash
npm run build   # TypeScript check
npm test        # Run tests
npm run lint    # Check code style
```

### 4. Push & Create PR

```bash
git push origin feature/add-new-endpoint

# Create PR on GitHub
# Link issue: "Fixes #123"
# Describe changes in detail
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat` (feature), `fix` (bug), `docs` (documentation), `refactor` (refactoring)

Example:
```
feat(admin): add client suspension endpoint

- POST /admin/clients/:id/suspend endpoint
- Validates client status before suspension
- Logs suspension reason for audit trail
- Tests all edge cases

Fixes #42
```

---

## Debugging

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug
npm run dev
```

### Inspect Database

```bash
# Open Prisma Studio
npm run prisma:studio
# Opens http://localhost:5555
# View all records, filter, edit in GUI
```

### Check JWT Tokens

```bash
# Decode JWT (no verification) - Phase 2
# Use in utils/jwt.ts
decodeToken(token)
```

### SQL Query Logging

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  // Enable SQL query logging
  // log      = ["query", "error", "warn"]
}
```

### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/src/server.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "tsc: build"
    }
  ]
}
```

---

## Common Tasks

### Update Database Schema

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npm run prisma:migrate

# 3. Generate Prisma client
npm run prisma:generate

# 4. Write types/service/routes as needed
```

### Add Environment Variable

```bash
# 1. Add to .env.example
echo 'NEW_VAR=value' >> .env.example

# 2. Add to .env (local)
echo 'NEW_VAR=value' >> .env

# 3. Use in code
const value = process.env.NEW_VAR || 'default';
```

### Fix TypeScript Errors

```bash
# Check all errors
npm run build

# See specific file
npx tsc src/file.ts --noEmit
```

### Run Single Endpoint Test

```bash
# Test one endpoint manually
curl -X POST http://localhost:3001/admin/clients \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test",...}'
```

### Clear Cache & Reinstall

```bash
# Full reset
rm -rf node_modules dist .next
npm install
npm run prisma:generate
npm run build
npm run dev
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Zod Validation](https://zod.dev/)
- [Jest Testing](https://jestjs.io/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

---

## Questions?

- Check existing code for patterns
- Review `/backend/docs/` for architecture details
- Ask team leads for guidance on design decisions
- Reference test files for examples

Happy coding! 🚀
