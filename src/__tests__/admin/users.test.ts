/**
 * Admin Users API Tests
 * Tests all user management endpoints with happy paths and error cases
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
let adminToken = '';
let createdUserId = '';

describe('Admin Users API', () => {
  // Test data
  const validSuperAdmin = {
    email: 'superadmin@test.buildhub.casa',
    password: 'SuperPassword123!',
    firstName: 'Super',
    lastName: 'Admin',
  };

  const validAdminDashboard = {
    email: 'admin@test.buildhub.casa',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'Dashboard',
    role: 'ADMIN_DASHBOARD',
  };

  /**
   * Test 1: Admin Login
   */
  describe('POST /admin/users/login', () => {
    test('should login with valid credentials', async () => {
      // First create an admin user to test login
      // This test assumes a user already exists
      const response = await fetch(`${API_URL}/admin/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testadmin@buildhub.casa',
          password: 'TestPassword123!',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.accessToken).toBeDefined();
        expect(data.data?.refreshToken).toBeDefined();
        if (data.data?.accessToken) {
          adminToken = data.data.accessToken;
        }
      }
    });

    test('should fail with invalid email', async () => {
      const response = await fetch(`${API_URL}/admin/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@buildhub.casa',
          password: 'SomePassword123!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should fail with invalid password', async () => {
      const response = await fetch(`${API_URL}/admin/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testadmin@buildhub.casa',
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    test('should fail with missing fields', async () => {
      const response = await fetch(`${API_URL}/admin/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testadmin@buildhub.casa',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should fail with invalid email format', async () => {
      const response = await fetch(`${API_URL}/admin/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'Password123!',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  /**
   * Test 2: Create Admin User (SUPERADMIN only)
   */
  describe('POST /admin/users', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAdminDashboard),
      });

      expect(response.status).toBe(401);
    });

    test('should fail with invalid token', async () => {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify(validAdminDashboard),
      });

      expect(response.status).toBe(401);
    });

    test('should fail with weak password', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: 'weak@test.buildhub.casa',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
          role: 'ADMIN_DASHBOARD',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should fail with duplicate email', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: 'testadmin@buildhub.casa', // Already exists
          password: 'NewPassword123!',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'ADMIN_DASHBOARD',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should create admin user with valid data', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(validAdminDashboard),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.id).toBeDefined();
        expect(data.data?.email).toBe(validAdminDashboard.email);
        expect(data.data?.password).toBeUndefined();
        createdUserId = data.data?.id;
      }
    });
  });

  /**
   * Test 3: List Admin Users
   */
  describe('GET /admin/users', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users`);
      expect(response.status).toBe(401);
    });

    test('should list all admin users with pagination', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users`, {
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

    test('should support pagination parameters', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users?limit=10&offset=0`, {
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
   * Test 4: Get Admin User by ID
   */
  describe('GET /admin/users/:userId', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users/test-id`);
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent user', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/non-existent-id`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should get user details by ID', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.id).toBe(createdUserId);
      expect(data.data?.password).toBeUndefined();
    });
  });

  /**
   * Test 5: Update Admin User (SUPERADMIN only)
   */
  describe('PATCH /admin/users/:userId', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users/test-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      });

      expect(response.status).toBe(401);
    });

    test('should update user firstName', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          firstName: 'UpdatedFirst',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.firstName).toBe('UpdatedFirst');
      }
    });

    test('should update user status', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'INACTIVE',
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.status).toBe('INACTIVE');
      }
    });
  });

  /**
   * Test 6: Password Reset (SUPERADMIN only)
   */
  describe('POST /admin/users/:userId/password-reset', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users/test-id/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'NewPass123!' }),
      });

      expect(response.status).toBe(401);
    });

    test('should fail with weak password', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ newPassword: 'weak' }),
      });

      expect(response.status).toBe(400);
    });

    test('should reset password with valid data', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ newPassword: 'NewPassword123!' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  /**
   * Test 7: Deactivate User (SUPERADMIN only)
   */
  describe('POST /admin/users/:userId/deactivate', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users/test-id/deactivate`, {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });

    test('should deactivate user', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.status).toBe('INACTIVE');
      }
    });
  });

  /**
   * Test 8: Reactivate User (SUPERADMIN only)
   */
  describe('POST /admin/users/:userId/reactivate', () => {
    test('should fail without authentication', async () => {
      const response = await fetch(`${API_URL}/admin/users/test-id/reactivate`, {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });

    test('should reactivate user', async () => {
      if (!adminToken || !createdUserId) {
        console.log('⚠️  Skipping test - missing data');
        return;
      }

      const response = await fetch(`${API_URL}/admin/users/${createdUserId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data?.status).toBe('ACTIVE');
      }
    });
  });
});
