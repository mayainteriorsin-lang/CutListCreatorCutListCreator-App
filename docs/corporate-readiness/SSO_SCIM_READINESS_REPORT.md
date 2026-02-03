# SSO & SCIM Readiness Report

## Document Version: 1.0
## Assessment Date: 2026-02-03

---

## 1. Executive Summary

### Overall SSO/SCIM Readiness: 🔴 NOT READY

CutListCreator does not currently support SSO (SAML/OIDC) or SCIM provisioning. These capabilities are required for enterprise customer onboarding.

| Capability | Status | Risk | Target |
|------------|--------|------|--------|
| SAML 2.0 SSO | 🔴 NOT READY | High | Q2 2026 |
| OIDC SSO | 🔴 NOT READY | High | Q2 2026 |
| SCIM 2.0 | 🔴 NOT READY | Medium | Q3 2026 |
| JIT Provisioning | 🔴 NOT READY | Medium | Q3 2026 |

---

## 2. Current Authentication Architecture

### 2.1 Implementation Details

| Component | Implementation | Evidence |
|-----------|----------------|----------|
| Auth method | JWT Bearer tokens | `server/middleware/auth.ts` |
| User store | PostgreSQL (users table) | `server/db/authSchema.ts` |
| Password storage | bcrypt hash | `server/services/authService.ts` |
| Session management | Refresh tokens | `server/db/authSchema.ts` (refreshTokens) |
| Multi-tenant | tenantId in JWT payload | `server/services/authService.ts:18-23` |

### 2.2 Current Auth Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│  Login  │────▶│  Verify │────▶│  Issue  │
│         │     │  Form   │     │ Password│     │  JWT    │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  Database   │
                              │  (users)    │
                              └─────────────┘
```

### 2.3 Auth Schema Evidence

```typescript
// server/db/authSchema.ts
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('user'),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    // ... other fields
});
```

---

## 3. SAML 2.0 SSO Assessment

### 3.1 Current State: NOT IMPLEMENTED

| SAML Component | Status | Notes |
|----------------|--------|-------|
| Service Provider (SP) | 🔴 Not implemented | No SAML library |
| SP Metadata endpoint | 🔴 Not implemented | - |
| Assertion Consumer Service | 🔴 Not implemented | - |
| Single Logout Service | 🔴 Not implemented | - |
| IdP metadata import | 🔴 Not implemented | - |
| Attribute mapping | 🔴 Not implemented | - |
| Signature validation | 🔴 Not implemented | - |
| Encryption support | 🔴 Not implemented | - |

### 3.2 SAML Implementation Requirements

| Requirement | Priority | Effort |
|-------------|----------|--------|
| Add passport-saml or saml2-js | P0 | 1 day |
| Tenant-specific SAML config model | P0 | 2 days |
| SP metadata generation | P0 | 1 day |
| ACS endpoint | P0 | 2 days |
| IdP metadata parser | P0 | 1 day |
| Attribute mapping config | P1 | 2 days |
| JIT user provisioning | P1 | 2 days |
| Admin UI for SAML config | P1 | 3 days |
| SLO (Single Logout) | P2 | 2 days |
| **Total** | | **~16 days** |

### 3.3 Recommended SAML Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│   IdP   │────▶│   ACS   │────▶│  Issue  │
│         │     │ (Okta,  │     │Endpoint │     │  JWT    │
│         │     │  Azure) │     │         │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  SAML       │
                              │  Config DB  │
                              └─────────────┘
```

### 3.4 SAML Data Model (Proposed)

```typescript
// Proposed: server/db/ssoSchema.ts
export const samlConfigs = pgTable('saml_configs', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id).unique(),
    enabled: boolean('enabled').default(false),
    idpEntityId: varchar('idp_entity_id', { length: 500 }),
    idpSsoUrl: varchar('idp_sso_url', { length: 500 }),
    idpCertificate: text('idp_certificate'),
    spEntityId: varchar('sp_entity_id', { length: 500 }),
    attributeMapping: jsonb('attribute_mapping').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 4. OIDC SSO Assessment

### 4.1 Current State: NOT IMPLEMENTED

| OIDC Component | Status | Notes |
|----------------|--------|-------|
| Authorization endpoint | 🔴 Not implemented | - |
| Callback endpoint | 🔴 Not implemented | - |
| Token exchange | 🔴 Not implemented | - |
| PKCE support | 🔴 Not implemented | - |
| UserInfo parsing | 🔴 Not implemented | - |
| Provider configuration | 🔴 Not implemented | - |

### 4.2 OIDC Implementation Requirements

| Requirement | Priority | Effort |
|-------------|----------|--------|
| Add openid-client library | P0 | 1 day |
| Tenant-specific OIDC config | P0 | 2 days |
| Authorization redirect | P0 | 1 day |
| Callback handler | P0 | 2 days |
| Token validation | P0 | 1 day |
| User attribute extraction | P1 | 1 day |
| JIT provisioning | P1 | 2 days |
| Admin UI for OIDC config | P1 | 2 days |
| **Total** | | **~12 days** |

### 4.3 Supported Providers (Planned)

| Provider | Priority | Notes |
|----------|----------|-------|
| Azure AD | P0 | Enterprise standard |
| Google Workspace | P0 | Common requirement |
| Okta | P0 | Enterprise IdP |
| Auth0 | P1 | Developer-friendly |
| OneLogin | P2 | Enterprise IdP |
| Custom OIDC | P2 | Any compliant IdP |

---

## 5. SCIM 2.0 Assessment

### 5.1 Current State: NOT IMPLEMENTED

| SCIM Endpoint | Status | Notes |
|---------------|--------|-------|
| GET /scim/v2/Users | 🔴 Not implemented | List/get users |
| POST /scim/v2/Users | 🔴 Not implemented | Create user |
| PUT /scim/v2/Users/{id} | 🔴 Not implemented | Replace user |
| PATCH /scim/v2/Users/{id} | 🔴 Not implemented | Update user |
| DELETE /scim/v2/Users/{id} | 🔴 Not implemented | Delete user |
| GET /scim/v2/Groups | 🔴 Not implemented | List/get groups |
| POST /scim/v2/Groups | 🔴 Not implemented | Create group |
| ServiceProviderConfig | 🔴 Not implemented | SCIM config |
| ResourceTypes | 🔴 Not implemented | Resource schema |
| Schemas | 🔴 Not implemented | Schema definitions |

### 5.2 SCIM Implementation Requirements

| Requirement | Priority | Effort |
|-------------|----------|--------|
| SCIM schema definitions | P0 | 2 days |
| User CRUD endpoints | P0 | 4 days |
| Filtering support | P0 | 2 days |
| Pagination support | P0 | 1 day |
| Group CRUD endpoints | P1 | 3 days |
| Attribute mapping | P1 | 2 days |
| Bulk operations | P2 | 3 days |
| SCIM token auth | P0 | 1 day |
| **Total** | | **~18 days** |

### 5.3 SCIM Attribute Mapping (Proposed)

| SCIM Attribute | CutListCreator Field | Required |
|----------------|---------------------|----------|
| userName | email | Yes |
| name.givenName | fullName (parsed) | No |
| name.familyName | fullName (parsed) | No |
| displayName | fullName | No |
| emails[primary] | email | Yes |
| active | status = 'active' | Yes |
| externalId | externalId (new field) | No |

---

## 6. JIT (Just-in-Time) Provisioning

### 6.1 Current State: NOT IMPLEMENTED

| JIT Capability | Status | Notes |
|----------------|--------|-------|
| Create user on first SSO | 🔴 Not implemented | - |
| Update user on SSO | 🔴 Not implemented | - |
| Role mapping | 🔴 Not implemented | - |
| Group membership sync | 🔴 Not implemented | - |

### 6.2 JIT Flow (Proposed)

```
SSO Login
    │
    ▼
