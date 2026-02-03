# Control Automation Matrix

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

This matrix defines which security and operational controls are automated, how they are validated, and the evidence they generate. It supports audit readiness and continuous compliance.

---

## 2. Control Automation Overview

### 2.1 Automation Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **Fully Automated** | No human intervention required | JWT validation, rate limiting |
| **Semi-Automated** | Script-assisted with human trigger | Tenant provisioning, suspension |
| **Manual with Checklist** | Human process with documented steps | Enterprise onboarding, DR drill |
| **Manual** | Ad-hoc human process | Custom troubleshooting |

### 2.2 Summary by Category

| Category | Fully Auto | Semi-Auto | Manual w/Checklist | Manual |
|----------|------------|-----------|---------------------|--------|
| Authentication | 4 | 0 | 0 | 0 |
| Authorization | 3 | 0 | 0 | 0 |
| Rate Limiting | 2 | 0 | 0 | 0 |
| Tenant Lifecycle | 1 | 4 | 2 | 0 |
| Audit & Logging | 3 | 0 | 1 | 0 |
| Security | 2 | 1 | 1 | 0 |
| **Total** | **15** | **5** | **4** | **0** |

---

## 3. Authentication Controls

### 3.1 AUTH-001: JWT Token Validation

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTH-001 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/middleware/auth.ts:authenticate()` |
| **Trigger** | Every authenticated API request |
| **Evidence** | 401 response on invalid token |

**Validation Script**:
```bash
# Test invalid token rejection
curl -X GET https://api.example.com/api/auth/me \
  -H "Authorization: Bearer invalid-token" \
  | jq '.code' # Expect: "INVALID_TOKEN"
```

### 3.2 AUTH-002: Token Expiration Enforcement

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTH-002 |
| **Automation Level** | Fully Automated |
| **Implementation** | JWT `exp` claim validation |
| **Trigger** | Token verification |
| **Evidence** | 401 after 15 minutes |

### 3.3 AUTH-003: Password Hashing

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTH-003 |
| **Automation Level** | Fully Automated |
| **Implementation** | `bcrypt` with 10 rounds |
| **Trigger** | User registration/password change |
| **Evidence** | Hashed values in `users.password_hash` |

### 3.4 AUTH-004: Tenant Status Enforcement (PHASE 14)

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTH-004 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/middleware/auth.ts:getTenantStatus()` |
| **Trigger** | Every authenticated request |
| **Evidence** | 403 TENANT_SUSPENDED response |

**Validation Script**:
```sql
-- Suspend tenant
UPDATE tenants SET status = 'suspended' WHERE id = 'test-tenant';

-- Attempt API call (should return 403)
-- curl ... -> 403 TENANT_SUSPENDED

-- Reinstate
UPDATE tenants SET status = 'active' WHERE id = 'test-tenant';
```

---

## 4. Authorization Controls

### 4.1 AUTHZ-001: Role-Based Access Control

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTHZ-001 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/middleware/auth.ts:authorize()` |
| **Trigger** | Protected route access |
| **Evidence** | 403 on insufficient role |

### 4.2 AUTHZ-002: Tenant Isolation

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTHZ-002 |
| **Automation Level** | Fully Automated |
| **Implementation** | `tenantId` filter on all queries |
| **Trigger** | Data access |
| **Evidence** | 25 automated tests |

**Validation**:
```bash
npm test -- --run --grep "tenant isolation"
# Expected: 25 tests pass
```

### 4.3 AUTHZ-003: Permission Check

| Attribute | Value |
|-----------|-------|
| **Control ID** | AUTHZ-003 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/middleware/auth.ts:requirePermission()` |
| **Trigger** | Permission-protected routes |
| **Evidence** | 403 PERMISSION_DENIED |

---

## 5. Rate Limiting Controls

### 5.1 RATE-001: Global Rate Limit

| Attribute | Value |
|-----------|-------|
| **Control ID** | RATE-001 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/index.ts:limiter` |
| **Configuration** | 1000 req/15min per IP |
| **Evidence** | 429 response + headers |

### 5.2 RATE-002: Per-Tenant Rate Limit (PHASE 14)

| Attribute | Value |
|-----------|-------|
| **Control ID** | RATE-002 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/middleware/tenantRateLimit.ts` |
| **Configuration** | Plan-based (100-10000 req/15min) |
| **Evidence** | X-RateLimit-* headers |

**Validation Script**:
```bash
# Check rate limit headers
curl -I https://api.example.com/api/quotations \
  -H "Authorization: Bearer $TOKEN" \
  | grep "X-RateLimit"

# Expected:
# X-RateLimit-Limit: 10000
# X-RateLimit-Remaining: 9999
# X-RateLimit-Reset: 1706968800
```

---

## 6. Tenant Lifecycle Controls

### 6.1 TEN-001: Tenant Creation Audit

| Attribute | Value |
|-----------|-------|
| **Control ID** | TEN-001 |
| **Automation Level** | Semi-Automated |
| **Implementation** | SQL script + audit log |
| **Trigger** | Enterprise onboarding |
| **Evidence** | `audit_logs.action = 'tenant.created'` |

