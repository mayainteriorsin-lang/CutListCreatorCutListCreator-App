# Tenant Lifecycle Automation Playbook

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

This playbook defines automated and semi-automated procedures for managing tenant lifecycle events with auditable checkpoints. It converts the manual procedures from Phase 13 into repeatable, controlled operations.

---

## 2. Lifecycle State Machine

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PENDING   │────▶│   ACTIVE    │────▶│  SUSPENDED  │────▶│ OFFBOARDED  │
│  (created)  │     │             │     │             │     │  (deleted)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                  │
                           │    ┌──────┐      │
                           └───▶│TRIAL │◀─────┘
                                └──────┘
```

**State Transitions**:

| From | To | Trigger | Automated |
|------|-----|---------|-----------|
| pending | active | Onboarding complete | Manual |
| active | suspended | Payment/policy issue | Manual |
| suspended | active | Issue resolved | Manual |
| active | offboarded | Customer request | Manual |
| suspended | offboarded | Grace period expired | Semi-auto |

---

## 3. Onboarding Automation

### 3.1 Enterprise Onboarding Procedure

**Automation Level**: Semi-automated (checklist-driven)

#### Step 1: Pre-Qualification (Manual)

```markdown
## Pre-Qualification Checklist
- [ ] Customer meets pilot profile (per Phase 13)
- [ ] Contract signed
- [ ] Technical requirements documented
- [ ] Success criteria defined
```

#### Step 2: Tenant Creation (Script-Assisted)

**Script**: `scripts/phase14/create-tenant.sql`

```sql
-- PHASE 14: Enterprise Tenant Creation Template
-- Run with verified parameters only

-- 1. Create tenant
INSERT INTO tenants (id, name, slug, plan, status, settings, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    :tenant_name,           -- 'Acme Corporation'
    :tenant_slug,           -- 'acme-corp-abc123'
    'enterprise',
    'active',
    jsonb_build_object(
        'onboardedAt', now()::text,
        'pilotCustomer', true,
        'onboardedBy', :onboarded_by,
        'contractRef', :contract_ref
    ),
    now(),
    now()
)
RETURNING id AS tenant_id;

-- 2. Store tenant_id for next steps
-- Use returned tenant_id in subsequent commands
```

**Audit Checkpoint**:
```sql
-- Log tenant creation
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
VALUES (
    :tenant_id,
    NULL,  -- System action
    'tenant.created',
    'tenant',
    :tenant_id,
    jsonb_build_object('plan', 'enterprise', 'status', 'active')
);
```

#### Step 3: Admin User Creation (Script-Assisted)

```sql
-- Create admin user
INSERT INTO users (id, email, password_hash, full_name, role, tenant_id, email_verified, created_at)
VALUES (
    gen_random_uuid(),
    :admin_email,
    :password_hash,  -- Generated via: SELECT crypt(:password, gen_salt('bf', 10))
    :admin_name,
    'admin',
    :tenant_id,
    true,  -- Manually verified for enterprise
    now()
)
RETURNING id AS user_id;

-- Log user creation
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
VALUES (
    :tenant_id,
    :user_id,
    'user.created',
    'user',
    :user_id,
    jsonb_build_object('role', 'admin', 'email_verified', true)
);
```

#### Step 4: Verification (Automated Script)

**Script**: `scripts/phase14/verify-tenant.sh`

```bash
#!/bin/bash
# Verify tenant provisioning

TENANT_ID=$1

echo "Verifying tenant: $TENANT_ID"

# Check tenant exists and active
psql $DATABASE_URL -c "
  SELECT id, name, status, plan
  FROM tenants
  WHERE id = '$TENANT_ID'
  AND status = 'active'
  AND plan = 'enterprise';
"

# Check admin user exists
psql $DATABASE_URL -c "
  SELECT id, email, role, email_verified
  FROM users
  WHERE tenant_id = '$TENANT_ID'
  AND role = 'admin';
"

# Check audit logs created
psql $DATABASE_URL -c "
  SELECT action, created_at
  FROM audit_logs
  WHERE tenant_id = '$TENANT_ID'
  ORDER BY created_at DESC
  LIMIT 5;
"

echo "Verification complete"
```

---

## 4. Suspension Automation

### 4.1 Suspension Procedure

**Automation Level**: Manual trigger, automated enforcement

#### Step 1: Initiate Suspension (Manual)

**Authorization Required**: Customer Success Lead or Engineering Lead

```sql
-- Suspend tenant
UPDATE tenants
SET
    status = 'suspended',
    updated_at = now(),
    settings = settings || jsonb_build_object(
        'suspendedAt', now()::text,
        'suspendedBy', :operator_email,
        'suspensionReason', :reason
    )
WHERE id = :tenant_id;

-- Log suspension
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
VALUES (
    :tenant_id,
    NULL,
    'tenant.suspended',
    'tenant',
    :tenant_id,
    jsonb_build_object('reason', :reason, 'operator', :operator_email)
);
```

#### Step 2: Automated Enforcement (PHASE 14 Implementation)

**Enforcement Point**: `server/middleware/auth.ts`

```typescript
// PHASE 14: Automatic enforcement via tenant status check
if (tenantStatus === 'suspended') {
    return res.status(403).json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
        code: 'TENANT_SUSPENDED'
    });
}
```

**Cache Invalidation**: Status cache TTL is 5 minutes. For immediate effect:
```sql
-- Force cache refresh by updating timestamp
UPDATE tenants SET updated_at = now() WHERE id = :tenant_id;
```

#### Step 3: Communication (Manual)

```markdown
## Suspension Notification Template

