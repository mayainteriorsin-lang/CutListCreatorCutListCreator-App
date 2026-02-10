# Continuous Compliance Evidence Plan

## Document Version: 1.0
## Effective Date: 2026-02-05

---

## 1. Purpose

Define the systematic approach for collecting, storing, and maintaining compliance evidence to ensure audit readiness and demonstrate continuous compliance with security controls.

---

## 2. Evidence Framework

### 2.1 Evidence Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Automated** | System-generated logs and metrics | Health checks, audit logs, error rates |
| **Semi-Automated** | Script-assisted collection | npm audit, backup verification |
| **Manual** | Human-verified documentation | Meeting notes, access reviews |
| **Attestation** | Signed acknowledgments | Policy acceptance, training completion |

### 2.2 Evidence Quality Criteria

| Criterion | Requirement |
|-----------|-------------|
| **Completeness** | All required fields populated |
| **Accuracy** | Matches actual system state |
| **Timeliness** | Collected within required window |
| **Integrity** | Tamper-evident or immutable |
| **Attribution** | Clear owner/collector identified |

---

## 3. Control Evidence Matrix

### 3.1 Authentication Controls

| Control ID | Control Name | Evidence Type | Collection Method | Frequency | Owner | Storage Path |
|------------|--------------|---------------|-------------------|-----------|-------|--------------|
| AUTH-001 | JWT Token Validation | Automated | System logs | Continuous | System | `logs/auth/` |
| AUTH-002 | Token Expiration | Automated | JWT decode | Continuous | System | `logs/auth/` |
| AUTH-003 | Password Hashing | Automated | Code review | Per release | Engineering | `evidence/code/` |
| AUTH-004 | Tenant Status Check | Automated | Middleware logs | Continuous | System | `logs/auth/` |

### 3.2 Authorization Controls

| Control ID | Control Name | Evidence Type | Collection Method | Frequency | Owner | Storage Path |
|------------|--------------|---------------|-------------------|-----------|-------|--------------|
| AUTHZ-001 | Role-Based Access | Automated | Auth middleware | Continuous | System | `logs/auth/` |
| AUTHZ-002 | Tenant Isolation | Automated | Test results | Per release | CI/CD | `evidence/tests/` |
| AUTHZ-003 | Permission Check | Automated | Middleware logs | Continuous | System | `logs/auth/` |

### 3.3 Rate Limiting Controls

| Control ID | Control Name | Evidence Type | Collection Method | Frequency | Owner | Storage Path |
|------------|--------------|---------------|-------------------|-----------|-------|--------------|
| RATE-001 | Global Rate Limit | Automated | Rate limit logs | Continuous | System | `logs/rate-limit/` |
| RATE-002 | Per-Tenant Limit | Automated | Rate limit logs | Continuous | System | `logs/rate-limit/` |

### 3.4 Audit Controls

| Control ID | Control Name | Evidence Type | Collection Method | Frequency | Owner | Storage Path |
|------------|--------------|---------------|-------------------|-----------|-------|--------------|
| AUDIT-001 | Request Correlation | Automated | Application logs | Continuous | System | `logs/requests/` |
| AUDIT-002 | Audit Event Logging | Automated | audit_logs table | Continuous | System | `evidence/audit/` |
| AUDIT-003 | Metrics Logging | Automated | Metrics output | Continuous | System | `metrics/` |

### 3.5 Security Controls

| Control ID | Control Name | Evidence Type | Collection Method | Frequency | Owner | Storage Path |
|------------|--------------|---------------|-------------------|-----------|-------|--------------|
| SEC-001 | Security Headers | Semi-Auto | Header scan | Weekly | Security Lead | `evidence/security/` |
| SEC-002 | Startup Validation | Automated | Startup logs | Per deploy | System | `logs/startup/` |
| SEC-003 | Dependency Scan | Semi-Auto | npm audit | Monthly | Engineering | `evidence/security/` |

### 3.6 Operational Controls

| Control ID | Control Name | Evidence Type | Collection Method | Frequency | Owner | Storage Path |
|------------|--------------|---------------|-------------------|-----------|-------|--------------|
| OPS-001 | Health Monitoring | Automated | Health endpoint | Continuous | System | `logs/health/` |
| OPS-002 | Backup Verification | Semi-Auto | Neon console | Weekly | DBA | `evidence/backup/` |
| OPS-003 | DR Testing | Manual | Drill report | Quarterly | Engineering | `evidence/dr/` |

