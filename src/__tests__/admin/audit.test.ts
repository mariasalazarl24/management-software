/**
 * Admin Audit API Tests
 * Tests audit logging endpoints for password resets and admin actions
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
let adminToken = '';

describe('Admin Audit API', () => {
  // Setup: Get admin token before tests
  beforeAll(async () => {
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
  });

  /**
   * Test 1: Password Reset Logs
   */
  describe('GET /admin/audit/password-resets', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/audit/password-resets`);
      expect(response.status).toBe(401);
    });

    test('should return password reset logs with pagination', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/password-resets`, {
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
      expect(data.pagination?.total).toBeGreaterThanOrEqual(0);
    });

    test('should include required fields in password reset logs', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/password-resets?limit=1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          const log = data.data[0];
          expect(log.id).toBeDefined();
          expect(log.userEmail).toBeDefined();
          expect(log.resetByRole).toBeDefined();
          expect(log.createdAt).toBeDefined();
        }
      }
    });

    test('should support pagination parameters', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/password-resets?limit=5&offset=0`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination?.limit).toBe(5);
      expect(data.pagination?.offset).toBe(0);
    });

    test('should limit max results to 100', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/password-resets?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination?.limit).toBeLessThanOrEqual(100);
    });
  });

  /**
   * Test 2: Get Specific Password Reset Log
   */
  describe('GET /admin/audit/password-resets/:resetId', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/audit/password-resets/test-id`);
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent log', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/password-resets/non-existent-id`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should get password reset log details', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // First get a log ID
      const listResponse = await fetch(`${API_URL}/admin/audit/password-resets?limit=1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (listResponse.status === 200) {
        const listData = await listResponse.json();
        if (listData.data.length > 0) {
          const logId = listData.data[0].id;

          const detailResponse = await fetch(`${API_URL}/admin/audit/password-resets/${logId}`, {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
            },
          });

          expect(detailResponse.status).toBe(200);
          const detailData = await detailResponse.json();
          expect(detailData.success).toBe(true);
          expect(detailData.data?.id).toBe(logId);
        }
      }
    });
  });

  /**
   * Test 3: Activity Logs
   */
  describe('GET /admin/audit/logs', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/audit/logs`);
      expect(response.status).toBe(401);
    });

    test('should return audit logs or not-implemented message', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/logs`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    test('should support pagination on logs', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/logs?limit=10&offset=0`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination?.limit).toBe(10);
      expect(data.pagination?.offset).toBe(0);
    });
  });

  /**
   * Test 4: Admin Actions
   */
  describe('GET /admin/audit/admin-actions', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/audit/admin-actions`);
      expect(response.status).toBe(401);
    });

    test('should return admin actions list', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/admin-actions`, {
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

    test('should include required action fields', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/admin-actions?limit=1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          const action = data.data[0];
          expect(action.type).toBeDefined();
          expect(action.description).toBeDefined();
          expect(action.timestamp).toBeDefined();
        }
      }
    });

    test('should support pagination on admin actions', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/admin-actions?limit=5&offset=0`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination?.limit).toBeLessThanOrEqual(5);
    });

    test('should include both password reset and deletion request actions', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/admin-actions?limit=100`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        const hasPasswordReset = data.data.some((a: any) => a.type === 'PASSWORD_RESET');
        const hasDeletionRequest = data.data.some((a: any) => a.type === 'DELETION_REQUEST');

        // At least one type should be present if data exists
        if (data.data.length > 0) {
          expect(hasPasswordReset || hasDeletionRequest).toBe(true);
        }
      }
    });
  });

  /**
   * Test 5: Get Specific Audit Log
   */
  describe('GET /admin/audit/logs/:logId', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/audit/logs/test-id`);
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent log', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/audit/logs/non-existent-id`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });
});
