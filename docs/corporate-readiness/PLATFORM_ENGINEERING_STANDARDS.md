# Platform Engineering Standards

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Standardize engineering workflows for safer changes across dependency updates, schema changes, releases, and post-release validation.

---

## 2. Dependency Update Standards

### 2.1 Update Cadence

| Dependency Type | Review Cadence | Update Policy |
|-----------------|----------------|---------------|
| Security patches | Immediate | Apply within 7 days (critical), 30 days (high) |
| Minor versions | Weekly | Batch and test weekly |
| Major versions | Monthly | Plan and test individually |
| Dev dependencies | Monthly | Lower priority |

### 2.2 Dependency Update Checklist

```markdown
## Dependency Update Checklist

### Pre-Update
- [ ] Run `npm audit` to identify current vulnerabilities
- [ ] Review changelog for target version
- [ ] Check for breaking changes
- [ ] Identify affected code paths
- [ ] Verify test coverage for affected areas

### Update Process
- [ ] Create feature branch: `deps/[package-name]-[version]`
- [ ] Run `npm update [package]` or edit package.json
- [ ] Run `npm install` to update lockfile
- [ ] Run full test suite: `npm test -- --run`
- [ ] Run type check: `npm run check`
- [ ] Manual smoke test of affected features

### Validation
- [ ] All tests pass
- [ ] No new TypeScript errors in touched code
- [ ] No console errors in browser
- [ ] Performance not degraded (subjective check)

### Documentation
- [ ] Update CHANGELOG.md if significant
- [ ] Document any migration steps needed
- [ ] Note any behavior changes

### PR Requirements
- [ ] Link to changelog/release notes
- [ ] Describe why update is needed
- [ ] List any breaking changes addressed
- [ ] Include test results summary
```

### 2.3 Dependency Freeze Periods

| Period | Duration | Rationale |
|--------|----------|-----------|
| Pre-release | 3 days before release | Stability |
| Post-release | 2 days after release | Observation |
| Incident active | Until resolved | Focus |
| Holiday periods | As defined | Coverage |

---

## 3. Schema Change Standards

### 3.1 Schema Change Classification

| Type | Examples | Review Level |
|------|----------|--------------|
| **Additive** | New column (nullable), new table | Standard review |
| **Modify** | Column type change, constraint change | ARB review |
| **Destructive** | Drop column, drop table | ARB + data review |
| **Data migration** | Backfill, transform existing data | ARB + DBA review |

### 3.2 Schema Change Checklist

```markdown
## Schema Change Checklist

### Planning
- [ ] Document the change and rationale
- [ ] Identify all affected queries/code
- [ ] Assess data migration needs
- [ ] Estimate downtime (if any)
- [ ] Plan rollback strategy

### Development
- [ ] Create migration file with descriptive name
- [ ] Implement up and down migrations
- [ ] Test migration on fresh database
- [ ] Test migration on copy of production data (if possible)
- [ ] Update all affected queries/models

### Review Requirements
| Change Type | Required Reviewers |
|-------------|-------------------|
| Additive | 1 engineer |
| Modify | 2 engineers + DBA |
| Destructive | ARB approval |
| Data migration | ARB + DBA |

### Pre-Deployment
- [ ] Backup production database
- [ ] Schedule maintenance window (if needed)
- [ ] Notify affected teams
- [ ] Prepare rollback script
- [ ] Have DBA on standby (for significant changes)

### Deployment
- [ ] Run migration in staging first
- [ ] Verify staging functionality
- [ ] Run migration in production
- [ ] Verify production functionality
- [ ] Monitor for errors

### Post-Deployment
- [ ] Verify all queries work correctly
- [ ] Check for performance regression
- [ ] Confirm no data integrity issues
- [ ] Document any issues encountered
- [ ] Close migration ticket

### Rollback Triggers
- [ ] Migration fails partway through
- [ ] Data integrity issues detected
- [ ] Severe performance degradation
- [ ] Application errors related to schema
```

### 3.3 Schema Change Example

```sql
-- Migration: 001_add_user_preferences.sql
-- Type: Additive
-- Author: [name]
-- Date: [date]
-- Ticket: [ticket-id]

-- UP
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);

-- DOWN
DROP INDEX IF EXISTS idx_users_preferences;
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
```

---

## 4. Code Review Standards

### 4.1 Review Requirements

| Change Size | Reviewers Required | Approval Needed |
|-------------|-------------------|-----------------|
| Small (<100 lines) | 1 | 1 approval |
| Medium (100-500 lines) | 2 | 1 approval |
| Large (>500 lines) | 2 | 2 approvals |
| Security-sensitive | 2 + Security Lead | Security approval |

### 4.2 Review Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] Code does what it claims to do
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] No obvious bugs

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Output encoding where needed
- [ ] No SQL injection risks
- [ ] No XSS risks
- [ ] Authentication/authorization correct

### Quality
- [ ] Code is readable and maintainable
- [ ] No unnecessary complexity
- [ ] Follows existing patterns
- [ ] No code duplication (or justified)

### Testing
- [ ] Tests exist for new functionality
- [ ] Tests are meaningful (not just coverage)
- [ ] Edge cases tested
- [ ] All tests pass

