# Security Operations Checklist

## Purpose
Operational security procedures for maintaining CutListCreator security posture in production.

---

## 1. Secret Rotation Schedule

### 1.1 Rotation Cadence

| Secret | Rotation Period | Owner | Method |
|--------|----------------|-------|--------|
| JWT_SECRET | 90 days | Security Lead | Manual rotation with deployment |
| DATABASE_URL credentials | 90 days | DBA/DevOps | Neon credential rotation |
| API keys (external services) | 90 days | DevOps | Service-specific rotation |
| Service account tokens | 90 days | DevOps | Manual rotation |

### 1.2 Rotation Procedure

```markdown
## Secret Rotation Runbook

### Pre-Rotation
1. [ ] Schedule rotation window (low-traffic period)
2. [ ] Generate new secret value (cryptographically secure)
3. [ ] Test new secret in staging environment
4. [ ] Notify team of planned rotation

### Rotation Steps
1. [ ] Update secret in environment configuration (Render Dashboard)
2. [ ] Trigger deployment with new secret
3. [ ] Verify service starts successfully
4. [ ] Verify authentication works with new secret
5. [ ] Monitor for auth failures (15 minutes)

### Post-Rotation
1. [ ] Revoke old secret/credentials
2. [ ] Update rotation log
3. [ ] Confirm no lingering sessions using old secret

### Rollback
If issues detected:
1. [ ] Revert to previous secret value
2. [ ] Redeploy immediately
3. [ ] Create incident ticket
```

### 1.3 Rotation Log Template

| Date | Secret | Rotated By | Verified By | Notes |
|------|--------|------------|-------------|-------|
| YYYY-MM-DD | JWT_SECRET | @name | @name | Scheduled rotation |

---

## 2. Access Policy Reviews

### 2.1 Review Schedule

| Review Type | Frequency | Owner | Participants |
|-------------|-----------|-------|--------------|
| User access audit | Monthly | Security Lead | Engineering Lead |
| Admin privilege review | Monthly | Security Lead | CTO |
| API key inventory | Quarterly | DevOps | Security Lead |
| Third-party access | Quarterly | Security Lead | Legal |

### 2.2 User Access Audit Checklist

```markdown
## Monthly User Access Audit

### Active Users
- [ ] Export list of all active users
- [ ] Verify each user has legitimate business need
- [ ] Check for inactive accounts (no login > 90 days)
- [ ] Review users with admin/elevated privileges

### Service Accounts
- [ ] Inventory all service accounts
- [ ] Verify each has documented purpose
- [ ] Check for unused service accounts
- [ ] Review service account permissions

### API Keys
- [ ] List all active API keys
- [ ] Verify each key has an owner
- [ ] Check for unused keys (no activity > 30 days)
- [ ] Review key permissions/scopes

### Actions
- [ ] Disable inactive user accounts
- [ ] Revoke unused API keys
- [ ] Document any permission changes
- [ ] Update access register
```

### 2.3 Privilege Escalation Review

| Role | Privileges | Review Focus |
|------|------------|--------------|
| Admin | Full system access | Minimize admin count |
| Manager | Tenant-wide read/write | Verify tenant isolation |
| User | Own data access | Standard permissions |

---

## 3. Audit Log Retention

### 3.1 Retention Policy

| Log Type | Retention Period | Storage | Compliance |
|----------|-----------------|---------|------------|
| Authentication logs | 1 year | Database | SOC2, GDPR |
| API access logs | 90 days | Log aggregator | SOC2 |
| Admin action logs | 2 years | Database | SOC2, GDPR |
| Error logs | 30 days | Log aggregator | Operations |
| Security events | 2 years | SIEM (future) | SOC2 |

### 3.2 Log Review Procedures

#### Daily Review (Automated)
```markdown
- [ ] Alert on failed login attempts > 5/hour/IP
- [ ] Alert on admin actions
- [ ] Alert on permission changes
- [ ] Alert on unusual data export activity
```

#### Weekly Review (Manual)
```markdown
- [ ] Review authentication failure patterns
- [ ] Check for credential stuffing attempts
- [ ] Review admin action summary
- [ ] Check for data access anomalies
- [ ] Review error rate trends
```

#### Monthly Review (Security Team)
```markdown
- [ ] Comprehensive auth log analysis
- [ ] Permission change audit
- [ ] Data export review
- [ ] Incident correlation
- [ ] Compliance verification
```

