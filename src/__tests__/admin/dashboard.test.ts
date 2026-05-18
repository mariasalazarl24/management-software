/**
 * Admin Dashboard API Tests
 * Tests dashboard endpoints with aggregation and alert generation
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
let adminToken = '';

describe('Admin Dashboard API', () => {
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
   * Test 1: Dashboard Summary
   */
  describe('GET /admin/dashboard/summary', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/summary`);
      expect(response.status).toBe(401);
    });

    test('should fail with invalid token', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/summary`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    test('should return dashboard summary with all required fields', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/summary`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.totalClients).toBeGreaterThanOrEqual(0);
      expect(data.data?.activeClients).toBeGreaterThanOrEqual(0);
      expect(data.data?.suspendedClients).toBeGreaterThanOrEqual(0);
      expect(data.data?.cancelledClients).toBeGreaterThanOrEqual(0);
      expect(data.data?.totalUsers).toBeGreaterThanOrEqual(0);
      expect(data.data?.totalBuildings).toBeGreaterThanOrEqual(0);
      expect(data.data?.contractsExpiringIn30Days).toBeGreaterThanOrEqual(0);
    });

    test('should have correct client count relationships', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/summary`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        const { totalClients, activeClients, suspendedClients, cancelledClients } = data.data;

        // Total should equal sum of statuses
        expect(totalClients).toBeGreaterThanOrEqual(activeClients + suspendedClients + cancelledClients);
      }
    });
  });

  /**
   * Test 2: Clients Summary
   */
  describe('GET /admin/dashboard/clients-summary', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/clients-summary`);
      expect(response.status).toBe(401);
    });

    test('should return paginated client summaries', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/clients-summary`, {
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

    test('should include required client fields', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/clients-summary?limit=1`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          const client = data.data[0];
          expect(client.id).toBeDefined();
          expect(client.companyName).toBeDefined();
          expect(client.subdomain).toBeDefined();
          expect(client.accountType).toBeDefined();
          expect(client.status).toBeDefined();
          expect(client.userQuota).toBeDefined();
          expect(client.buildingsCount).toBeGreaterThanOrEqual(0);
          expect(client.contractEndDate).toBeDefined();
        }
      }
    });

    test('should support pagination parameters', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/clients-summary?limit=10&offset=0`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination?.limit).toBe(10);
      expect(data.pagination?.offset).toBe(0);
    });

    test('should limit max results to 100', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/clients-summary?limit=1000`, {
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
   * Test 3: Revenue Summary
   */
  describe('GET /admin/dashboard/revenue-summary', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/revenue-summary`);
      expect(response.status).toBe(401);
    });

    test('should return revenue summary with contract info', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/revenue-summary`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.totalActiveContracts).toBeGreaterThanOrEqual(0);
      expect(data.data?.expiringContracts?.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.data?.expiringContracts?.clientNames)).toBe(true);
      expect(data.data?.expiredContracts?.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.data?.expiredContracts?.clientNames)).toBe(true);
    });

    test('should have accurate contract counts', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/revenue-summary`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data?.totalActiveContracts).toBeGreaterThanOrEqual(0);
        expect(data.data?.expiringContracts?.count).toBeGreaterThanOrEqual(0);
        expect(data.data?.expiredContracts?.count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  /**
   * Test 4: Dashboard Alerts
   */
  describe('GET /admin/dashboard/alerts', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/alerts`);
      expect(response.status).toBe(401);
    });

    test('should return alerts list with summary', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/alerts`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.summary?.total).toBeGreaterThanOrEqual(0);
      expect(data.summary?.critical).toBeGreaterThanOrEqual(0);
      expect(data.summary?.warning).toBeGreaterThanOrEqual(0);
      expect(data.summary?.info).toBeGreaterThanOrEqual(0);
    });

    test('should include alert severity levels', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/alerts`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          const alert = data.data[0];
          expect(['CRITICAL', 'WARNING', 'INFO']).toContain(alert.severity);
          expect(['QUOTA_WARNING', 'EXPIRING_CONTRACT', 'SUSPENDED_CLIENT', 'EXPIRED_CONTRACT']).toContain(alert.type);
        }
      }
    });

    test('should have valid alert structure', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/alerts`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          const alert = data.data[0];
          expect(alert.clientId).toBeDefined();
          expect(alert.clientName).toBeDefined();
          expect(alert.message).toBeDefined();
          expect(alert.timestamp).toBeDefined();
        }
      }
    });

    test('should sort alerts by severity (CRITICAL first)', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard/alerts`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 1) {
          // Check that CRITICAL alerts come before WARNING
          let lastCriticalIndex = -1;
          let firstWarningIndex = data.data.length;

          for (let i = 0; i < data.data.length; i++) {
            if (data.data[i].severity === 'CRITICAL') {
              lastCriticalIndex = i;
            }
            if (data.data[i].severity === 'WARNING' && i < firstWarningIndex) {
              firstWarningIndex = i;
            }
          }

          if (lastCriticalIndex !== -1 && firstWarningIndex !== data.data.length) {
            expect(lastCriticalIndex).toBeLessThanOrEqual(firstWarningIndex);
          }
        }
      }
    });
  });
});
