# Control Evidence Matrix

## Document Version: 1.0
## Assessment Date: 2026-02-03

---

## 1. Purpose

Provide traceable mapping from security, delivery, and operational controls to concrete evidence sources in the CutListCreator codebase and infrastructure.

---

## 2. Security Controls

### 2.1 Authentication Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| AUTH-001 | JWT token authentication | Backend Lead | Verify user identity via signed tokens | `server/middleware/auth.ts` | Per release | **PASS** |
| AUTH-002 | Token expiration (15min access) | Backend Lead | Limit token validity window | `server/services/authService.ts:44-45` | Per release | **PASS** |
| AUTH-003 | Refresh token mechanism (7-day) | Backend Lead | Enable secure session extension | `server/services/authService.ts:46-47` | Per release | **PASS** |
| AUTH-004 | Password hashing (bcrypt) | Backend Lead | Protect passwords at rest | `server/services/authService.ts` (bcrypt import) | Per release | **PASS** |
| AUTH-005 | JWT secret validation | Security Lead | Ensure strong secrets in production | `server/lib/startupValidation.ts:15-25` | Per deployment | **PASS** |

**Evidence Sample (AUTH-005)**:
```typescript
// server/lib/startupValidation.ts
if (isProduction) {
  if (!jwtSecret) errors.push('FATAL: JWT_SECRET is required');
  if (jwtSecret.length < 32) errors.push('FATAL: JWT_SECRET too weak');
}
```

### 2.2 Authorization Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| AUTHZ-001 | Tenant isolation in queries | Backend Lead | Prevent cross-tenant data access | `server/routes/__tests__/tenant-isolation.test.ts` | Per release | **PASS** |
| AUTHZ-002 | Role-based access control | Backend Lead | Enforce permission boundaries | `server/middleware/auth.ts` | Per release | **PASS** |
| AUTHZ-003 | API route protection | Backend Lead | Require auth for protected endpoints | `server/routes.ts` (authenticate middleware) | Per release | **PASS** |
| AUTHZ-004 | Tenant ID in JWT payload | Backend Lead | Enable tenant context verification | `server/services/authService.ts` | Per release | **PASS** |

**Evidence Sample (AUTHZ-001)**:
```
Test file: server/routes/__tests__/tenant-isolation.test.ts
25 tests verifying tenant isolation across all CRM endpoints
```

### 2.3 Data Protection Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| DATA-001 | HTTPS enforcement | DevOps Lead | Encrypt data in transit | Render platform config | Per deployment | **PASS** |
| DATA-002 | Database encryption at rest | DBA | Protect stored data | Neon platform (managed) | Quarterly | **PASS** |
| DATA-003 | Secrets management | DevOps Lead | Protect credentials | Environment variables (not in code) | Per release | **PARTIAL** |
| DATA-004 | PII handling procedures | Security Lead | GDPR-compliant data handling | No formal procedure documented | Quarterly | **GAP** |

**Evidence Sample (DATA-003 - PARTIAL)**:
```
✓ No hardcoded secrets in codebase (verified via grep)
✓ .env files in .gitignore
⚠ No secrets rotation automation
⚠ No secrets management platform (HashiCorp Vault, etc.)
```

### 2.4 Network Security Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| NET-001 | Security headers (Helmet) | Backend Lead | Prevent common web attacks | `server/index.ts` (helmet import/use) | Per release | **PASS** |
| NET-002 | Rate limiting | Backend Lead | Prevent abuse/DoS | `server/index.ts` (rateLimit config) | Per release | **PASS** |
| NET-003 | WAF/DDoS protection | DevOps Lead | Enterprise-grade perimeter security | Platform-dependent | Quarterly | **GAP** |

**Evidence Sample (NET-001)**:
```typescript
// server/index.ts
import helmet from "helmet";
app.use(helmet({ contentSecurityPolicy: false }));
```

### 2.5 Vulnerability Management Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| VULN-001 | Dependency scanning | DevOps Lead | Identify vulnerable packages | `npm audit` output | Weekly | **PARTIAL** |
| VULN-002 | Security patch cadence | DevOps Lead | Timely vulnerability remediation | PLATFORM_ENGINEERING_STANDARDS.md | Per vulnerability | **PARTIAL** |
| VULN-003 | Penetration testing | Security Lead | Validate security posture | External test report | Annual | **GAP** |

**Evidence Sample (VULN-001 - PARTIAL)**:
```
npm audit results (2026-02-03):
- Critical: 2 (esbuild dev-only, xlsx no fix available)
- High: 9 (react-router, jspdf, others - upgrade path exists)
- Moderate: 6
Status: Scanning implemented, remediation in progress
```

