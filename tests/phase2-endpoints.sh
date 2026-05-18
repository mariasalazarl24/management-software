#!/bin/bash

# BuildHub Phase 2 Manual Endpoint Validation Tests
# Usage: bash tests/phase2-endpoints.sh <admin_email> <admin_password>
# Example: bash tests/phase2-endpoints.sh superadmin@buildhub.casa TestPassword123!

set -e

API_URL="http://localhost:3001"
ADMIN_EMAIL="${1:-superadmin@buildhub.casa}"
ADMIN_PASSWORD="${2:-TestPassword123!}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}BuildHub Phase 2 Endpoint Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Initialize variables
ADMIN_TOKEN=""
TEST_CLIENT_ID=""
TEST_USER_ID=""
TEST_DELETION_REQUEST_ID=""

# Helper function for making requests
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth_token=$4
  local expected_status=$5

  local cmd="curl -s -w '\n%{http_code}' -X $method '$API_URL$endpoint'"

  if [ -n "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi

  if [ -n "$auth_token" ]; then
    cmd="$cmd -H 'Authorization: Bearer $auth_token'"
  fi

  local response=$(eval "$cmd")
  local http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | head -n -1)

  echo "$body" | jq . 2>/dev/null || echo "$body"
  echo "HTTP Status: $http_code"

  if [ -n "$expected_status" ] && [ "$http_code" != "$expected_status" ]; then
    echo -e "${RED}❌ Expected status $expected_status, got $http_code${NC}"
    return 1
  fi

  echo "$body"
}

# Test 1: Admin Login
echo -e "${YELLOW}TEST 1: Admin Login${NC}"
echo "POST /admin/users/login"
login_response=$(curl -s -X POST "$API_URL/admin/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "$login_response" | jq .

ADMIN_TOKEN=$(echo "$login_response" | jq -r '.data.accessToken // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ Failed to obtain admin token. Check email and password.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Admin token obtained: ${ADMIN_TOKEN:0:20}...${NC}\n"

# Test 2: Get Dashboard Summary
echo -e "${YELLOW}TEST 2: Dashboard Summary${NC}"
echo "GET /admin/dashboard/summary"
curl -s -X GET "$API_URL/admin/dashboard/summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 3: Get Clients Summary
echo -e "${YELLOW}TEST 3: Clients Summary${NC}"
echo "GET /admin/dashboard/clients-summary"
clients_response=$(curl -s -X GET "$API_URL/admin/dashboard/clients-summary?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$clients_response" | jq .

TEST_CLIENT_ID=$(echo "$clients_response" | jq -r '.data[0].id // empty')
echo -e "${GREEN}✅ Test client ID: $TEST_CLIENT_ID${NC}\n"

# Test 4: Get Revenue Summary
echo -e "${YELLOW}TEST 4: Revenue Summary${NC}"
echo "GET /admin/dashboard/revenue-summary"
curl -s -X GET "$API_URL/admin/dashboard/revenue-summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 5: Get Dashboard Alerts
echo -e "${YELLOW}TEST 5: Dashboard Alerts${NC}"
echo "GET /admin/dashboard/alerts"
curl -s -X GET "$API_URL/admin/dashboard/alerts" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 6: List Admin Users
echo -e "${YELLOW}TEST 6: List Admin Users${NC}"
echo "GET /admin/users"
users_response=$(curl -s -X GET "$API_URL/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$users_response" | jq .

TEST_USER_ID=$(echo "$users_response" | jq -r '.data[0].id // empty')
echo -e "${GREEN}✅ Test user ID: $TEST_USER_ID${NC}\n"

# Test 7: Get Specific Admin User
if [ -n "$TEST_USER_ID" ]; then
  echo -e "${YELLOW}TEST 7: Get Specific Admin User${NC}"
  echo "GET /admin/users/$TEST_USER_ID"
  curl -s -X GET "$API_URL/admin/users/$TEST_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
  echo ""
fi

# Test 8: Create Deletion Request
echo -e "${YELLOW}TEST 8: Create Deletion Request${NC}"
echo "POST /admin/deletion-requests"
if [ -n "$TEST_CLIENT_ID" ]; then
  deletion_response=$(curl -s -X POST "$API_URL/admin/deletion-requests" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"clientId\":\"$TEST_CLIENT_ID\",\"reason\":\"Testing deletion request workflow\"}")
  echo "$deletion_response" | jq .

  TEST_DELETION_REQUEST_ID=$(echo "$deletion_response" | jq -r '.data.id // empty')
  echo -e "${GREEN}✅ Test deletion request ID: $TEST_DELETION_REQUEST_ID${NC}\n"
else
  echo -e "${YELLOW}⚠️  No test client found, skipping deletion request creation${NC}\n"
fi

# Test 9: List Deletion Requests
echo -e "${YELLOW}TEST 9: List Deletion Requests${NC}"
echo "GET /admin/deletion-requests"
curl -s -X GET "$API_URL/admin/deletion-requests" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 10: List Deletion Requests (PENDING status)
echo -e "${YELLOW}TEST 10: List Deletion Requests (PENDING)${NC}"
echo "GET /admin/deletion-requests?status=PENDING"
curl -s -X GET "$API_URL/admin/deletion-requests?status=PENDING" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 11: Get Specific Deletion Request
if [ -n "$TEST_DELETION_REQUEST_ID" ]; then
  echo -e "${YELLOW}TEST 11: Get Specific Deletion Request${NC}"
  echo "GET /admin/deletion-requests/$TEST_DELETION_REQUEST_ID"
  curl -s -X GET "$API_URL/admin/deletion-requests/$TEST_DELETION_REQUEST_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
  echo ""
fi

# Test 12: Get Password Reset Logs
echo -e "${YELLOW}TEST 12: Get Password Reset Logs${NC}"
echo "GET /admin/audit/password-resets"
curl -s -X GET "$API_URL/admin/audit/password-resets" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 13: Get Activity Logs
echo -e "${YELLOW}TEST 13: Get Activity Logs${NC}"
echo "GET /admin/audit/logs"
curl -s -X GET "$API_URL/admin/audit/logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 14: Get Admin Actions
echo -e "${YELLOW}TEST 14: Get Admin Actions${NC}"
echo "GET /admin/audit/admin-actions"
curl -s -X GET "$API_URL/admin/audit/admin-actions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
echo ""

# Test 15: Authentication Error - Missing Token
echo -e "${YELLOW}TEST 15: Authentication Error (Missing Token)${NC}"
echo "GET /admin/dashboard/summary (without token)"
curl -s -X GET "$API_URL/admin/dashboard/summary" | jq .
echo ""

# Test 16: Authentication Error - Invalid Token
echo -e "${YELLOW}TEST 16: Authentication Error (Invalid Token)${NC}"
echo "GET /admin/dashboard/summary (with invalid token)"
curl -s -X GET "$API_URL/admin/dashboard/summary" \
  -H "Authorization: Bearer invalid-token" | jq .
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Phase 2 Endpoint Validation Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