Subject: Important: Your CutListCreator Account Has Been Suspended

Dear [Customer Name],

Your CutListCreator account has been suspended due to [reason].

To resolve this issue, please:
1. [Resolution steps]
2. Contact support@cutlistcreator.com

Your data remains safe and will be available once the account is reinstated.

Regards,
CutListCreator Support
```

---

## 5. Reinstatement Automation

### 5.1 Reinstatement Procedure

**Automation Level**: Manual trigger, automatic effect

```sql
-- Reinstate tenant
UPDATE tenants
SET
    status = 'active',
    updated_at = now(),
    settings = settings || jsonb_build_object(
        'reinstatedAt', now()::text,
        'reinstatedBy', :operator_email
    )
WHERE id = :tenant_id;

-- Log reinstatement
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
VALUES (
    :tenant_id,
    NULL,
    'tenant.reinstated',
    'tenant',
    :tenant_id,
    jsonb_build_object('previousStatus', 'suspended', 'operator', :operator_email)
);
```

**Effect**: Users regain access within 5 minutes (cache TTL) or immediately upon next login.

---

## 6. Offboarding Automation

### 6.1 Offboarding Procedure

**Automation Level**: Manual with auditable checkpoints

#### Step 1: Initiate Offboarding (Manual)

**Grace Period**: 30 days (configurable)

```sql
-- Mark for offboarding
UPDATE tenants
SET
    status = 'offboarding',
    updated_at = now(),
    settings = settings || jsonb_build_object(
        'offboardingInitiated', now()::text,
        'offboardingDeadline', (now() + interval '30 days')::text,
        'offboardingReason', :reason,
        'initiatedBy', :operator_email
    )
WHERE id = :tenant_id;

-- Log offboarding initiation
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
VALUES (
    :tenant_id,
    NULL,
    'tenant.offboarding_initiated',
    'tenant',
    :tenant_id,
    jsonb_build_object('deadline', (now() + interval '30 days')::text, 'reason', :reason)
);
```

#### Step 2: Data Export (Manual - GAP)

**Current Status**: Manual database export
**Target**: Self-service API (Q2 2026)

```bash
# Manual export procedure
pg_dump $DATABASE_URL \
  --table=quotations \
  --table=users \
  --where="tenant_id='$TENANT_ID'" \
  -f "export_${TENANT_ID}_$(date +%Y%m%d).sql"
```

#### Step 3: Final Offboarding (Manual)

```sql
-- Complete offboarding
UPDATE tenants
SET
    status = 'offboarded',
    updated_at = now(),
    settings = settings || jsonb_build_object(
        'offboardedAt', now()::text,
        'dataExported', :data_exported,
        'finalizedBy', :operator_email
    )
WHERE id = :tenant_id;

-- Log completion
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
VALUES (
    :tenant_id,
    NULL,
    'tenant.offboarded',
    'tenant',
    :tenant_id,
    jsonb_build_object('dataExported', :data_exported)
);
```

#### Step 4: Data Deletion (Optional - After Retention Period)

```sql
-- WARNING: Destructive operation
-- Only execute after retention period (90 days default)
-- Requires CTO approval

-- Delete tenant cascade
DELETE FROM tenants WHERE id = :tenant_id;

-- Note: Foreign key cascade will delete:
-- - users
-- - audit_logs
-- - quotations
-- - etc.
```

---

## 7. Automation Scripts Summary

| Script | Purpose | Location |
|--------|---------|----------|
| create-tenant.sql | Template for tenant creation | scripts/phase14/ |
| verify-tenant.sh | Post-creation verification | scripts/phase14/ |
| suspend-tenant.sql | Suspension template | scripts/phase14/ |
| reinstate-tenant.sql | Reinstatement template | scripts/phase14/ |
| export-tenant-data.sh | Data export procedure | scripts/phase14/ |
| offboard-tenant.sql | Offboarding template | scripts/phase14/ |

---

## 8. Audit Trail Requirements

### 8.1 Required Audit Events

| Event | When | Logged |
|-------|------|--------|
| tenant.created | Onboarding | ✅ |
| tenant.suspended | Suspension | ✅ |
| tenant.reinstated | Reinstatement | ✅ |
| tenant.offboarding_initiated | Offboarding start | ✅ |
| tenant.offboarded | Offboarding complete | ✅ |
| user.created | User provisioning | ✅ |
| user.email_verified | Email verification | ✅ |

### 8.2 Audit Log Query

```sql
-- View tenant lifecycle events
SELECT
    action,
    changes,
    created_at
FROM audit_logs
WHERE tenant_id = :tenant_id
    AND action LIKE 'tenant.%'
ORDER BY created_at DESC;
```

---

## 9. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Customer Success Lead | __________ | __________ |