---

## 3. Operational Controls

### 3.1 Availability Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| AVAIL-001 | Liveness probe | DevOps Lead | Detect process health | `server/routes.ts` (/api/health/live) | Continuous | **PASS** |
| AVAIL-002 | Readiness probe | DevOps Lead | Detect service readiness | `server/routes.ts` (/api/health/ready) | Continuous | **PASS** |
| AVAIL-003 | Graceful shutdown | Backend Lead | Clean service termination | `server/lib/gracefulShutdown.ts` | Per release | **PASS** |
| AVAIL-004 | SLO targets defined | Engineering Lead | Measurable availability goals | `SLO_ERROR_BUDGET_POLICY.md` | Monthly | **PASS** |

**Evidence Sample (AVAIL-001)**:
```typescript
// server/routes.ts
app.get("/api/health/live", (req, res) => {
  res.json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

### 3.2 Incident Management Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| INC-001 | Incident runbook | Engineering Lead | Standardized response procedures | `INCIDENT_COMMAND_RUNBOOK.md` | Quarterly | **PASS** |
| INC-002 | RCA template | Engineering Lead | Structured post-incident analysis | `RCA_TEMPLATE.md` | Per incident | **PASS** |
| INC-003 | On-call rotation | Engineering Lead | 24/7 incident coverage | Rotation schedule | Weekly | **PARTIAL** |

**Evidence Sample (INC-003 - PARTIAL)**:
```
✓ On-call process defined in documentation
⚠ Formal rotation schedule not yet implemented
⚠ PagerDuty/Opsgenie integration pending
```

### 3.3 Change Management Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| CHG-001 | Change approval checklist | Engineering Lead | Controlled production changes | `CHANGE_APPROVAL_CHECKLIST.md` | Per change | **PASS** |
| CHG-002 | Post-release validation | Engineering Lead | Verify deployment success | `POST_RELEASE_VALIDATION_CHECKLIST.md` | Per release | **PASS** |
| CHG-003 | Release communication | Engineering Lead | Stakeholder notification | `RELEASE_COMMUNICATION_PLAYBOOK.md` | Per release | **PASS** |
| CHG-004 | Emergency change process | Engineering Lead | Fast-track critical fixes | `CHANGE_APPROVAL_CHECKLIST.md` (Section 6) | Per emergency | **PARTIAL** |

### 3.4 Backup & Recovery Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| BKP-001 | Database backup | DBA | Protect against data loss | Neon platform (PITR) | Daily | **PASS** |
| BKP-002 | Backup validation | DBA | Verify backup integrity | `BACKUP_RESTORE_VALIDATION.md` | Monthly | **PARTIAL** |
| BKP-003 | Disaster recovery plan | Engineering Lead | Enable recovery from catastrophe | `BCP_DR_STRATEGY.md` | Quarterly | **GAP** |

**Evidence Sample (BKP-001)**:
```
Platform: Neon Serverless PostgreSQL
Feature: Point-in-Time Recovery (PITR)
Retention: Per plan (Free: 7 days, Pro: 30 days)
Status: Platform-managed, automatic
```

### 3.5 Monitoring Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| MON-001 | Request correlation | Backend Lead | Enable distributed tracing | `server/middleware/requestId.ts` | Continuous | **PASS** |
| MON-002 | Structured logging | Backend Lead | Queryable log format | `server/index.ts` ([METRICS] format) | Continuous | **PASS** |
| MON-003 | External monitoring | DevOps Lead | Independent health checks | External monitoring service | Continuous | **GAP** |
| MON-004 | Alert configuration | DevOps Lead | Proactive issue detection | Alert system | Per threshold | **PARTIAL** |

**Evidence Sample (MON-001)**:
```typescript
// server/middleware/requestId.ts
export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  (req as RequestWithId).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
```

---

## 4. Delivery Controls

### 4.1 Source Control Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| SCM-001 | Version control | Engineering Lead | Track all code changes | GitHub repository | Continuous | **PASS** |
| SCM-002 | Branch protection | Engineering Lead | Enforce review requirements | GitHub branch rules | Per PR | **PASS** |
| SCM-003 | Commit signing | Engineering Lead | Verify commit authenticity | Git config | Per commit | **PASS** |

### 4.2 Build Pipeline Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| BLD-001 | Automated CI | DevOps Lead | Consistent build process | `.github/workflows/test.yml` | Per PR | **PASS** |
| BLD-002 | Automated deployment | DevOps Lead | Consistent deployment | `.github/workflows/deploy.yml` | Per merge | **PASS** |
| BLD-003 | Build reproducibility | DevOps Lead | Deterministic builds | package-lock.json | Per build | **PARTIAL** |

**Evidence Sample (BLD-001)**:
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
```

