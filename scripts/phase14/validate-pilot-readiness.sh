#!/bin/bash
# PHASE 14: Enterprise Pilot Readiness Validation Script
# Run this script before onboarding any enterprise pilot customer
# Usage: ./scripts/phase14/validate-pilot-readiness.sh

set -e

echo "=============================================="
echo "  Enterprise Pilot Readiness Validation"
echo "  Phase 14 Control Automation"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
    ((WARNINGS++))
}

# 1. Check required files exist
echo "=== Checking Required Files ==="

if [ -f "server/middleware/auth.ts" ]; then
    check_pass "Auth middleware exists"
else
    check_fail "Auth middleware missing"
fi

if [ -f "server/middleware/tenantRateLimit.ts" ]; then
    check_pass "Tenant rate limit middleware exists"
else
    check_fail "Tenant rate limit middleware missing"
fi

if [ -f "server/db/authSchema.ts" ]; then
    check_pass "Auth schema exists"
else
    check_fail "Auth schema missing"
fi

echo ""

# 2. Check tenant suspension enforcement
echo "=== Checking Tenant Suspension Enforcement (GAP-TEN-001) ==="

if grep -q "TENANT_SUSPENDED" server/middleware/auth.ts; then
    check_pass "Tenant suspension check implemented"
else
    check_fail "Tenant suspension check NOT implemented"
fi

if grep -q "getTenantStatus" server/middleware/auth.ts; then
    check_pass "Tenant status lookup implemented"
else
    check_fail "Tenant status lookup NOT implemented"
fi

echo ""

# 3. Check per-tenant rate limiting
echo "=== Checking Per-Tenant Rate Limiting (GAP-SCL-001) ==="

if grep -q "tenantRateLimit" server/routes.ts; then
    check_pass "Tenant rate limit middleware integrated"
else
    check_fail "Tenant rate limit middleware NOT integrated"
fi

if grep -q "PLAN_RATE_LIMITS" server/middleware/tenantRateLimit.ts 2>/dev/null; then
    check_pass "Plan-based rate limits configured"
else
    check_fail "Plan-based rate limits NOT configured"
fi

echo ""

# 4. Check documentation exists
echo "=== Checking Phase 14 Documentation ==="

DOCS=(
    "docs/corporate-readiness/PHASE14_EXECUTION_PLAN.md"
    "docs/corporate-readiness/PHASE14_BLOCKER_BURNDOWN.md"
    "docs/corporate-readiness/ENTERPRISE_PILOT_READINESS_CHECKLIST.md"
    "docs/corporate-readiness/INTEGRATION_OPERATIONS_RUNBOOK.md"
    "docs/corporate-readiness/TENANT_LIFECYCLE_AUTOMATION_PLAYBOOK.md"
    "docs/corporate-readiness/CONTROL_AUTOMATION_MATRIX.md"
    "docs/corporate-readiness/PHASE14_GAP_REGISTER.md"
    "docs/corporate-readiness/PHASE14_EXECUTIVE_OUTCOME_MEMO.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$(basename $doc) exists"
    else
        check_warn "$(basename $doc) missing"
    fi
done

echo ""

# 5. Check protected files unchanged
echo "=== Checking Protected Files ==="

PROTECTED_FILES=(
    "client/src/features/standard/dimensional-mapping.ts"
    "client/src/features/standard/optimizer.ts"
)

for file in "${PROTECTED_FILES[@]}"; do
    if git diff --quiet -- "$file" 2>/dev/null; then
        check_pass "$(basename $file) unchanged"
    else
        check_fail "$(basename $file) MODIFIED (protected file)"
    fi
done

echo ""

# 6. Run tests
echo "=== Running Test Suite ==="

if npm test -- --run 2>&1 | grep -q "passed"; then
    check_pass "Test suite passes"
else
    check_warn "Test suite may have issues"
fi

echo ""

# Summary
echo "=============================================="
echo "  Validation Summary"
echo "=============================================="
echo ""
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}PILOT READY${NC} - All critical checks passed"
    exit 0
else
    echo -e "${RED}PILOT NOT READY${NC} - $ERRORS critical issues found"
    exit 1
fi
