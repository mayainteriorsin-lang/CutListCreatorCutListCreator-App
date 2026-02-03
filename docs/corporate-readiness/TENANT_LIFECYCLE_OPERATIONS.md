# Tenant Lifecycle Operations

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define operational procedures for tenant lifecycle management including onboarding, plan changes, suspension, offboarding, and data export.

---

## 2. Tenant Lifecycle Overview

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ Onboarding │───▶│  Active    │───▶│ Suspended  │───▶│ Offboarded │
│            │    │            │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                        │                  │
                        │    ┌─────────┐   │
                        └───▶│  Plan   │◀──┘
                             │ Change  │
                             └─────────┘
```

---

## 3. Tenant Data Model

### 3.1 Current Schema

```typescript
// server/db/authSchema.ts
export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    plan: varchar('plan', { length: 50 }).default('free'),
    status: varchar('status', { length: 50 }).default('active'),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Evidence Path**: `server/db/authSchema.ts:7-18`

### 3.2 Tenant Status Values

| Status | Description | User Access |
|--------|-------------|-------------|
| `active` | Normal operation | Full access |
| `trial` | Trial period | Full access (time-limited) |
| `suspended` | Payment/policy issue | Read-only or blocked |
| `offboarded` | Terminated | No access |

### 3.3 Plan Values

| Plan | Description | Limits |
|------|-------------|--------|
| `free` | Free tier | Basic limits |
| `starter` | Paid starter | Standard limits |
| `professional` | Professional tier | Higher limits |
| `enterprise` | Enterprise tier | Custom limits |

---

## 4. Onboarding Operations

### 4.1 Self-Service Onboarding

| Step | Status | Evidence |
|------|--------|----------|
| Registration form | ✅ READY | `POST /api/auth/register` |
| Tenant creation | ✅ READY | `authService.register()` |
| Admin user creation | ✅ READY | First user is admin |
| Email verification | 🟡 PARTIAL | Field exists, flow incomplete |
| Welcome email | 🔴 NOT READY | Not implemented |

**Current Registration Flow**:
```typescript
// server/services/authService.ts
async register(params: RegisterParams): Promise<LoginResponse> {
    // 1. Check if email exists
    // 2. Create tenant
    // 3. Hash password
    // 4. Create admin user
    // 5. Generate tokens
    return { accessToken, refreshToken, user };
}
```

### 4.2 Enterprise Onboarding

| Step | Status | Owner |
|------|--------|-------|
| Sales handoff | 🔴 NOT READY | Sales/Product |
| Contract signed | 🔴 NOT READY | Legal |
| Tenant provisioning | 🟡 MANUAL | Engineering |
| SSO configuration | 🔴 NOT READY | Engineering |
| User provisioning | 🟡 MANUAL | Customer/Engineering |
| Training | 🔴 NOT READY | Customer Success |
| Go-live | 🟡 MANUAL | Engineering |

### 4.3 Enterprise Onboarding Checklist

```markdown
## Enterprise Onboarding Checklist

### Pre-Onboarding
- [ ] Contract signed
- [ ] Technical requirements documented
- [ ] SSO details received (if applicable)
- [ ] User list received (if bulk provisioning)
- [ ] Success criteria defined

### Provisioning
- [ ] Tenant created in database
- [ ] Plan set to 'enterprise'
- [ ] Custom settings configured
- [ ] SSO configured (if applicable)
- [ ] Admin users created
- [ ] Rate limits adjusted (if needed)

### Validation
- [ ] Admin can log in
- [ ] SSO works (if configured)
- [ ] Core functionality verified
- [ ] Integrations tested (if applicable)

### Handoff
- [ ] Documentation provided
- [ ] Support contacts shared
- [ ] Training scheduled
- [ ] Go-live date confirmed
```

---

## 5. Plan Change Operations

### 5.1 Current Capabilities

| Operation | Status | Evidence |
|-----------|--------|----------|
| Plan field in DB | ✅ READY | `tenants.plan` column |
| Plan upgrade API | 🔴 NOT READY | Not implemented |
| Plan downgrade API | 🔴 NOT READY | Not implemented |
| Limit enforcement | 🔴 NOT READY | Not implemented |
| Billing integration | 🔴 NOT READY | Not implemented |

### 5.2 Plan Change Procedure (Manual)

```markdown
## Manual Plan Change Procedure

### Request
1. Receive plan change request
2. Verify authorization
3. Document change

### Execution
1. Update tenant plan in database:
   ```sql
   UPDATE tenants SET plan = 'professional', updated_at = NOW()
   WHERE id = 'tenant-uuid';
   ```
2. Update any plan-specific settings
3. Adjust rate limits if needed

### Verification
1. Verify plan updated
2. Test user access
3. Confirm limit changes

### Documentation
1. Update customer record
2. Notify customer
3. Update billing (if applicable)
```

### 5.3 Plan Limits (Proposed)

| Limit | Free | Starter | Professional | Enterprise |
|-------|------|---------|--------------|------------|
| Users | 5 | 20 | 100 | Unlimited |
| Projects | 10 | 50 | 200 | Unlimited |
| Storage | 100MB | 1GB | 10GB | Custom |
| API calls/15min | 100 | 500 | 2000 | Custom |
| SSO | ❌ | ❌ | ❌ | ✅ |
| SCIM | ❌ | ❌ | ❌ | ✅ |
| SLA | None | 99% | 99.5% | 99.9% |

---

## 6. Suspension Operations

### 6.1 Current Capabilities