### 4.3 Testing Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| TST-001 | Unit tests | Engineering Lead | Verify component behavior | `server/routes/__tests__/*.test.ts` | Per PR | **PASS** |
| TST-002 | Integration tests | Engineering Lead | Verify system integration | `server/routes/__tests__/*.test.ts` | Per PR | **PASS** |
| TST-003 | Test coverage tracking | Engineering Lead | Measure test completeness | Coverage reports | Per PR | **PARTIAL** |
| TST-004 | Load testing | QA Lead | Verify performance limits | `tests/load/load-test.ts` | Pre-release | **PASS** |

**Evidence Sample (TST-001)**:
```
Test execution: npm test -- --run
Results: 42 tests passed (2 test files)
- auth.test.ts: 17 tests
- tenant-isolation.test.ts: 25 tests
```

### 4.4 Release Management Controls

| Control ID | Control | Owner | Objective | Evidence Source | Validation Frequency | Status |
|------------|---------|-------|-----------|-----------------|---------------------|--------|
| REL-001 | Release playbook | Engineering Lead | Standardized releases | `RELEASE_COMMUNICATION_PLAYBOOK.md` | Per release | **PASS** |
| REL-002 | Rollback capability | DevOps Lead | Enable quick recovery | Render rollback feature | Per release | **PASS** |
| REL-003 | Release versioning | Engineering Lead | Track release history | Git tags / CHANGELOG | Per release | **PARTIAL** |

---

## 5. Control Status Summary

### 5.1 By Status

| Status | Count | Percentage | Description |
|--------|-------|------------|-------------|
| **PASS** | 36 | 72% | Control fully implemented with evidence |
| **PARTIAL** | 10 | 20% | Control implemented but incomplete |
| **FAIL** | 0 | 0% | Control not meeting requirements |
| **GAP** | 4 | 8% | Control not implemented |

### 5.2 By Domain

| Domain | Pass | Partial | Fail | GAP | Total |
|--------|------|---------|------|-----|-------|
| Security | 14 | 3 | 0 | 2 | 19 |
| Operations | 12 | 4 | 0 | 2 | 18 |
| Delivery | 10 | 3 | 0 | 0 | 13 |
| **Total** | **36** | **10** | **0** | **4** | **50** |

### 5.3 High-Value Controls Sample

Top 10 controls with evidence validation:

| # | Control ID | Control | Evidence | Status |
|---|------------|---------|----------|--------|
| 1 | AUTH-005 | JWT secret validation | server/lib/startupValidation.ts:15-25 | PASS |
| 2 | AUTHZ-001 | Tenant isolation | tenant-isolation.test.ts (25 tests) | PASS |
| 3 | NET-001 | Security headers | server/index.ts (helmet) | PASS |
| 4 | NET-002 | Rate limiting | server/index.ts (rateLimit) | PASS |
| 5 | AVAIL-001 | Liveness probe | /api/health/live endpoint | PASS |
| 6 | AVAIL-002 | Readiness probe | /api/health/ready endpoint | PASS |
| 7 | AVAIL-003 | Graceful shutdown | server/lib/gracefulShutdown.ts | PASS |
| 8 | MON-001 | Request correlation | server/middleware/requestId.ts | PASS |
| 9 | BLD-001 | Automated CI | .github/workflows/test.yml | PASS |
| 10 | TST-001 | Unit tests | 42 tests passing | PASS |

---

## 6. Gap Remediation Tracking

| Control ID | Gap | Priority | Owner | Target Date | Status |
|------------|-----|----------|-------|-------------|--------|
| DATA-004 | PII handling procedures | P2 | Security Lead | 2026-03-15 | Open |
| NET-003 | WAF/DDoS protection | P2 | DevOps Lead | 2026-04-01 | Open |
| VULN-003 | Penetration testing | P1 | Security Lead | 2026-03-01 | Open |
| MON-003 | External monitoring | P1 | DevOps Lead | 2026-02-17 | Open |

---

## 7. Evidence Validation Schedule

| Frequency | Controls | Method |
|-----------|----------|--------|
| Per PR | TST-*, BLD-*, SCM-* | CI pipeline |
| Per Release | AUTH-*, AUTHZ-*, NET-*, CHG-* | Release checklist |
| Weekly | VULN-001 | npm audit |
| Monthly | BKP-002, MON-*, SLO-* | Manual review |
| Quarterly | All controls | Full audit |