### 3.3 Log Archival Procedure

```bash
# Monthly log archival (example)
# 1. Export logs older than retention period
# 2. Compress and encrypt
# 3. Transfer to cold storage
# 4. Verify archive integrity
# 5. Delete from primary storage
```

---

## 4. Vulnerability Management

### 4.1 Scan Schedule

| Scan Type | Frequency | Tool | Owner |
|-----------|-----------|------|-------|
| Dependency scan | Weekly | npm audit | DevOps |
| Container scan | Weekly | Trivy (future) | DevOps |
| SAST | Per PR | ESLint security rules | Dev |
| DAST | Monthly | OWASP ZAP (future) | Security |

### 4.2 Dependency Update Checklist

```markdown
## Weekly Dependency Review

### Automated Scan
- [ ] Run `npm audit`
- [ ] Review new vulnerabilities
- [ ] Categorize by severity

### Triage
- [ ] Critical: Fix within 24 hours
- [ ] High: Fix within 7 days
- [ ] Medium: Fix within 30 days
- [ ] Low: Fix within 90 days

### Update Process
- [ ] Review changelog for breaking changes
- [ ] Update in development environment
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Verify no regressions
- [ ] Deploy to production
```

### 4.3 Current Vulnerability Status

| Vulnerability | Severity | Package | Status | Target Date |
|---------------|----------|---------|--------|-------------|
| react-router XSS | High | @remix-run/router | OPEN | Week 2 |
| xlsx prototype pollution | High | xlsx | ACCEPTED | N/A |
| jspdf injection | High | jspdf | OPEN | Week 4 |

---

## 5. Incident Response Procedures

### 5.1 Security Incident Classification

| Type | Severity | Response Time | Examples |
|------|----------|---------------|----------|
| Data breach | P0 | Immediate | Unauthorized data access |
| Auth compromise | P0 | Immediate | Token theft, credential leak |
| Injection attack | P1 | 1 hour | SQL injection, XSS |
| DoS attack | P1 | 1 hour | Service disruption |
| Suspicious activity | P2 | 4 hours | Unusual access patterns |

### 5.2 Security Incident Checklist

```markdown
## Security Incident Response

### Immediate Actions (First 15 minutes)
- [ ] Assess scope and impact
- [ ] Contain threat (block IP, disable account, etc.)
- [ ] Preserve evidence (logs, screenshots)
- [ ] Notify Security Lead

### Investigation (First hour)
- [ ] Identify attack vector
- [ ] Determine data exposure
- [ ] Trace attacker actions
- [ ] Document timeline

### Remediation
- [ ] Patch vulnerability
- [ ] Rotate compromised credentials
- [ ] Restore from clean backup if needed
- [ ] Verify remediation

### Post-Incident
- [ ] Write incident report
- [ ] Notify affected users (if required)
- [ ] Update security controls
- [ ] Conduct lessons learned
```

---

## 6. Compliance Checklist

### 6.1 Monthly Compliance Review

| Control | Verification | Status |
|---------|-------------|--------|
| MFA enabled for admins | Check auth settings | - |
| Secrets rotated on schedule | Check rotation log | - |
| Access reviews completed | Check audit log | - |
| Vulnerability scans current | Check scan reports | - |
| Logs retained per policy | Check log storage | - |
| Backups verified | Check backup tests | - |

### 6.2 Quarterly Compliance Report

```markdown
## Quarterly Security Compliance Report

### Period: Q[X] 20XX

### Executive Summary
[Brief overview of security posture]

### Metrics
- Vulnerabilities discovered: X
- Vulnerabilities remediated: X
- Mean time to remediate: X days
- Security incidents: X
- Access reviews completed: X/X
- Secrets rotated on schedule: X/X

### Findings
[List any compliance gaps]

### Remediation Plan
[Actions to address gaps]
```

---

## 7. Security Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Security Lead | @[name] | Primary |
| Engineering Lead | @[name] | Secondary |
| CTO | @[name] | Executive |
| Legal | @[name] | Data breach |

---

## Appendix: Security Tools

| Tool | Purpose | Access |
|------|---------|--------|
| npm audit | Dependency scanning | CLI |
| Render Dashboard | Deployment, env vars | Web |
| Neon Console | Database access | Web |
| Log aggregator | Log review | TBD |
| SIEM | Security events | Future |
