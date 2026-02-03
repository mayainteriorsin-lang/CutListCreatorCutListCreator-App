# Risk Acceptance Policy

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define the risk acceptance lifecycle with mandatory owner assignment and expiry dates for all accepted risks.

---

## 2. Core Principles

### 2.1 Mandatory Requirements

Every accepted risk MUST have:

| Requirement | Description |
|-------------|-------------|
| **Owner** | Named individual (not team/role) |
| **Expiry Date** | Maximum 90 days from acceptance |
| **Mitigation Plan** | Steps to reduce or eliminate risk |
| **Review Cadence** | How often the risk is reviewed |
| **Acceptance Authority** | Who approved the acceptance |

### 2.2 No Permanent Acceptances

- Risk acceptances automatically expire
- Maximum acceptance period: 90 days
- Renewal requires re-review and re-approval
- Expired acceptances escalate to Engineering Lead

---

## 3. Risk Classification

### 3.1 Severity Levels

| Severity | Impact | Examples |
|----------|--------|----------|
| **Critical** | System-wide failure, data breach | Auth bypass, data exposure |
| **High** | Major feature broken, security vulnerability | XSS, injection, data loss |
| **Medium** | Degraded functionality, performance issue | Slow queries, UI bugs |
| **Low** | Minor inconvenience, cosmetic | Typos, minor styling |

### 3.2 Acceptance Authority Matrix

| Risk Severity | Acceptance Authority | Max Duration |
|---------------|---------------------|--------------|
| Critical | CTO + Security Lead | 30 days |
| High | Engineering Lead + Security Lead | 60 days |
| Medium | Engineering Lead | 90 days |
| Low | Team Lead | 90 days |

---

## 4. Risk Acceptance Lifecycle

### 4.1 Lifecycle Stages

```
┌─────────────────────────────────────────────────────────────┐
│                  RISK ACCEPTANCE LIFECYCLE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ IDENTIFY │ → │ ASSESS   │ → │ ACCEPT   │ → │ MONITOR  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│                                      │              │       │
│                                      │              ↓       │
│                               ┌──────────┐   ┌──────────┐  │
│                               │ RENEW/   │ ← │ REVIEW   │  │
│                               │ RESOLVE  │   │ (expiry) │  │
│                               └──────────┘   └──────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Stage Descriptions

| Stage | Activities | Output |
|-------|------------|--------|
| **Identify** | Discover risk, document details | Risk description |
| **Assess** | Evaluate severity, impact, likelihood | Risk assessment |
| **Accept** | Get approval, assign owner, set expiry | Risk Acceptance Form |
| **Monitor** | Track mitigation progress, watch for changes | Status updates |
| **Review** | Re-assess before expiry | Renewal or resolution |
| **Resolve** | Eliminate risk or renew acceptance | Closure or renewal |

---

## 5. Risk Acceptance Form

### 5.1 Template

```markdown
# Risk Acceptance Form

## Risk Information
- **Risk ID**: RISK-[YYYY]-[NNN]
- **Title**: [Brief description]
- **Discovered Date**: [DATE]
- **Reported By**: [NAME]

## Risk Assessment
- **Severity**: [Critical/High/Medium/Low]
- **Likelihood**: [High/Medium/Low]
- **Impact**: [Description of potential impact]
- **Affected Systems**: [List of systems/components]

## Acceptance Details
- **Owner**: [NAME] (individual, not team)
- **Acceptance Date**: [DATE]
- **Expiry Date**: [DATE] (max 90 days)
- **Acceptance Authority**: [NAME + ROLE]
- **Review Cadence**: [Weekly/Bi-weekly/Monthly]

## Mitigation Plan
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | [Status] |
| [Action 2] | [Name] | [Date] | [Status] |

## Justification
[Why is this risk being accepted rather than fixed immediately?]

## Compensating Controls
[What temporary measures are in place to reduce risk?]

## Exit Criteria
[What conditions will close this risk acceptance?]

## Approvals
| Role | Name | Date | Signature |
|------|------|------|-----------|
| Risk Owner | | | |
| Acceptance Authority | | | |
| Security Review | | | |

## Renewal History
| Renewal Date | New Expiry | Approver | Justification |
|--------------|------------|----------|---------------|
| | | | |
```

---

## 6. Current Risk Register

### 6.1 Active Accepted Risks

| Risk ID | Title | Severity | Owner | Expiry | Status |
|---------|-------|----------|-------|--------|--------|
| RISK-2026-001 | react-router XSS vulnerability | High | Frontend Lead | 2026-02-17 | OPEN |
| RISK-2026-002 | xlsx library vulnerabilities | High | Backend Lead | 2026-02-17 | IN REVIEW |
| RISK-2026-003 | jspdf injection vulnerabilities | Medium | Frontend Lead | 2026-03-03 | OPEN |

### 6.2 Risk Details

#### RISK-2026-001: react-router XSS vulnerability

```markdown
- Severity: High
- Owner: Frontend Lead
- Acceptance Date: 2026-02-03
- Expiry Date: 2026-02-17 (14 days)
- Acceptance Authority: Engineering Lead + Security Lead