---

## 4. Evidence Collection Procedures

### 4.1 Automated Collection

**Script**: `scripts/phase15/collect-automated-evidence.sh`

```bash
#!/bin/bash
# Automated evidence collection script
# Run: Weekly (Friday) or on-demand

EVIDENCE_DATE=$(date +%Y-%m-%d)
EVIDENCE_DIR="evidence/${EVIDENCE_DATE}"
mkdir -p $EVIDENCE_DIR/{auth,rate-limit,audit,security,health}

echo "=== Collecting Automated Evidence for ${EVIDENCE_DATE} ==="

# 1. Health check logs
echo "Collecting health check logs..."
curl -s https://api.example.com/api/health/live > $EVIDENCE_DIR/health/live-check.json
curl -s https://api.example.com/api/health/ready > $EVIDENCE_DIR/health/ready-check.json

# 2. Security headers
echo "Collecting security headers..."
curl -sI https://api.example.com/ | grep -E "^(X-|Content-Security|Strict)" > $EVIDENCE_DIR/security/headers.txt

# 3. npm audit
echo "Running npm audit..."
npm audit --json > $EVIDENCE_DIR/security/npm-audit.json 2>&1

# 4. Test results
echo "Running test suite..."
npm test -- --run --reporter=json > $EVIDENCE_DIR/auth/test-results.json 2>&1

echo "Evidence collected in $EVIDENCE_DIR"
```

### 4.2 Semi-Automated Collection

| Evidence | Script/Tool | Manual Step |
|----------|-------------|-------------|
| npm audit | `npm audit` | Review and document findings |
| Backup status | Neon console | Screenshot and timestamp |
| Access list | Database query | Export and review |

### 4.3 Manual Collection

| Evidence | Template | Instructions |
|----------|----------|--------------|
| Meeting notes | `templates/meeting-notes.md` | Complete during meeting |
| Incident report | `templates/incident-report.md` | Fill within 24h of incident |
| DR drill report | `templates/dr-drill-report.md` | Complete within 48h of drill |

---

## 5. Evidence Storage

### 5.1 Storage Structure

```
evidence/
├── 2026/
│   ├── Q1/
│   │   ├── M01-January/
│   │   │   ├── W01/
│   │   │   │   ├── daily/
│   │   │   │   ├── weekly/
│   │   │   │   └── control-checklist.md
│   │   │   ├── W02/
│   │   │   ├── W03/
│   │   │   ├── W04/
│   │   │   └── monthly-summary.md
│   │   ├── M02-February/
│   │   ├── M03-March/
│   │   └── quarterly-summary.md
│   ├── Q2/
│   ├── Q3/
│   ├── Q4/
│   └── annual-summary.md
└── templates/
    ├── weekly-checklist.md
    ├── monthly-report.md
    └── quarterly-summary.md
```

### 5.2 Retention Policy

| Evidence Type | Retention Period | Archive Location |
|---------------|------------------|------------------|
| Daily logs | 90 days active | Archive to cold storage |
| Weekly summaries | 1 year active | Archive after year-end |
| Monthly reports | 3 years | Long-term archive |
| Quarterly packages | 5 years | Long-term archive |
| Annual packages | 7 years | Long-term archive |
| Audit reports | 7 years | Long-term archive |

### 5.3 Access Control

| Role | Read Access | Write Access | Delete Access |
|------|-------------|--------------|---------------|
| Engineering Team | All | Own evidence | None |
| Security Lead | All | All | Archived only |
| CTO | All | All | With approval |
| External Auditor | Selected | None | None |

---

## 6. Evidence Validation

### 6.1 Validation Checklist

```markdown
## Evidence Validation Checklist

### For Each Evidence Item
- [ ] File exists at expected path
- [ ] File is not empty
- [ ] Timestamp is within expected window
- [ ] Format is correct (JSON/MD/TXT)
- [ ] Owner is identified
- [ ] No sensitive data exposed

### Weekly Validation
- [ ] All daily evidence collected
- [ ] Weekly summary complete
- [ ] Incidents documented
- [ ] Releases tracked

### Monthly Validation
- [ ] All weekly packages complete
- [ ] Compliance meeting held
- [ ] Security scan completed
- [ ] Access review done
```

