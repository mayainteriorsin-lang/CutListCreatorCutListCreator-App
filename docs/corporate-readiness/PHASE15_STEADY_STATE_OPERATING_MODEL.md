# Phase 15: Steady-State Operating Model

## Document Version: 1.0
## Effective Date: 2026-02-05

---

## 1. Purpose

Define the long-term Business-As-Usual (BAU) operating model for CutListCreator enterprise operations, including reliability, security, release governance, and compliance cadences.

---

## 2. Operating Cadence Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEADY-STATE OPERATING RHYTHM                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DAILY        WEEKLY           MONTHLY          QUARTERLY    ANNUAL    │
│    │             │                 │                │            │      │
│    ▼             ▼                 ▼                ▼            ▼      │
│  Health      Operations       Compliance       Business     Audit &    │
│  Checks      Review           Review           Review       Recert     │
│                                                                          │
│  Alerts      Incident         Security         DR Drill     Control    │
│  Triage      Retrospective    Scan Review      Execution    Evidence   │
│                                                                          │
│  On-Call     Release          Gap Register     Tech Debt    Cert       │
│  Handoff     Planning         Review           Burn-Down    Renewal    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Daily Operations

### 3.1 Daily Checklist

| Time | Activity | Owner | Duration |
|------|----------|-------|----------|
| 09:00 | Health endpoint check | On-Call Engineer | 5 min |
| 09:05 | Review overnight alerts | On-Call Engineer | 10 min |
| 09:15 | Check error rate dashboard | On-Call Engineer | 5 min |
| 09:20 | Review rate limit events | On-Call Engineer | 5 min |
| 17:00 | On-call handoff (if applicable) | On-Call Engineer | 10 min |

### 3.2 Daily Automation

| Check | Script/Tool | Alert Threshold |
|-------|-------------|-----------------|
| /api/health/live | Uptime monitor | Response > 5s |
| /api/health/ready | Uptime monitor | Status != 200 |
| Error rate | Log aggregator | > 1% of requests |
| Rate limit hits | Metrics | > 80% of tenant limit |

---

## 4. Weekly Operations

### 4.1 Weekly Operations Review

**When**: Monday 10:00 AM
**Duration**: 30 minutes
**Attendees**: Engineering Lead, On-Call Engineer, Product Lead

| Agenda Item | Time | Owner |
|-------------|------|-------|
| Incident review (past week) | 10 min | On-Call |
| Error trend analysis | 5 min | Engineering Lead |
| Release status | 5 min | Engineering Lead |
| Upcoming risks | 5 min | Product Lead |
| Action items | 5 min | All |

### 4.2 Weekly Checklist

```markdown
## Weekly Operations Review Checklist

### Pre-Meeting (Prepare by Monday 09:00)
- [ ] Pull incident report for past 7 days
- [ ] Export error rate trends
- [ ] List deployments made
- [ ] Note any customer escalations

### During Meeting
- [ ] Review each incident for patterns
- [ ] Identify recurring issues
- [ ] Confirm release plan for week
- [ ] Assign action items

### Post-Meeting
- [ ] Send summary to stakeholders
- [ ] Update incident log
- [ ] Create tickets for action items
```

### 4.3 Weekly Release Review

| Item | Check | Owner |
|------|-------|-------|
| Pending PRs | Review queue < 5 | Engineering Lead |
| Test coverage | No regression | CI/CD |
| Security scan | No new criticals | Security Lead |
| Change log | Updated | Engineering Lead |

---

## 5. Monthly Operations

### 5.1 Monthly Compliance Review

**When**: First Tuesday of month, 2:00 PM
**Duration**: 1 hour
**Attendees**: Engineering Lead, Security Lead, Product Lead, CTO

| Agenda Item | Time | Owner |
|-------------|------|-------|
| Control evidence status | 15 min | Security Lead |
| Gap register review | 15 min | Engineering Lead |
| Security scan summary | 10 min | Security Lead |
| Compliance metrics | 10 min | Security Lead |
| Risk register update | 10 min | CTO |

### 5.2 Monthly Checklist

```markdown
## Monthly Compliance Review Checklist

### Week 1 Preparation
- [ ] Collect control evidence from past month
- [ ] Update gap register status
- [ ] Run security dependency scan
- [ ] Prepare compliance dashboard

### Review Items
- [ ] All critical controls have evidence
- [ ] No new critical gaps identified
- [ ] Security vulnerabilities addressed
- [ ] Audit logs verified

### Documentation
- [ ] Monthly compliance report filed
- [ ] Gap register updated
- [ ] Risk register updated
- [ ] Action items tracked
```

### 5.3 Monthly Security Tasks

| Task | Tool | Owner | Evidence |
|------|------|-------|----------|
| Dependency scan | npm audit | Engineering Lead | Audit report |
| Access review | Manual | Security Lead | Access list |
| Log review | Log platform | On-Call | Sample audit |
| Backup verification | Neon console | DBA | PITR check |

---

## 6. Quarterly Operations

### 6.1 Quarterly Business Review

**When**: Second week of quarter, Thursday 2:00 PM
**Duration**: 2 hours
**Attendees**: Executive team, Engineering Lead, Product Lead, Customer Success