### 6.2 TEN-002: Suspension Enforcement

| Attribute | Value |
|-----------|-------|
| **Control ID** | TEN-002 |
| **Automation Level** | Fully Automated |
| **Implementation** | Auth middleware tenant check |
| **Trigger** | Any request from suspended tenant |
| **Evidence** | 403 + audit log |

### 6.3 TEN-003: Offboarding Audit Trail

| Attribute | Value |
|-----------|-------|
| **Control ID** | TEN-003 |
| **Automation Level** | Semi-Automated |
| **Implementation** | SQL script + audit log |
| **Trigger** | Offboarding procedure |
| **Evidence** | `audit_logs.action = 'tenant.offboarded'` |

### 6.4 TEN-004: Data Export Verification

| Attribute | Value |
|-----------|-------|
| **Control ID** | TEN-004 |
| **Automation Level** | Semi-Automated |
| **Implementation** | pg_dump script |
| **Trigger** | Offboarding/GDPR request |
| **Evidence** | Export file + checksum |

---

## 7. Audit & Logging Controls

### 7.1 LOG-001: Request Correlation

| Attribute | Value |
|-----------|-------|
| **Control ID** | LOG-001 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/middleware/requestId.ts` |
| **Trigger** | Every request |
| **Evidence** | `x-request-id` header in logs |

### 7.2 LOG-002: Audit Event Logging

| Attribute | Value |
|-----------|-------|
| **Control ID** | LOG-002 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/services/auditService.ts` |
| **Trigger** | Security-relevant actions |
| **Evidence** | `audit_logs` table entries |

### 7.3 LOG-003: Metrics Logging

| Attribute | Value |
|-----------|-------|
| **Control ID** | LOG-003 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/index.ts` logging middleware |
| **Trigger** | Every API request |
| **Evidence** | `[METRICS]` log lines |

---

## 8. Security Controls

### 8.1 SEC-001: Security Headers

| Attribute | Value |
|-----------|-------|
| **Control ID** | SEC-001 |
| **Automation Level** | Fully Automated |
| **Implementation** | Helmet.js |
| **Evidence** | Security headers in response |

**Validation**:
```bash
curl -I https://api.example.com/ | grep -E "X-|Content-Security"
```

### 8.2 SEC-002: Production Config Validation

| Attribute | Value |
|-----------|-------|
| **Control ID** | SEC-002 |
| **Automation Level** | Fully Automated |
| **Implementation** | `server/lib/startupValidation.ts` |
| **Trigger** | Server startup |
| **Evidence** | Fatal error on invalid config |

### 8.3 SEC-003: Graceful Shutdown

| Attribute | Value |
|-----------|-------|
| **Control ID** | SEC-003 |
| **Automation Level** | Semi-Automated |
| **Implementation** | `server/lib/gracefulShutdown.ts` |
| **Trigger** | SIGTERM/SIGINT |
| **Evidence** | `[SHUTDOWN]` logs |

---

## 9. Control Validation Schedule

### 9.1 Automated Checks (Continuous)

| Control | Validation Method | Frequency |
|---------|-------------------|-----------|
| AUTH-001 to AUTH-004 | Test suite | Every CI run |
| AUTHZ-001 to AUTHZ-003 | Test suite | Every CI run |
| RATE-001, RATE-002 | Manual spot check | Weekly |
| LOG-001 to LOG-003 | Log inspection | Daily |

### 9.2 Manual Checks (Periodic)

| Control | Validation Method | Frequency |
|---------|-------------------|-----------|
| TEN-001 to TEN-004 | Audit log review | Per operation |
| SEC-001 | Header inspection | Monthly |
| SEC-002 | Startup log review | Per deployment |

---

## 10. Evidence Collection Script

**Script**: `scripts/phase14/collect-control-evidence.sh`

```bash
#!/bin/bash
# Collect evidence for control audit

EVIDENCE_DIR="evidence/$(date +%Y%m%d)"
mkdir -p $EVIDENCE_DIR

echo "=== Collecting Control Evidence ==="

# AUTH controls
echo "AUTH-001: JWT validation test"
npm test -- --run --grep "auth" > $EVIDENCE_DIR/auth-tests.txt

# RATE controls
echo "RATE-002: Rate limit headers"
curl -sI https://api.example.com/api/health/live | grep RateLimit > $EVIDENCE_DIR/rate-headers.txt

# LOG controls
echo "LOG-001: Sample request logs"
grep "\[METRICS\]" /var/log/app.log | tail -100 > $EVIDENCE_DIR/metrics-sample.txt

# SEC controls
echo "SEC-001: Security headers"
curl -sI https://api.example.com/ | grep -E "^(X-|Content-Security|Strict)" > $EVIDENCE_DIR/security-headers.txt

echo "Evidence collected in $EVIDENCE_DIR"
```

---

## 11. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Security Lead | __________ | __________ |