┌─────────────────┐
│ User exists in  │──── Yes ────▶ Update attributes
│ database?       │              │
└─────────────────┘              │
    │ No                         │
    ▼                            │
┌─────────────────┐              │
│ JIT enabled for │──── No ─────▶ Reject login
│ tenant?         │
└─────────────────┘
    │ Yes
    ▼
Create user with
mapped attributes ───────────────▶ Issue JWT
```

---

## 7. Security Considerations

### 7.1 SSO Security Requirements

| Requirement | Priority | Status |
|-------------|----------|--------|
| SAML signature validation | P0 | Not implemented |
| SAML assertion encryption | P1 | Not implemented |
| OIDC token validation | P0 | Not implemented |
| PKCE for OIDC | P0 | Not implemented |
| State parameter validation | P0 | Not implemented |
| Nonce validation | P1 | Not implemented |
| Certificate rotation | P1 | Not implemented |

### 7.2 SCIM Security Requirements

| Requirement | Priority | Status |
|-------------|----------|--------|
| Bearer token authentication | P0 | Not implemented |
| Token per-tenant isolation | P0 | Not implemented |
| Rate limiting | P0 | Global only |
| Audit logging | P0 | Partial (generic) |
| IP allowlisting | P2 | Not implemented |

---

## 8. Testing Requirements

### 8.1 SSO Testing

| Test Type | Tools | Status |
|-----------|-------|--------|
| SAML validation | samltool.com | Not tested |
| Okta integration | Okta developer | Not tested |
| Azure AD integration | Azure portal | Not tested |
| Google Workspace | Google admin | Not tested |

### 8.2 SCIM Testing

| Test Type | Tools | Status |
|-----------|-------|--------|
| SCIM compliance | scimtester.com | Not tested |
| Okta SCIM | Okta SCIM test | Not tested |
| Azure AD SCIM | Azure provisioning | Not tested |

---

## 9. Implementation Timeline

### Phase 1: SSO (Q2 2026, Weeks 1-8)

| Week | Deliverable |
|------|-------------|
| 1 | SAML library integration, config model |
| 2 | SP metadata endpoint, ACS endpoint |
| 3 | IdP metadata import, attribute mapping |
| 4 | SAML testing with Okta/Azure |
| 5 | OIDC library integration, config model |
| 6 | OIDC authorization flow |
| 7 | OIDC testing with providers |
| 8 | Admin UI for SSO configuration |

### Phase 2: SCIM (Q3 2026, Weeks 1-6)

| Week | Deliverable |
|------|-------------|
| 1 | SCIM schema, User GET/POST |
| 2 | User PUT/PATCH/DELETE |
| 3 | Filtering and pagination |
| 4 | Group endpoints |
| 5 | Attribute mapping configuration |
| 6 | Integration testing |

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SSO not ready for enterprise deal | High | High | Prioritize Q2 delivery |
| SCIM compatibility issues | Medium | Medium | Use standard libraries, test early |
| Security vulnerabilities in SSO | Medium | High | Security review, pen testing |
| IdP-specific quirks | High | Low | Document per-IdP configurations |

---

## 11. Recommendations

1. **Immediate (This Quarter)**:
   - Select SAML/OIDC libraries (passport-saml, openid-client)
   - Design SSO database schema
   - Create SSO feature flag

2. **Q2 2026**:
   - Implement SAML 2.0 SSO
   - Implement OIDC SSO
   - Test with major IdPs (Okta, Azure AD, Google)

3. **Q3 2026**:
   - Implement SCIM 2.0
   - JIT provisioning
   - SCIM testing with major IdPs

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Security Lead | __________ | __________ |
| Product Lead | __________ | __________ |
