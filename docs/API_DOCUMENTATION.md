# BuildHub API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001` (development) | `https://api.buildhub.casa` (production)  
**Content-Type:** `application/json`

---

## Overview

BuildHub API provides multi-tenant building management with B2B client administration. All endpoints return consistent JSON responses with success status and data/error information.

### Authentication

- **Phase 1:** No authentication (stub middleware)
- **Phase 2:** JWT Bearer tokens for admin users
- Future: User authentication per tenant

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "pagination": { /* optional for list endpoints */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { /* optional validation errors */ }
}
```

### HTTP Status Codes
| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, duplicate, invalid state transition |
| 404 | Not Found | Resource does not exist |
| 500 | Server Error | Unexpected error |

---

## Endpoints

### 1. Create B2B Client

**POST** `/admin/clients`

Creates a new B2B tenant client.

#### Request

```bash
curl -X POST http://localhost:3001/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Residencias Palmira",
    "subdomain": "residencias-palmira",
    "accountType": "BUILDING",
    "userQuota": 50,
    "paymentPlan": "Pro",
    "contractStartDate": "2024-01-01T00:00:00Z",
    "contractEndDate": "2025-12-31T23:59:59Z"
  }'
```

#### Request Body

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `companyName` | string | Yes | 2-255 chars, unique | Building/Complex name |
| `subdomain` | string | Yes | 3-63 chars, regex, unique | URL subdomain (lowercase alphanumeric + hyphens) |
| `accountType` | enum | Yes | BUILDING \| ADCOMPLEX | Type of client |
| `userQuota` | number | Yes | 1-10000 | Max concurrent users |
| `buildingQuota` | number | No | 1-1000 (ADCOMPLEX only) | Max buildings (only for ADCOMPLEX) |
| `paymentPlan` | string | Yes | 1-100 chars | Billing plan (e.g., "Pro", "Enterprise") |
| `contractStartDate` | ISO8601 | Yes | Valid date | Contract start date |
| `contractEndDate` | ISO8601 | Yes | Valid date, > startDate | Contract end date |

**Subdomain Regex:** `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`

#### Response (201 Created)

```json
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
    "contractStartDate": "2024-01-01T00:00:00.000Z",
    "contractEndDate": "2025-12-31T23:59:59.000Z",
    "createdAt": "2026-05-17T12:00:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation error:
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 2,
      "type": "string",
      "path": ["companyName"],
      "message": "String must contain at least 2 character(s)"
    }
  ]
}
```

**400 Bad Request** - Duplicate subdomain:
```json
{
  "success": false,
  "error": "Subdomain already in use",
  "message": "The subdomain 'residencias-palmira' is already registered"
}
```

**400 Bad Request** - Invalid contract dates:
```json
{
  "success": false,
  "error": "Invalid contract dates",
  "message": "Contract end date must be after start date"
}
```

---

### 2. List B2B Clients

**GET** `/admin/clients`

Lists all B2B clients with pagination.

#### Request

```bash
curl -X GET "http://localhost:3001/admin/clients?limit=10&offset=0" \
  -H "Content-Type: application/json"
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results per page (max 100) |
| `offset` | number | 0 | Pagination offset |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "companyName": "Residencias Palmira",
      "subdomain": "residencias-palmira",
      "accountType": "BUILDING",
      "status": "ACTIVE",
      "userQuota": 50,
      "buildingQuota": null,
      "paymentPlan": "Pro",
      "contractStartDate": "2024-01-01T00:00:00.000Z",
      "contractEndDate": "2025-12-31T23:59:59.000Z",
      "createdAt": "2026-05-17T12:00:00.000Z",
      "_count": {
        "buildings": 3
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

---

### 3. Get Client Metrics

**GET** `/admin/clients/:clientId/metrics`

Get usage metrics for a specific client.

#### Request

```bash
curl -X GET "http://localhost:3001/admin/clients/550e8400-e29b-41d4-a716-446655440000/metrics" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "totalUsers": 25,
    "userQuota": 50,
    "userUsagePercent": 50,
    "totalBuildings": 3,
    "buildingQuota": null,
    "buildingUsagePercent": null
  }
}
```

#### Error Responses

**404 Not Found**:
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

### 4. Get Client Contract

**GET** `/admin/clients/:clientId/contract`

Get contract details and status for a client.

#### Request

```bash
curl -X GET "http://localhost:3001/admin/clients/550e8400-e29b-41d4-a716-446655440000/contract" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "contractStartDate": "2024-01-01T00:00:00.000Z",
    "contractEndDate": "2025-12-31T23:59:59.000Z",
    "isActive": true,
    "daysRemaining": 258,
    "requiresRenewal": false
  }
}
```

**Note:** `requiresRenewal` is true when `daysRemaining <= 30`

#### Error Responses

**404 Not Found**:
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

### 5. Update Client

**PATCH** `/admin/clients/:clientId`

Update client details (except subdomain, which is immutable).

#### Request

```bash
curl -X PATCH "http://localhost:3001/admin/clients/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "userQuota": 75,
    "paymentPlan": "Enterprise"
  }'
```

#### Request Body

All fields are optional. Same constraints as create endpoint.

| Field | Type | Constraints |
|-------|------|-------------|
| `companyName` | string | 2-255 chars, unique |
| `userQuota` | number | 1-10000 |
| `buildingQuota` | number | 1-1000 (ADCOMPLEX only) |
| `paymentPlan` | string | 1-100 chars |
| `status` | enum | ACTIVE \| SUSPENDED \| CANCELLED |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "companyName": "Residencias Palmira",
    "subdomain": "residencias-palmira",
    "accountType": "BUILDING",
    "status": "ACTIVE",
    "userQuota": 75,
    "buildingQuota": null,
    "paymentPlan": "Enterprise",
    "contractStartDate": "2024-01-01T00:00:00.000Z",
    "contractEndDate": "2025-12-31T23:59:59.000Z",
    "createdAt": "2026-05-17T12:00:00.000Z",
    "updatedAt": "2026-05-17T14:00:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation error (same as create)

**404 Not Found**:
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

### 6. Suspend Client

**POST** `/admin/clients/:clientId/suspend`

Suspend a client account (set status to SUSPENDED).

#### Request

```bash
curl -X POST "http://localhost:3001/admin/clients/550e8400-e29b-41d4-a716-446655440000/suspend" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Non-payment - invoice overdue 60 days"
  }'
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Reason for suspension (audit trail) |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Client suspended successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "SUSPENDED"
  }
}
```

#### Error Responses

**400 Bad Request** - Already suspended:
```json
{
  "success": false,
  "error": "Client is already suspended",
  "message": "Cannot suspend a client that is already suspended"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

### 7. Reactivate Client

**POST** `/admin/clients/:clientId/reactivate`

Reactivate a suspended client (set status to ACTIVE).

#### Request

```bash
curl -X POST "http://localhost:3001/admin/clients/550e8400-e29b-41d4-a716-446655440000/reactivate" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Client reactivated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ACTIVE"
  }
}
```

#### Error Responses

**400 Bad Request** - Not suspended:
```json
{
  "success": false,
  "error": "Client is not suspended",
  "message": "Cannot reactivate a client that is not suspended"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

## Validation Rules

### Account Types
- **BUILDING:** Single building, userQuota required, buildingQuota set to null
- **ADCOMPLEX:** Multiple buildings, userQuota required, buildingQuota required (default 10)

### Status Transitions
- ACTIVE → SUSPENDED (allowed)
- SUSPENDED → ACTIVE (allowed)
- SUSPENDED/ACTIVE → CANCELLED (future)
- No other transitions allowed

### Business Constraints
- Subdomains must be globally unique
- Company names must be globally unique
- Contract start date < Contract end date
- userQuota: 1-10,000
- buildingQuota: 1-1,000 (ADCOMPLEX only)

---

## Rate Limiting

Currently not implemented. Future: 100 requests per minute per API key.

---

## Error Codes

| Error | Code | Status | Resolution |
|-------|------|--------|-----------|
| Validation Error | 400 | Bad Request | Check request format and constraints |
| Duplicate Subdomain | 400 | Bad Request | Use unique subdomain |
| Duplicate Company Name | 400 | Bad Request | Use unique company name |
| Invalid State Transition | 400 | Bad Request | Check current status before state change |
| Client Not Found | 404 | Not Found | Verify clientId is correct |
| Internal Error | 500 | Server Error | Contact support |

---

## Version History

### v1.0.0 (2026-05-17)
- Initial release
- 7 endpoints implemented and tested
- Multi-tenant architecture complete
- All business rules validated

### Upcoming (Phase 2)
- Admin user authentication
- SuperAdmin dashboard endpoints
- Deletion request workflow
- Audit logging endpoints