### 6.2 Automated Validation Script

**Script**: `scripts/phase15/validate-evidence.sh`

```bash
#!/bin/bash
# Validate evidence completeness
# Run: Monthly (first week)

MONTH=${1:-$(date +%Y-%m)}
EVIDENCE_DIR="evidence/$(echo $MONTH | cut -d- -f1)/Q$((( $(echo $MONTH | cut -d- -f2) - 1) / 3 + 1))/M$(echo $MONTH | cut -d- -f2)"

echo "Validating evidence for $MONTH"

ERRORS=0

# Check weekly directories
for week in 1 2 3 4 5; do
    WEEK_DIR="$EVIDENCE_DIR/W0$week"
    if [ -d "$WEEK_DIR" ]; then
        echo "✓ Week $week directory exists"

        # Check required files
        for file in "control-checklist.md" "daily/health-summary.txt"; do
            if [ ! -f "$WEEK_DIR/$file" ]; then
                echo "✗ Missing: $WEEK_DIR/$file"
                ((ERRORS++))
            fi
        done
    fi
done

# Check monthly summary
if [ ! -f "$EVIDENCE_DIR/monthly-summary.md" ]; then
    echo "✗ Missing monthly summary"
    ((ERRORS++))
else
    echo "✓ Monthly summary exists"
fi

echo ""
echo "Validation complete. Errors: $ERRORS"
exit $ERRORS
```

---

## 7. Audit Readiness

### 7.1 Pre-Audit Checklist

```markdown
## Pre-Audit Preparation Checklist

### 2 Weeks Before
- [ ] Confirm audit scope and timing
- [ ] Identify control set to be reviewed
- [ ] Assign evidence coordinators
- [ ] Review gap register for open items

### 1 Week Before
- [ ] Compile evidence packages
- [ ] Run validation scripts
- [ ] Generate summary reports
- [ ] Prepare presentation materials

### 2 Days Before
- [ ] Final evidence review
- [ ] Stage evidence in accessible location
- [ ] Brief team on audit process
- [ ] Confirm availability of key personnel

### Day Of
- [ ] Test evidence access
- [ ] Have backup contacts available
- [ ] Prepare meeting rooms/calls
- [ ] Have incident response plan ready
```

### 7.2 Evidence Package for Auditor

| Package | Contents | Format |
|---------|----------|--------|
| Control inventory | List of all controls | Excel/CSV |
| Evidence index | Mapping of controls to evidence | Excel/CSV |
| Policy documents | Current policies | PDF |
| Test results | Automated test output | JSON/Report |
| Meeting minutes | Governance meetings | PDF |
| Incident log | Incidents for period | Excel |
| Change log | System changes | Git log/Excel |

---

## 8. Continuous Improvement

### 8.1 Evidence Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Collection completeness | 100% | Evidence count vs. required |
| Timeliness | 100% on-time | Collection date vs. due date |
| Validation pass rate | > 95% | Validation script results |
| Audit finding rate | < 5 | Audit findings per cycle |

### 8.2 Improvement Process

1. **Identify** gaps from audit findings or validation failures
2. **Analyze** root cause (process, tool, or ownership)
3. **Remediate** with updated procedure or automation
4. **Verify** improvement in next collection cycle
5. **Document** change in evidence plan

---

## 9. Ownership and Accountability

### 9.1 RACI Matrix

| Activity | Engineering Lead | Security Lead | DBA | On-Call |
|----------|------------------|---------------|-----|---------|
| Daily collection | I | I | I | **R** |
| Weekly package | **R** | C | I | A |
| Monthly validation | A | **R** | C | I |
| Quarterly summary | C | **R** | I | I |
| Audit coordination | C | **R** | C | I |

**R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed

### 9.2 Escalation for Missing Evidence

| Missing Evidence | Escalation To | Timeline |
|------------------|---------------|----------|
| Daily evidence | Engineering Lead | Same day |
| Weekly package | Security Lead | +2 days |
| Monthly package | CTO | +5 days |
| Quarterly package | CEO | +10 days |

---

## 10. Approval

| Role | Name | Date |
|------|------|------|
| Security Lead | __________ | __________ |
| Engineering Lead | __________ | __________ |
| CTO | __________ | __________ |

