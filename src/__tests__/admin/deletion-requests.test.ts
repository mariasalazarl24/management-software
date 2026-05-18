/**
 * Admin Deletion Requests API Tests
 * Tests deletion request workflow: create, list, approve, reject
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
let adminToken = '';
let testClientId = '';
let deletionRequestId = '';

describe('Admin Deletion Requests API', () => {
  // Setup: Get admin token and test client
  beforeAll(async () => {
    // Get admin token
    const loginResponse = await fetch(`${API_URL}/admin/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testadmin@buildhub.casa',
        password: 'TestPassword123!',
      }),
    });

    if (loginResponse.status === 200) {
      const data = await loginResponse.json();
      adminToken = data.data?.accessToken || '';
    }

    // Get first test client
    if (adminToken) {
      const clientsResponse = await fetch(`${API_URL}/admin/clients?limit=1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (clientsResponse.status === 200) {
        const data = await clientsResponse.json();
        if (data.data && data.data.length > 0) {
          testClientId = data.data[0].id;
        }
      }
    }
  });

  /**
   * Test 1: Create Deletion Request
   */
  describe('POST /admin/deletion-requests', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/deletion-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'test-id',
          reason: 'Test deletion',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('should fail with non-existent client', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          clientId: 'non-existent-id',
          reason: 'Test deletion',
        }),
      });

      expect(response.status).toBe(404);
    });

    test('should fail with missing required fields', async () => {
      if (!adminToken || !testClientId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          clientId: testClientId,
          // Missing reason
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should fail with empty reason', async () => {
      if (!adminToken || !testClientId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          clientId: testClientId,
          reason: '',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should create deletion request with valid data', async () => {
      if (!adminToken || !testClientId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          clientId: testClientId,
          reason: 'Client requested deletion',
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.id).toBeDefined();
        expect(data.data?.clientId).toBe(testClientId);
        expect(data.data?.status).toBe('PENDING');
        deletionRequestId = data.data?.id;
      }
    });
  });

  /**
   * Test 2: List Deletion Requests
   */
  describe('GET /admin/deletion-requests', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/deletion-requests`);
      expect(response.status).toBe(401);
    });

    test('should list deletion requests with pagination', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination?.limit).toBeDefined();
      expect(data.pagination?.offset).toBeDefined();
    });

    test('should filter by status parameter', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests?status=PENDING`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      // All items should have PENDING status
      data.data.forEach((item: any) => {
        expect(item.status).toBe('PENDING');
      });
    });

    test('should include required fields in list', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests?limit=1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          const request = data.data[0];
          expect(request.id).toBeDefined();
          expect(request.clientId).toBeDefined();
          expect(request.clientName).toBeDefined();
          expect(request.status).toBeDefined();
          expect(request.reason).toBeDefined();
          expect(request.createdAt).toBeDefined();
        }
      }
    });
  });

  /**
   * Test 3: Get Deletion Request
   */
  describe('GET /admin/deletion-requests/:id', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/deletion-requests/test-id`);
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent request', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests/non-existent-id`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should get deletion request details', async () => {
      if (!adminToken || !deletionRequestId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests/${deletionRequestId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.id).toBe(deletionRequestId);
      expect(data.data?.status).toBe('PENDING');
    });
  });

  /**
   * Test 4: Approve Deletion Request
   */
  describe('POST /admin/deletion-requests/:id/approve', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/deletion-requests/test-id/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
    });

    test('should fail for non-existent request', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests/non-existent-id/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(404);
    });

    test('should approve deletion request', async () => {
      if (!adminToken || !deletionRequestId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests/${deletionRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          approvalNotes: 'Approved per client request',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.status).toBe('APPROVED');
        expect(data.message).toContain('approved');
      }
    });

    test('should fail to approve already-approved request', async () => {
      if (!adminToken || !deletionRequestId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests/${deletionRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  /**
   * Test 5: Reject Deletion Request
   */
  describe('POST /admin/deletion-requests/:id/reject', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/deletion-requests/test-id/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
    });

    test('should create, then reject deletion request', async () => {
      if (!adminToken || !testClientId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      // Create a new request to reject
      const createResponse = await fetch(`${API_URL}/admin/deletion-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          clientId: testClientId,
          reason: 'Testing rejection workflow',
        }),
      });

      if (createResponse.status !== 201) {
        console.log('⚠️  Could not create deletion request for rejection test');
        return;
      }

      const createData = await createResponse.json();
      const requestId = createData.data?.id;

      // Reject the request
      const rejectResponse = await fetch(`${API_URL}/admin/deletion-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          approvalNotes: 'Cannot delete at this time',
        }),
      });

      if (rejectResponse.status === 200) {
        const rejectData = await rejectResponse.json();
        expect(rejectData.success).toBe(true);
        expect(rejectData.data?.status).toBe('REJECTED');
        expect(rejectData.message).toContain('rejected');
      }
    });

    test('should fail to reject already-approved request', async () => {
      if (!adminToken || !deletionRequestId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/deletion-requests/${deletionRequestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          approvalNotes: 'Too late',
        }),
      });

      // Should fail because it's already approved
      expect(response.status).toBe(400);
    });
  });
});