Mitigation Plan:
1. Upgrade react-router-dom to latest version
2. Test all routing functionality
3. Deploy fix to production

Justification:
Upgrade requires testing due to potential breaking changes.
Limited time between go-live and upgrade.

Compensating Controls:
- CSP headers active (partial protection)
- Rate limiting in place
- Monitoring for suspicious redirect patterns
```

#### RISK-2026-002: xlsx library vulnerabilities

```markdown
- Severity: High
- Owner: Backend Lead
- Acceptance Date: 2026-02-03
- Expiry Date: 2026-02-17 (14 days)
- Acceptance Authority: Engineering Lead + Security Lead

Mitigation Plan:
1. Decision: Replace library vs sandbox vs accept
2. If replace: Identify alternative library
3. If sandbox: Implement isolated processing
4. If accept: Document compensating controls

Justification:
No fix available from library maintainer.
Requires architectural decision.

Compensating Controls:
- Input validation on uploaded files
- File size limits
- User permission checks before export
```

---

## 7. Review and Renewal Process

### 7.1 Pre-Expiry Review (7 days before)

```markdown
## Pre-Expiry Risk Review

### Risk: [RISK ID]
### Review Date: [DATE]
### Expiry Date: [DATE]

### Current Status
- Mitigation progress: [X]% complete
- Remaining actions: [List]
- Blockers: [List]

### Decision Required
- [ ] RESOLVE: Risk has been eliminated
- [ ] RENEW: Risk still exists, extend acceptance
- [ ] ESCALATE: Unable to resolve or renew

### If Renewing
- New expiry date: [DATE] (max 90 days from today)
- Updated mitigation plan: [Description]
- Justification for renewal: [Reason]

### If Resolving
- Resolution method: [How was risk eliminated?]
- Verification: [How was resolution verified?]
- Closure date: [DATE]
```

### 7.2 Expiry Handling

| Scenario | Action |
|----------|--------|
| Risk resolved | Close acceptance, update register |
| Renewal approved | Update expiry, document justification |
| Renewal denied | Escalate to Engineering Lead |
| No review conducted | Auto-escalate to Engineering Lead + CTO |

---

## 8. Escalation Procedures

### 8.1 Automatic Escalations

| Trigger | Escalation Target | Timeline |
|---------|-------------------|----------|
| Critical risk unresolved >14 days | CTO | Immediate |
| High risk unresolved >30 days | Engineering Lead | Within 24h |
| Risk acceptance expired | Engineering Lead | Immediate |
| No mitigation progress >7 days | Risk Owner's manager | Within 24h |

### 8.2 Escalation Template

```
⚠️ RISK ESCALATION

Risk ID: [RISK-YYYY-NNN]
Title: [Title]
Severity: [Severity]
Owner: [Name]

Escalation Reason:
[Why is this being escalated?]

Current Status:
[Brief status update]

Action Required:
[What decision/action is needed?]

Deadline: [DATE]
```

---

## 9. Reporting

### 9.1 Weekly Risk Summary (Friday)

```markdown
## Weekly Risk Summary - [DATE]

### Active Risks by Severity
- Critical: X
- High: X
- Medium: X
- Low: X

### Expiring This Week
| Risk ID | Title | Expiry | Owner |
|---------|-------|--------|-------|

### New Risks This Week
| Risk ID | Title | Severity | Owner |
|---------|-------|----------|-------|

### Resolved This Week
| Risk ID | Title | Resolution |
|---------|-------|------------|
```

### 9.2 Monthly Risk Report

Included in Monthly Governance Report (see GOVERNANCE_CADENCE_POLICY.md)

---

## 10. Policy Compliance

### 10.1 Compliance Checks

| Check | Frequency | Owner |
|-------|-----------|-------|
| All risks have owners | Weekly | Engineering Lead |
| No expired acceptances | Daily (automated) | Security Lead |
| Mitigation progress tracked | Weekly | Risk Owners |
| Renewal reviews conducted | Pre-expiry | Risk Owners |

### 10.2 Non-Compliance Consequences

| Violation | Consequence |
|-----------|-------------|
| Risk without owner | Assigned to Engineering Lead |
| Expired acceptance | Escalate + emergency review |
| No mitigation progress | Manager escalation |
| Repeated violations | Process improvement review |

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | Engineering | Initial version |
