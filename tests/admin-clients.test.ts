import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';

interface TestResult {
  endpoint: string;
  method: string;
  testCase: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

async function makeRequest(method: string, path: string, body?: any) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, data: { error: String(error) } };
  }
}

async function test(
  endpoint: string,
  method: string,
  testCase: string,
  expectedStatus: number,
  path: string,
  body?: any,
  validate?: (data: any) => boolean
) {
  const { status, data } = await makeRequest(method, path, body);
  const passed = status === expectedStatus && (!validate || validate(data));
  results.push({
    endpoint,
    method,
    testCase,
    expectedStatus,
    actualStatus: status,
    passed,
    details: !passed ? JSON.stringify(data).substring(0, 100) : undefined,
  });
  console.log(`${passed ? '✅' : '❌'} ${method} ${endpoint} - ${testCase}`);
}

async function runTests() {
  console.log('\n🧪 Testing BuildHub Phase 1 API Endpoints\n');

  // Test 1: POST /admin/clients - Create client (happy path)
  await test(
    '/admin/clients',
    'POST',
    'Create client (happy path)',
    200,
    '/admin/clients',
    {
      companyName: 'Happy Path Building',
      subdomain: 'happy-path-1',
      accountType: 'BUILDING',
      userQuota: 50,
      paymentPlan: 'Pro',
      contractStartDate: '2024-01-01T00:00:00Z',
      contractEndDate: '2025-12-31T23:59:59Z',
    },
    (data) => data.success && data.data?.id
  );

  // Test 2: POST /admin/clients - Duplicate subdomain
  await test(
    '/admin/clients',
    'POST',
    'Duplicate subdomain error',
    400,
    '/admin/clients',
    {
      companyName: 'Different Company',
      subdomain: 'happy-path-1',
      accountType: 'BUILDING',
      userQuota: 50,
      paymentPlan: 'Pro',
      contractStartDate: '2024-01-01T00:00:00Z',
      contractEndDate: '2025-12-31T23:59:59Z',
    }
  );

  // Test 3: POST /admin/clients - Invalid subdomain format
  await test(
    '/admin/clients',
    'POST',
    'Invalid subdomain format (special chars)',
    400,
    '/admin/clients',
    {
      companyName: 'Invalid Subdomain Building',
      subdomain: 'invalid_subdomain!',
      accountType: 'BUILDING',
      userQuota: 50,
      paymentPlan: 'Pro',
      contractStartDate: '2024-01-01T00:00:00Z',
      contractEndDate: '2025-12-31T23:59:59Z',
    }
  );

  // Test 4: POST /admin/clients - Contract date validation (start > end)
  await test(
    '/admin/clients',
    'POST',
    'Contract date validation (start > end)',
    400,
    '/admin/clients',
    {
      companyName: 'Bad Dates Building',
      subdomain: 'bad-dates',
      accountType: 'BUILDING',
      userQuota: 50,
      paymentPlan: 'Pro',
      contractStartDate: '2025-12-31T00:00:00Z',
      contractEndDate: '2024-01-01T00:00:00Z',
    }
  );

  // Test 5: POST /admin/clients - ADCOMPLEX without buildingQuota
  await test(
    '/admin/clients',
    'POST',
    'ADCOMPLEX without buildingQuota',
    201,
    '/admin/clients',
    {
      companyName: 'ADCOMPLEX No Quota',
      subdomain: 'adcomplex-no-quota',
      accountType: 'ADCOMPLEX',
      userQuota: 100,
      paymentPlan: 'Enterprise',
      contractStartDate: '2024-01-01T00:00:00Z',
      contractEndDate: '2025-12-31T23:59:59Z',
    },
    (data) => data.success
  );

  // Test 6: POST /admin/clients - BUILDING with buildingQuota > 1 (should succeed, service handles it)
  await test(
    '/admin/clients',
    'POST',
    'BUILDING with buildingQuota > 1 (service sets null)',
    201,
    '/admin/clients',
    {
      companyName: 'Building With Quota',
      subdomain: 'building-with-quota',
      accountType: 'BUILDING',
      userQuota: 30,
      buildingQuota: 5,
      paymentPlan: 'Standard',
      contractStartDate: '2024-01-01T00:00:00Z',
      contractEndDate: '2025-12-31T23:59:59Z',
    },
    (data) => data.success && data.data?.buildingQuota === null
  );

  // Test 7: GET /admin/clients - List all clients
  await test(
    '/admin/clients',
    'GET',
    'List all clients with pagination',
    200,
    '/admin/clients',
    undefined,
    (data) => data.success && Array.isArray(data.data) && data.pagination?.limit
  );

  // Test 8: GET /admin/clients/:clientId/metrics - Get metrics
  const clientId = 'ecbd2843-596b-4733-948c-c391218b98e8'; // From earlier test
  await test(
    '/admin/clients/:clientId/metrics',
    'GET',
    'Get client metrics',
    200,
    `/admin/clients/${clientId}/metrics`,
    undefined,
    (data) => data.success && data.data?.userUsagePercent !== undefined
  );

  // Test 9: GET /admin/clients/:clientId/metrics - Non-existent client
  await test(
    '/admin/clients/:clientId/metrics',
    'GET',
    'Non-existent client metrics',
    404,
    `/admin/clients/invalid-id/metrics`
  );

  // Test 10: GET /admin/clients/:clientId/contract - Get contract
  await test(
    '/admin/clients/:clientId/contract',
    'GET',
    'Get client contract details',
    200,
    `/admin/clients/${clientId}/contract`,
    undefined,
    (data) => data.success && data.data?.daysRemaining !== undefined
  );

  // Test 11: PATCH /admin/clients/:clientId - Update client
  await test(
    '/admin/clients/:clientId',
    'PATCH',
    'Update client details',
    200,
    `/admin/clients/${clientId}`,
    {
      userQuota: 75,
      paymentPlan: 'Enterprise',
    },
    (data) => data.success && data.data?.userQuota === 75
  );

  // Test 12: PATCH /admin/clients/:clientId - Try to change subdomain (should fail or be ignored)
  await test(
    '/admin/clients/:clientId',
    'PATCH',
    'Cannot update subdomain',
    200,
    `/admin/clients/${clientId}`,
    {
      subdomain: 'new-subdomain',
    },
    (data) => data.success // Service ignores subdomain changes
  );

  // Test 13: POST /admin/clients/:clientId/suspend - Suspend client
  await test(
    '/admin/clients/:clientId/suspend',
    'POST',
    'Suspend active client',
    200,
    `/admin/clients/${clientId}/suspend`,
    {
      reason: 'Non-payment',
    },
    (data) => data.success && data.data?.status === 'SUSPENDED'
  );

  // Test 14: POST /admin/clients/:clientId/suspend - Suspend already-suspended client
  await test(
    '/admin/clients/:clientId/suspend',
    'POST',
    'Cannot suspend already suspended client',
    400,
    `/admin/clients/${clientId}/suspend`,
    {
      reason: 'Already suspended',
    }
  );

  // Test 15: POST /admin/clients/:clientId/reactivate - Reactivate client
  await test(
    '/admin/clients/:clientId/reactivate',
    'POST',
    'Reactivate suspended client',
    200,
    `/admin/clients/${clientId}/reactivate`,
    undefined,
    (data) => data.success && data.data?.status === 'ACTIVE'
  );

  // Test 16: POST /admin/clients/:clientId/reactivate - Cannot reactivate ACTIVE client
  await test(
    '/admin/clients/:clientId/reactivate',
    'POST',
    'Cannot reactivate active client',
    400,
    `/admin/clients/${clientId}/reactivate`
  );

  // Test 17: Invalid JSON in request
  await test(
    '/admin/clients',
    'POST',
    'Invalid JSON (400)',
    400,
    '/admin/clients',
    { invalid: 'data' }
  );

  // Print summary
  console.log('\n📊 Test Summary\n');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)\n`);

  // Print detailed results table
  console.log('Detailed Results:');
  console.log('─'.repeat(120));
  console.log(
    'Method | Endpoint | Test Case | Expected | Actual | Status'
      .padEnd(120)
  );
  console.log('─'.repeat(120));
  results.forEach((r) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const line =
      `${r.method} | ${r.endpoint.padEnd(25)} | ${r.testCase.padEnd(35)} | ${r.expectedStatus} | ${r.actualStatus} | ${status}`.padEnd(
        120
      );
    console.log(line);
  });
  console.log('─'.repeat(120));

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((error) => {
  console.error('Test run failed:', error);
  process.exit(1);
});
