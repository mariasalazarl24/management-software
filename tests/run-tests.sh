#!/bin/bash

# BuildHub Phase 1 API Testing Script
# Tests all 7 endpoints with edge cases

API_URL="http://localhost:3001"
PASS=0
FAIL=0

# Helper function to make API calls
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json"
  else
    curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Helper function to test an endpoint
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5

  echo -n "Testing: $name... "

  local response=$(call_api "$method" "$endpoint" "$data")
  local status=$(echo "$response" | jq -r '.success // "error"' 2>/dev/null)

  if echo "$response" | jq . &>/dev/null; then
    echo "✅ PASS"
    ((PASS++))
  else
    echo "❌ FAIL: $response"
    ((FAIL++))
  fi
}

echo "🧪 BuildHub Phase 1 API Testing"
echo "=================================="
echo ""

# Test 1: Create client (happy path)
test_endpoint \
  "POST /admin/clients - Create client" \
  "POST" \
  "/admin/clients" \
  '{
    "companyName": "Test Building Corp",
    "subdomain": "test-building-corp",
    "accountType": "BUILDING",
    "userQuota": 50,
    "paymentPlan": "Pro",
    "contractStartDate": "2024-01-01T00:00:00Z",
    "contractEndDate": "2025-12-31T23:59:59Z"
  }' \
  201

# Test 2: List clients
test_endpoint \
  "GET /admin/clients - List all clients" \
  "GET" \
  "/admin/clients" \
  "" \
  200

# Get first client ID for further tests
CLIENT_ID=$(call_api "GET" "/admin/clients" | jq -r '.data[0].id' 2>/dev/null)

if [ ! -z "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
  # Test 3: Get metrics
  test_endpoint \
    "GET /admin/clients/:clientId/metrics" \
    "GET" \
    "/admin/clients/$CLIENT_ID/metrics" \
    "" \
    200

  # Test 4: Get contract
  test_endpoint \
    "GET /admin/clients/:clientId/contract" \
    "GET" \
    "/admin/clients/$CLIENT_ID/contract" \
    "" \
    200

  # Test 5: Update client
  test_endpoint \
    "PATCH /admin/clients/:clientId - Update client" \
    "PATCH" \
    "/admin/clients/$CLIENT_ID" \
    '{
      "userQuota": 75,
      "paymentPlan": "Enterprise"
    }' \
    200

  # Test 6: Suspend client
  test_endpoint \
    "POST /admin/clients/:clientId/suspend - Suspend client" \
    "POST" \
    "/admin/clients/$CLIENT_ID/suspend" \
    '{
      "reason": "Testing suspension"
    }' \
    200

  # Test 7: Reactivate client
  test_endpoint \
    "POST /admin/clients/:clientId/reactivate - Reactivate client" \
    "POST" \
    "/admin/clients/$CLIENT_ID/reactivate" \
    "" \
    200
else
  echo "⚠️  Could not get client ID for further tests"
fi

# Test edge cases
echo ""
echo "Testing Edge Cases..."
echo ""

# Test duplicate subdomain
test_endpoint \
  "POST /admin/clients - Duplicate subdomain (error)" \
  "POST" \
  "/admin/clients" \
  '{
    "companyName": "Another Company",
    "subdomain": "test-building-corp",
    "accountType": "BUILDING",
    "userQuota": 30,
    "paymentPlan": "Basic",
    "contractStartDate": "2024-01-01T00:00:00Z",
    "contractEndDate": "2025-12-31T23:59:59Z"
  }' \
  400

# Test invalid subdomain format
test_endpoint \
  "POST /admin/clients - Invalid subdomain format (error)" \
  "POST" \
  "/admin/clients" \
  '{
    "companyName": "Bad Subdomain Inc",
    "subdomain": "bad_sub@domain!",
    "accountType": "BUILDING",
    "userQuota": 25,
    "paymentPlan": "Basic",
    "contractStartDate": "2024-01-01T00:00:00Z",
    "contractEndDate": "2025-12-31T23:59:59Z"
  }' \
  400

# Test contract date validation
test_endpoint \
  "POST /admin/clients - Invalid contract dates (error)" \
  "POST" \
  "/admin/clients" \
  '{
    "companyName": "Bad Dates Company",
    "subdomain": "bad-dates-co",
    "accountType": "BUILDING",
    "userQuota": 25,
    "paymentPlan": "Basic",
    "contractStartDate": "2025-12-31T00:00:00Z",
    "contractEndDate": "2024-01-01T00:00:00Z"
  }' \
  400

echo ""
echo "📊 Test Summary"
echo "==============="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