### Performance
- [ ] No obvious performance issues
- [ ] Database queries efficient
- [ ] No N+1 queries
- [ ] Appropriate caching (if applicable)

### Documentation
- [ ] Complex logic commented
- [ ] Public APIs documented
- [ ] README updated (if needed)
```

---

## 5. Branch and Commit Standards

### 5.1 Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/[ticket]-[description]` | `feat/CLC-123-user-preferences` |
| Bug fix | `fix/[ticket]-[description]` | `fix/CLC-456-login-error` |
| Dependency | `deps/[package]-[version]` | `deps/react-router-7.0` |
| Documentation | `docs/[description]` | `docs/api-reference` |
| Hotfix | `hotfix/[description]` | `hotfix/auth-bypass` |

### 5.2 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat(auth): add token refresh endpoint

Implements automatic token refresh when access token expires.
Refresh tokens have 7-day validity.

Closes #123
```

---

## 6. Testing Standards

### 6.1 Test Requirements

| Change Type | Required Tests |
|-------------|----------------|
| New feature | Unit + integration tests |
| Bug fix | Regression test for the bug |
| Refactor | Existing tests must pass |
| API change | API contract tests |
| Security fix | Security test case |

### 6.2 Test Organization

```
tests/
├── unit/           # Unit tests (fast, isolated)
├── integration/    # Integration tests (real dependencies)
├── e2e/            # End-to-end tests (full system)
└── load/           # Load/performance tests
```

### 6.3 Test Execution

| Test Type | When to Run | CI Gate |
|-----------|-------------|---------|
| Unit | Every commit | Yes |
| Integration | Every PR | Yes |
| E2E | Pre-release | Yes |
| Load | Weekly/pre-release | No (manual) |

**Commands**:
```bash
# All tests
npm test -- --run

# Server tests only
npm run test:server -- --run

# Frontend tests only
npm run test:frontend -- --run

# E2E tests
npm run test:e2e -- --run
```

---

## 7. CI/CD Standards

### 7.1 Pipeline Gates

| Gate | Requirements | Blocking |
|------|--------------|----------|
| Build | Compiles without error | Yes |
| Lint | No lint errors | Yes |
| Tests | All tests pass | Yes |
| Type check | TypeScript passes | Yes (new errors) |
| Security scan | No critical vulnerabilities | Yes |
| Code review | Approved by required reviewers | Yes |

### 7.2 Current CI Configuration

**Location**: [.github/workflows/](.github/workflows/)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| CI | PR, push to main | Build, test, lint |
| Security | Weekly, PR | npm audit |

### 7.3 GAP: Automated Security Scanning in CI

**Status**: GAP - security scan not enforced in CI

**Recommended Addition**:
```yaml
# .github/workflows/security.yml (example)
name: Security Scan
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
```

---

## 8. Environment Standards

### 8.1 Environment Hierarchy

| Environment | Purpose | Data | Access |
|-------------|---------|------|--------|
| Local | Development | Synthetic | Developers |
| Staging | Pre-production testing | Sanitized copy | Engineering |
| Production | Live system | Real | Restricted |

### 8.2 Environment Configuration

| Variable | Local | Staging | Production |
|----------|-------|---------|------------|
| NODE_ENV | development | staging | production |
| DATABASE_URL | Local/dev DB | Staging DB | Production DB |
| JWT_SECRET | Dev secret (warn) | Staging secret | Production secret (32+ chars) |

### 8.3 Environment Parity

Staging should match production in:
- Node.js version
- Database version
- Infrastructure configuration
- Feature flags

---

## 9. Feature Flag Standards

### 9.1 Flag Naming

```
[scope]_[feature]_[variant]

Examples:
- auth_mfa_enabled
- ui_new_dashboard_rollout
- api_v2_enabled
```

### 9.2 Flag Lifecycle

| Stage | Duration | Action |
|-------|----------|--------|
| Development | Variable | Flag off by default |
| Rollout | 1-2 weeks | Gradual enablement |
| GA | - | Flag on by default |
| Cleanup | 30 days post-GA | Remove flag |

### 9.3 GAP: Feature Flag System

**Status**: GAP - no feature flag system implemented

**Recommendation**: Consider LaunchDarkly, Flagsmith, or env-var based flags for MVP.

---

## 10. Documentation Standards

### 10.1 Required Documentation

| Code Type | Required Docs |
|-----------|---------------|
| Public API | OpenAPI/Swagger spec |
| Complex logic | Inline comments |
| Configuration | .env.example + README |
| Architecture decisions | ADR |
| Runbooks | Operational docs |

### 10.2 Documentation Locations

| Type | Location |
|------|----------|
| API docs | docs/api/ |
| Architecture | docs/architecture/ |
| Operations | docs/corporate-readiness/ |
| Developer guide | README.md |

---

## 11. Ownership

| Standard | Owner | Review Frequency |
|----------|-------|------------------|
| Dependency updates | DevOps Lead | Quarterly |
| Schema changes | Engineering Lead | Quarterly |
| Code review | Engineering Lead | Quarterly |
| Testing | QA Lead | Quarterly |
| CI/CD | DevOps Lead | Quarterly |
