# Enterprise Pilot Readiness Checklist

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

This checklist validates that CutListCreator is ready to onboard an enterprise pilot customer. All items must be verified before provisioning a new enterprise tenant.

---

## 2. Pre-Onboarding Qualification

### 2.1 Customer Profile Validation

Before proceeding, verify the customer meets the approved pilot profile:

| Requirement | Customer Response | Verified |
|-------------|------------------|----------|
| Accepts email/password authentication | ☐ Yes | ☐ |
| Accepts US data residency | ☐ Yes | ☐ |
| User count < 100 | ☐ Yes (count: ___) | ☐ |
| No SCIM requirement | ☐ Yes | ☐ |
| Standard SLA (99.5%) acceptable | ☐ Yes | ☐ |

**If ANY requirement is not met, STOP. Customer cannot be onboarded as pilot.**

### 2.2 Contract Prerequisites

| Item | Status | Date |
|------|--------|------|
| MSA signed | ☐ | ______ |
| DPA executed (if applicable) | ☐ | ______ |
| Order form/SOW signed | ☐ | ______ |
| Payment terms agreed | ☐ | ______ |

---

## 3. Technical Readiness Validation

### 3.1 Platform Health

Run the validation script:
```bash
./scripts/phase14/validate-pilot-readiness.sh
```

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Auth middleware | Present | | ☐ |
| Tenant suspension check | Implemented | | ☐ |
| Per-tenant rate limiting | Implemented | | ☐ |
| Health endpoints | Responding | | ☐ |
| Test suite | All pass | | ☐ |

### 3.2 Security Controls

| Control | Status | Evidence |
|---------|--------|----------|
| JWT authentication active | ☐ | API returns 401 without token |
| Password hashing (bcrypt) | ☐ | authService.ts uses bcrypt |
| Rate limiting active | ☐ | 429 response on limit exceed |
| Audit logging active | ☐ | audit_logs table populated |
| HTTPS enforced | ☐ | HTTP redirects to HTTPS |

### 3.3 Multi-Tenant Isolation

| Check | Status | Evidence |
|-------|--------|----------|
| Tenant ID in JWT | ☐ | Token payload includes tenantId |
| Query filtering by tenant | ☐ | All data queries include tenant filter |
| Cross-tenant access blocked | ☐ | 403 on cross-tenant request |

---

## 4. Operational Readiness

### 4.1 Support Readiness

| Item | Status | Owner |
|------|--------|-------|
| Support contact defined | ☐ | ______ |
| Escalation path documented | ☐ | ______ |
| SLA response times agreed | ☐ | ______ |
| Monitoring alerts configured | ☐ | ______ |

### 4.2 Documentation Available

| Document | Location | Verified |
|----------|----------|----------|
| User guide | docs/user-guide/ | ☐ |
| API documentation | /api/docs (future) | ☐ |
| Incident runbook | docs/corporate-readiness/INCIDENT_COMMAND_RUNBOOK.md | ☐ |
| Integration guide | docs/corporate-readiness/INTEGRATION_OPERATIONS_RUNBOOK.md | ☐ |

---

## 5. Tenant Provisioning Checklist

### 5.1 Tenant Creation

```sql
-- Create enterprise tenant
INSERT INTO tenants (name, slug, plan, status, settings)
VALUES (
    '<Customer Name>',
    '<customer-slug>',
    'enterprise',
    'active',
    '{"onboardedAt": "<ISO-date>", "pilotCustomer": true}'
);
```

| Step | Command/Action | Verified |
|------|----------------|----------|
| Tenant record created | SQL above | ☐ |
| Plan set to 'enterprise' | Verify plan column | ☐ |
| Status set to 'active' | Verify status column | ☐ |
| Settings populated | Verify settings JSON | ☐ |

### 5.2 Admin User Creation

```sql
-- Create admin user for tenant
INSERT INTO users (email, password_hash, full_name, role, tenant_id, email_verified)
VALUES (
    '<admin@customer.com>',
    '<bcrypt-hash>',
    '<Admin Name>',
    'admin',
    '<tenant-uuid>',
    true  -- Manually verified for enterprise pilot
);
```

| Step | Verified |
|------|----------|
| Admin user created | ☐ |
| Role set to 'admin' | ☐ |
| Tenant ID linked | ☐ |
| Email marked verified | ☐ |
| Temporary password communicated securely | ☐ |

### 5.3 Post-Provisioning Verification

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Admin can log in | Login succeeds | | ☐ |
| JWT contains correct tenantId | Tenant UUID | | ☐ |
| Data isolation verified | No cross-tenant data | | ☐ |
| Rate limits respected | Headers present | | ☐ |

---

## 6. Go-Live Validation

### 6.1 Smoke Tests

| Test | Steps | Expected | Pass |
|------|-------|----------|------|
| Login | POST /api/auth/login | 200 + tokens | ☐ |
| Get user | GET /api/auth/me | User object | ☐ |
| Create quotation | POST /api/quotations | 201 + ID | ☐ |
| List quotations | GET /api/quotations | Array (tenant only) | ☐ |
| Rate limit headers | Any authenticated request | X-RateLimit-* present | ☐ |

### 6.2 Monitoring Confirmation

| Alert | Threshold | Configured |
|-------|-----------|------------|
| Error rate | > 5% | ☐ |
| Response time | > 2s p95 | ☐ |
| Rate limit hits | > 50% of limit | ☐ |
| Auth failures | > 10/min | ☐ |

---

## 7. Customer Handoff

### 7.1 Credentials Delivery

| Item | Method | Delivered |
|------|--------|-----------|
| Admin email | Pre-agreed | ☐ |
| Temporary password | Secure channel (1Password, encrypted email) | ☐ |
| Password change required | First login | ☐ |

### 7.2 Onboarding Meeting

| Agenda Item | Covered |
|-------------|---------|
| Platform walkthrough | ☐ |
| Support contacts | ☐ |
| Escalation procedures | ☐ |
| Feature limitations (SSO/SCIM roadmap) | ☐ |
| Feedback collection plan | ☐ |

---

## 8. Final Sign-Off

### 8.1 Pilot Readiness Declaration

| Statement | Verified By | Date |
|-----------|-------------|------|
| Technical readiness validated | __________ | ______ |
| Security controls confirmed | __________ | ______ |
| Operational support ready | __________ | ______ |
| Customer qualified for pilot | __________ | ______ |

### 8.2 Approval

**PILOT CUSTOMER**: ____________________________

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| Customer Success | | | |
| Product Lead | | | |

---

## 9. Post-Onboarding Monitoring (First 7 Days)

| Day | Check | Status | Notes |
|-----|-------|--------|-------|
| Day 1 | Login successful | ☐ | |
| Day 1 | First feature used | ☐ | |
| Day 2 | No error alerts | ☐ | |
| Day 3 | Customer check-in | ☐ | |
| Day 7 | Weekly review | ☐ | |

---

**Document Owner**: Engineering Lead
**Review Frequency**: Before each pilot onboarding