| Operation | Status | Evidence |
|-----------|--------|----------|
| Status field in DB | ✅ READY | `tenants.status` column |
| Suspend API | 🔴 NOT READY | Not implemented |
| Access blocking | 🔴 NOT READY | Not implemented |
| Reinstate API | 🔴 NOT READY | Not implemented |
| Notification | 🔴 NOT READY | Not implemented |

### 6.2 Suspension Triggers

| Trigger | Priority | Auto/Manual |
|---------|----------|-------------|
| Payment failure | P0 | Auto (with billing) |
| Terms violation | P0 | Manual |
| Security incident | P0 | Manual |
| Customer request | P1 | Manual |
| Inactivity | P2 | Auto (future) |

### 6.3 Suspension Procedure (Manual)

```markdown
## Manual Suspension Procedure

### Authorization
1. Verify suspension is authorized
2. Document reason

### Execution
1. Update tenant status:
   ```sql
   UPDATE tenants SET status = 'suspended', updated_at = NOW()
   WHERE id = 'tenant-uuid';
   ```
2. Note: Current system does NOT block access based on status

### Communication
1. Email tenant admins (manual)
2. Document in CRM

### GAP: Access Blocking
Currently, the system does not check tenant status on API requests.
Middleware enhancement needed to enforce suspension.
```

### 6.4 Reinstatement Procedure

```markdown
## Manual Reinstatement Procedure

### Authorization
1. Verify reinstatement is authorized
2. Resolve original issue

### Execution
1. Update tenant status:
   ```sql
   UPDATE tenants SET status = 'active', updated_at = NOW()
   WHERE id = 'tenant-uuid';
   ```

### Communication
1. Email tenant admins
2. Document in CRM
```

---

## 7. Offboarding Operations

### 7.1 Current Capabilities

| Operation | Status | Evidence |
|-----------|--------|----------|
| Soft delete | 🔴 NOT READY | Not implemented |
| Hard delete | 🟡 PARTIAL | Cascade delete via FK |
| Data export | 🔴 NOT READY | Not implemented |
| Grace period | 🔴 NOT READY | Not implemented |

### 7.2 Offboarding Triggers

| Trigger | Priority | Grace Period |
|---------|----------|--------------|
| Customer request | P1 | 30 days |
| Contract end | P1 | 30 days |
| Extended non-payment | P2 | 60 days |
| Terms violation | P0 | None |

### 7.3 Offboarding Procedure (Manual)

```markdown
## Manual Offboarding Procedure

### Pre-Offboarding (30-day notice)
1. Notify customer of pending offboarding
2. Provide data export instructions (GAP - not implemented)
3. Set offboarding date

### Data Export (GAP)
Currently not implemented. Manual database export required.

### Offboarding Execution
1. Update tenant status:
   ```sql
   UPDATE tenants SET status = 'offboarded', updated_at = NOW()
   WHERE id = 'tenant-uuid';
   ```

### Data Deletion (if required)
1. Export final backup
2. Delete tenant (cascades to users, data):
   ```sql
   DELETE FROM tenants WHERE id = 'tenant-uuid';
   ```
3. Verify deletion
4. Document completion

### Post-Offboarding
1. Archive any contracts/communications
2. Remove from billing system
3. Close support tickets
```

---

## 8. Data Export Operations

### 8.1 Current Capabilities

| Operation | Status | Notes |
|-----------|--------|-------|
| User data export | 🔴 NOT READY | Not implemented |
| Project data export | 🔴 NOT READY | Not implemented |
| Audit log export | 🔴 NOT READY | Not implemented |
| Full tenant export | 🔴 NOT READY | Not implemented |

### 8.2 GDPR Data Portability Requirements

| Requirement | Status | Gap |
|-------------|--------|-----|
| Personal data export | 🔴 GAP | API not implemented |
| Machine-readable format | 🔴 GAP | JSON/CSV export needed |
| Complete data | 🔴 GAP | Must include all user data |
| Timely response | 🔴 GAP | 30-day SLA not automated |

### 8.3 Proposed Export API

```typescript
// Proposed: GET /api/admin/export
// Returns ZIP file with:
// - users.json: All tenant users
// - projects.json: All projects
// - audit_logs.json: Audit trail
// - settings.json: Tenant settings
```

---

## 9. Automation Roadmap

### 9.1 Current State: Mostly Manual

| Operation | Current | Target |
|-----------|---------|--------|
| Onboarding | Manual DB + API | Self-service + Enterprise workflow |
| Plan change | Manual DB | Self-service + Admin API |
| Suspension | Manual DB | Automated triggers + API |
| Offboarding | Manual DB | Workflow with grace period |
| Data export | Manual query | Self-service API |

### 9.2 Implementation Priority

| Feature | Priority | Effort | Target |
|---------|----------|--------|--------|
| Tenant status enforcement | P0 | 2 days | Q1 2026 |
| Plan limit enforcement | P1 | 1 week | Q2 2026 |
| Suspension API | P1 | 3 days | Q2 2026 |
| Data export API | P1 | 1 week | Q2 2026 |
| Billing integration | P2 | 2 weeks | Q3 2026 |
| Self-service plan change | P2 | 1 week | Q3 2026 |

---

## 10. Operational Ownership

| Operation | Owner | Backup |
|-----------|-------|--------|
| Self-service onboarding | System (automated) | Engineering |
| Enterprise onboarding | Customer Success | Engineering |
| Plan changes | Customer Success | Engineering |
| Suspension | Customer Success | Engineering |
| Offboarding | Customer Success | Engineering |
| Data export | Customer Success | Engineering |

---

## 11. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Customer Success Lead | __________ | __________ |
| Product Lead | __________ | __________ |