| Agenda Item | Time | Owner |
|-------------|------|-------|
| Platform reliability metrics | 20 min | Engineering Lead |
| Customer health review | 20 min | Customer Success |
| Tech debt status | 15 min | Engineering Lead |
| Security posture | 15 min | Security Lead |
| Roadmap review | 20 min | Product Lead |
| Budget review | 15 min | Finance |
| Strategic decisions | 15 min | CTO |

### 6.2 Quarterly DR Drill

**When**: Last week of quarter
**Duration**: 4 hours (drill) + 1 hour (review)
**Participants**: Engineering team, On-Call rotation

| Phase | Duration | Activity |
|-------|----------|----------|
| Preparation | 30 min | Validate runbooks current |
| Scenario briefing | 15 min | Present drill scenario |
| Execution | 2 hours | Execute recovery procedure |
| Verification | 45 min | Validate recovery success |
| Retrospective | 30 min | Document lessons learned |

### 6.3 Quarterly Tech Debt Burn-Down

| Activity | When | Owner |
|----------|------|-------|
| Debt inventory refresh | Week 1 | Engineering Lead |
| Prioritization session | Week 2 | Product + Engineering |
| Sprint allocation | Week 3 | Engineering Lead |
| Progress review | Week 12 | Product Lead |

---

## 7. Annual Operations

### 7.1 Annual Certification Cycle

| Month | Activity | Owner |
|-------|----------|-------|
| January | Control inventory refresh | Security Lead |
| February | Gap assessment | Engineering Lead |
| March | Remediation planning | Engineering Lead |
| April-June | Remediation execution | Engineering Team |
| July | Internal audit | Security Lead |
| August | External audit prep | CTO |
| September | External audit (if applicable) | CTO |
| October | Certification renewal | CTO |
| November | Post-audit remediation | Engineering Lead |
| December | Annual review & planning | Executive Team |

### 7.2 Annual Reviews

| Review | When | Owner | Deliverable |
|--------|------|-------|-------------|
| Architecture review | Q1 | Engineering Lead | Architecture doc |
| Security assessment | Q2 | Security Lead | Security report |
| Compliance audit | Q3 | CTO | Audit report |
| Strategic planning | Q4 | Executive Team | Annual plan |

---

## 8. Ownership Matrix

### 8.1 Role Responsibilities

| Role | Primary Responsibilities |
|------|--------------------------|
| **On-Call Engineer** | Daily health checks, incident response, alert triage |
| **Engineering Lead** | Weekly ops review, release management, tech debt |
| **Security Lead** | Monthly security scans, control evidence, access reviews |
| **Product Lead** | Customer health, roadmap, feature prioritization |
| **DBA** | Backup verification, database health, PITR testing |
| **CTO** | Quarterly reviews, risk decisions, certification |
| **Customer Success** | Customer onboarding, renewals, escalations |

### 8.2 Escalation Path

```
Level 1: On-Call Engineer
    ↓ (15 min no resolution)
Level 2: Engineering Lead
    ↓ (30 min no resolution)
Level 3: CTO
    ↓ (Critical/Customer Impact)
Level 4: CEO
```

---

## 9. Metrics and KPIs

### 9.1 Reliability Metrics (Weekly)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | > 99.5% | Health endpoint monitoring |
| P95 Latency | < 500ms | Request logs |
| Error Rate | < 1% | Error log ratio |
| MTTR | < 1 hour | Incident log |

### 9.2 Security Metrics (Monthly)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical vulns | 0 open > 7 days | Dependency scan |
| High vulns | 0 open > 30 days | Dependency scan |
| Access reviews | 100% complete | Access audit |
| Control evidence | 100% collected | Evidence tracker |

### 9.3 Compliance Metrics (Quarterly)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Gap closure rate | > 80% | Gap register |
| Audit findings | < 5 medium | Audit report |
| DR drill success | 100% | Drill report |
| Control effectiveness | > 95% | Control testing |

---

## 10. Communication Cadence

### 10.1 Regular Communications

| Communication | Frequency | Audience | Owner |
|---------------|-----------|----------|-------|
| Operations summary | Weekly | Engineering team | Engineering Lead |
| Incident report | Per incident | Stakeholders | On-Call |
| Compliance report | Monthly | Leadership | Security Lead |
| Executive summary | Quarterly | Board/Investors | CTO |

### 10.2 Templates

All templates stored in: `docs/templates/`
- `weekly-ops-summary.md`
- `incident-report.md`
- `monthly-compliance-report.md`
- `quarterly-executive-summary.md`

---

## 11. Continuous Improvement

### 11.1 Feedback Loops

| Source | Frequency | Action |
|--------|-----------|--------|
| Incident retrospectives | Per incident | Update runbooks |
| Weekly ops review | Weekly | Process improvements |
| Customer feedback | Ongoing | Feature backlog |
| Audit findings | Per audit | Gap register |

### 11.2 Process Updates

| Trigger | Action | Owner |
|---------|--------|-------|
| Major incident | Update runbook | Engineering Lead |
| Compliance finding | Update control | Security Lead |
| Customer escalation | Review SLA | Product Lead |
| Regulatory change | Assess impact | CTO |

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Security Lead | __________ | __________ |
| CTO | __________ | __________ |

