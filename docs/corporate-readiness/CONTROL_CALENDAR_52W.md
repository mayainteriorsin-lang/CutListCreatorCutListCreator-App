# 52-Week Control Calendar

## Document Version: 1.0
## Effective Date: 2026-02-05

---

## 1. Purpose

Define the annual schedule for all recurring security and compliance controls, ensuring consistent evidence collection and audit readiness throughout the year.

---

## 2. Control Frequency Matrix

### 2.1 Summary by Frequency

| Frequency | Controls | Total Occurrences/Year |
|-----------|----------|------------------------|
| Daily | 4 | 1,460 |
| Weekly | 6 | 312 |
| Monthly | 8 | 96 |
| Quarterly | 6 | 24 |
| Annual | 4 | 4 |
| **Total** | **28** | **1,896** |

---

## 3. Daily Controls (Every Business Day)

| ID | Control | Owner | Evidence | Storage Path |
|----|---------|-------|----------|--------------|
| D-001 | Health endpoint verification | On-Call | Health check log | logs/health/ |
| D-002 | Alert triage and response | On-Call | Alert log | logs/alerts/ |
| D-003 | Error rate monitoring | On-Call | Metrics dashboard | metrics/ |
| D-004 | Rate limit monitoring | On-Call | Rate limit log | logs/rate-limit/ |

---

## 4. Weekly Controls

| ID | Control | Owner | Day | Evidence | Storage Path |
|----|---------|-------|-----|----------|--------------|
| W-001 | Operations review meeting | Engineering Lead | Monday | Meeting notes | evidence/weekly/ops/ |
| W-002 | Incident retrospective | On-Call | Monday | Retro doc | evidence/weekly/incidents/ |
| W-003 | Release review | Engineering Lead | Wednesday | Release notes | evidence/weekly/releases/ |
| W-004 | PR queue review | Engineering Lead | Friday | PR status | evidence/weekly/prs/ |
| W-005 | Backup verification spot-check | DBA | Friday | Backup log | evidence/weekly/backups/ |
| W-006 | On-call handoff | On-Call | Friday | Handoff notes | evidence/weekly/oncall/ |

---

## 5. Monthly Controls

| ID | Control | Owner | Week | Evidence | Storage Path |
|----|---------|-------|------|----------|--------------|
| M-001 | Compliance review meeting | Security Lead | 1 | Meeting notes | evidence/monthly/compliance/ |
| M-002 | Dependency security scan | Engineering Lead | 1 | npm audit report | evidence/monthly/security/ |
| M-003 | Access review | Security Lead | 2 | Access list | evidence/monthly/access/ |
| M-004 | Gap register update | Engineering Lead | 2 | Updated register | evidence/monthly/gaps/ |
| M-005 | Audit log sampling | Security Lead | 3 | Sample export | evidence/monthly/audit/ |
| M-006 | Control evidence collection | Security Lead | 3 | Evidence pack | evidence/monthly/controls/ |
| M-007 | SLO performance review | Engineering Lead | 4 | SLO report | evidence/monthly/slo/ |
| M-008 | Customer health check | Customer Success | 4 | Health report | evidence/monthly/customers/ |

---

## 6. Quarterly Controls

| ID | Control | Owner | Month | Evidence | Storage Path |
|----|---------|-------|-------|----------|--------------|
| Q-001 | DR drill execution | Engineering Lead | M3 | Drill report | evidence/quarterly/dr/ |
| Q-002 | Tech debt review | Engineering Lead | M1 | Debt inventory | evidence/quarterly/debt/ |
| Q-003 | Security posture assessment | Security Lead | M2 | Assessment report | evidence/quarterly/security/ |
| Q-004 | Business review meeting | CTO | M2 | Meeting notes | evidence/quarterly/business/ |
| Q-005 | Risk register review | CTO | M3 | Updated register | evidence/quarterly/risk/ |
| Q-006 | Control effectiveness testing | Security Lead | M3 | Test results | evidence/quarterly/controls/ |

---

## 7. Annual Controls

| ID | Control | Owner | Month | Evidence | Storage Path |
|----|---------|-------|-------|----------|--------------|
| A-001 | Architecture review | Engineering Lead | January | Arch document | evidence/annual/architecture/ |
| A-002 | Penetration test | Security Lead | June | Pentest report | evidence/annual/pentest/ |
| A-003 | Compliance audit | CTO | September | Audit report | evidence/annual/audit/ |
| A-004 | Annual planning | Executive Team | December | Annual plan | evidence/annual/planning/ |

---

## 8. 52-Week Calendar

### Q1 (Weeks 1-13)

| Week | Date (2026) | Daily | Weekly | Monthly | Quarterly | Annual |
|------|-------------|-------|--------|---------|-----------|--------|
| W01 | Jan 5 | D-001→D-004 | W-001→W-006 | M-001, M-002 | Q-002 | A-001 |
| W02 | Jan 12 | D-001→D-004 | W-001→W-006 | M-003, M-004 | | |
| W03 | Jan 19 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W04 | Jan 26 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W05 | Feb 2 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W06 | Feb 9 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-003, Q-004 | |
| W07 | Feb 16 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W08 | Feb 23 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W09 | Mar 2 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W10 | Mar 9 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-005, Q-006 | |
| W11 | Mar 16 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W12 | Mar 23 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W13 | Mar 30 | D-001→D-004 | W-001→W-006 | | Q-001 | |

### Q2 (Weeks 14-26)

| Week | Date (2026) | Daily | Weekly | Monthly | Quarterly | Annual |
|------|-------------|-------|--------|---------|-----------|--------|
| W14 | Apr 6 | D-001→D-004 | W-001→W-006 | M-001, M-002 | Q-002 | |
| W15 | Apr 13 | D-001→D-004 | W-001→W-006 | M-003, M-004 | | |
| W16 | Apr 20 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W17 | Apr 27 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W18 | May 4 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W19 | May 11 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-003, Q-004 | |
| W20 | May 18 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W21 | May 25 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W22 | Jun 1 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W23 | Jun 8 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-005, Q-006 | A-002 |
| W24 | Jun 15 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W25 | Jun 22 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W26 | Jun 29 | D-001→D-004 | W-001→W-006 | | Q-001 | |

### Q3 (Weeks 27-39)

| Week | Date (2026) | Daily | Weekly | Monthly | Quarterly | Annual |
|------|-------------|-------|--------|---------|-----------|--------|
| W27 | Jul 6 | D-001→D-004 | W-001→W-006 | M-001, M-002 | Q-002 | |
| W28 | Jul 13 | D-001→D-004 | W-001→W-006 | M-003, M-004 | | |
| W29 | Jul 20 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W30 | Jul 27 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W31 | Aug 3 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W32 | Aug 10 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-003, Q-004 | |
| W33 | Aug 17 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W34 | Aug 24 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W35 | Aug 31 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W36 | Sep 7 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-005, Q-006 | A-003 |
| W37 | Sep 14 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W38 | Sep 21 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W39 | Sep 28 | D-001→D-004 | W-001→W-006 | | Q-001 | |

### Q4 (Weeks 40-52)

| Week | Date (2026) | Daily | Weekly | Monthly | Quarterly | Annual |
|------|-------------|-------|--------|---------|-----------|--------|
| W40 | Oct 5 | D-001→D-004 | W-001→W-006 | M-001, M-002 | Q-002 | |
| W41 | Oct 12 | D-001→D-004 | W-001→W-006 | M-003, M-004 | | |
| W42 | Oct 19 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W43 | Oct 26 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W44 | Nov 2 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W45 | Nov 9 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-003, Q-004 | |
| W46 | Nov 16 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | |
| W47 | Nov 23 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W48 | Nov 30 | D-001→D-004 | W-001→W-006 | M-001, M-002 | | |
| W49 | Dec 7 | D-001→D-004 | W-001→W-006 | M-003, M-004 | Q-005, Q-006 | |
| W50 | Dec 14 | D-001→D-004 | W-001→W-006 | M-005, M-006 | | A-004 |
| W51 | Dec 21 | D-001→D-004 | W-001→W-006 | M-007, M-008 | | |
| W52 | Dec 28 | D-001→D-004 | W-001→W-006 | | Q-001 | |

---

## 9. Evidence Collection Schedule

### 9.1 Weekly Evidence Package

**Due**: Friday 17:00
**Contents**:
- Ops review notes
- Incident summaries
- Release notes
- Backup verification

### 9.2 Monthly Evidence Package

**Due**: 5th business day of following month
**Contents**:
- All weekly packages
- Compliance meeting notes
- Security scan report
- Access review
- Audit log samples

### 9.3 Quarterly Evidence Package

**Due**: 10th business day of following quarter
**Contents**:
- All monthly packages
- DR drill report
- Tech debt inventory
- Business review notes
- Risk register

### 9.4 Annual Evidence Package

**Due**: January 31st
**Contents**:
- All quarterly packages
- Architecture review
- Pentest report
- Compliance audit
- Annual plan

---

## 10. Calendar Integration

### 10.1 Recommended Calendar Setup

```
Shared Calendar: "CutListCreator Controls"

Recurring Events:
- Daily: "Health Check & Alert Triage" (09:00-09:30)
- Monday: "Weekly Ops Review" (10:00-10:30)
- Friday: "On-Call Handoff" (16:30-17:00)
- Month W1 Tuesday: "Monthly Compliance Review" (14:00-15:00)
- Quarter M3 Thursday: "DR Drill" (09:00-14:00)
```

### 10.2 Notification Schedule

| Control Type | Reminder Before | Notification Method |
|--------------|-----------------|---------------------|
| Daily | N/A | Automated monitoring |
| Weekly | 1 day | Calendar + Slack |
| Monthly | 3 days | Email + Calendar |
| Quarterly | 1 week | Email + Calendar + Slack |
| Annual | 2 weeks | Email + Calendar + Meeting |

---

## 11. Compliance Tracking

### 11.1 Completion Status Template

```markdown
## Control Completion Status - [Month/Year]

### Daily Controls
| Date | D-001 | D-002 | D-003 | D-004 | Verified By |
|------|-------|-------|-------|-------|-------------|
| Mon  | ✅    | ✅    | ✅    | ✅    | [Name]      |
| Tue  | ✅    | ✅    | ✅    | ✅    | [Name]      |
...

### Weekly Controls
| Week | W-001 | W-002 | W-003 | W-004 | W-005 | W-006 | Verified By |
|------|-------|-------|-------|-------|-------|-------|-------------|
| W01  | ✅    | ✅    | ✅    | ✅    | ✅    | ✅    | [Name]      |
...

### Monthly Controls
| Control | Status | Evidence Path | Verified By |
|---------|--------|---------------|-------------|
| M-001   | ✅     | [path]        | [Name]      |
...
```

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Security Lead | __________ | __________ |

