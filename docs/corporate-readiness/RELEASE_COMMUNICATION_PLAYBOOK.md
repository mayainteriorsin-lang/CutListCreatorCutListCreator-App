# Release Communication Playbook

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define the release communication checklist and procedures for all production deployments.

---

## 2. Release Classification

### 2.1 Release Types

| Type | Scope | Communication | Approval |
|------|-------|---------------|----------|
| **Hotfix** | Critical bug/security | Post-release only | Engineering Lead |
| **Patch** | Bug fixes | #engineering | Engineering Lead |
| **Minor** | New features | #general + changelog | CAB |
| **Major** | Breaking changes | All channels + advance notice | ARB + CAB |

### 2.2 Communication Requirements by Type

| Type | Pre-Release | Day-of | Post-Release |
|------|-------------|--------|--------------|
| Hotfix | None (emergency) | Status channel | Incident report |
| Patch | 24h notice to engineering | Deploy announcement | Release notes |
| Minor | 3 days notice, changelog draft | Deploy announcement | Release notes + blog |
| Major | 2 weeks notice, migration guide | Deploy announcement | Full documentation |

---

## 3. Pre-Release Communication

### 3.1 Checklist (3-7 days before)

```markdown
## Pre-Release Communication Checklist

### Planning
- [ ] Release date confirmed
- [ ] Release scope finalized
- [ ] Breaking changes documented
- [ ] Migration guide written (if needed)
- [ ] Rollback plan prepared

### Internal Communication
- [ ] Engineering team notified (#engineering)
- [ ] Support team briefed (if user-facing)
- [ ] On-call schedule confirmed
- [ ] CAB approval obtained (if required)

### Documentation
- [ ] Changelog entry drafted
- [ ] Release notes written
- [ ] API documentation updated
- [ ] User-facing documentation updated

### Customer Communication (Major releases)
- [ ] Advance notice sent
- [ ] Migration timeline communicated
- [ ] Support channels prepared
- [ ] FAQ prepared
```

### 3.2 Pre-Release Announcement Template

```markdown
📅 UPCOMING RELEASE NOTICE

**Release**: v[X.Y.Z]
**Type**: [Hotfix/Patch/Minor/Major]
**Scheduled**: [DATE] at [TIME] [TIMEZONE]
**Expected Duration**: [X minutes]
**Expected Downtime**: [None/X minutes]

**Summary**:
[Brief description of what's included]

**Notable Changes**:
- [Change 1]
- [Change 2]
- [Change 3]

**Breaking Changes**: [None/List]

**Action Required**: [None/Description]

**Release Owner**: @[name]
**Contact**: [channel/email]
```

---

## 4. Day-of-Release Communication

### 4.1 Release Start Announcement

```markdown
🚀 RELEASE STARTING

**Release**: v[X.Y.Z]
**Status**: DEPLOYING
**Started**: [TIME]

Deployment in progress. Updates will be posted here.

**Release Owner**: @[name]
```

### 4.2 Release Progress Updates

Post updates for:
- Deployment started
- Deployment completed
- Validation started
- Validation completed
- Release complete

### 4.3 Release Complete Announcement

```markdown
✅ RELEASE COMPLETE

**Release**: v[X.Y.Z]
**Status**: DEPLOYED
**Completed**: [TIME]
**Duration**: [X minutes]

**Summary**:
[Brief summary of what was released]

**Verification**:
- Health check: ✅ Passing
- Smoke tests: ✅ Passing
- No errors detected

**Release Notes**: [link]

**Issues?** Report in #support or contact @[name]
```

---

## 5. Post-Release Communication

### 5.1 Release Notes Template

```markdown
# Release Notes - v[X.Y.Z]

**Release Date**: [DATE]

## Highlights
[1-2 sentence summary of the most important changes]

## New Features
- **[Feature Name]**: [Brief description]
- **[Feature Name]**: [Brief description]

## Improvements
- [Improvement 1]
- [Improvement 2]

## Bug Fixes
- Fixed: [Bug description] (#[issue])
- Fixed: [Bug description] (#[issue])

## Security
- [Security fix description] (if any)

## Breaking Changes
- [Breaking change description] (if any)

## Deprecations
- [Deprecation notice] (if any)

## Known Issues
- [Known issue] (if any)

## Upgrade Notes
[Any special instructions for upgrading]

---
Full changelog: [link to commit comparison]
```

### 5.2 Post-Release Checklist

```markdown
## Post-Release Checklist

### Immediate (within 1 hour)
- [ ] Release announcement posted
- [ ] Release notes published
- [ ] Documentation links updated
- [ ] Monitor error rates
- [ ] Monitor latency

### Same Day
- [ ] Verify no regression issues
- [ ] Review user feedback channels
- [ ] Update ticket statuses
- [ ] Archive release branch (if applicable)

### Next Day
- [ ] Review overnight metrics
- [ ] Confirm no delayed issues
- [ ] Close release tracking ticket
- [ ] Post-release retrospective (for major releases)
```

---

## 6. Failed Release Communication

### 6.1 Rollback Announcement

```markdown
⚠️ RELEASE ROLLBACK

**Release**: v[X.Y.Z]
**Status**: ROLLING BACK
**Reason**: [Brief reason]

We are rolling back to v[previous version]. Updates will be posted here.

**Incident Owner**: @[name]
```

### 6.2 Rollback Complete Announcement

```markdown
🔄 ROLLBACK COMPLETE

**Previous Version**: v[X.Y.Z]
**Current Version**: v[previous version]
**Status**: STABLE

**Summary**:
[What happened and why rollback was necessary]

**Impact**:
[Description of user impact, if any]

**Next Steps**:
[What will be done to address the issue]

**Post-Mortem**: [Will be scheduled/link]
```

---

## 7. Communication Channels

### 7.1 Channel Matrix

| Audience | Channel | When |
|----------|---------|------|
| Engineering | #engineering (Slack) | All releases |
| Support | #support (Slack) | User-facing changes |
| All Staff | #general (Slack) | Major releases |
| Customers | Email/In-app | Major releases, breaking changes |
| Public | Blog/Changelog | Notable features |

### 7.2 Escalation Contacts

| Role | Contact | When |
|------|---------|------|
| Release Owner | @[name] | Any release questions |
| Engineering Lead | @[name] | Release issues |
| On-Call | See schedule | Incidents |
| Communications | @[name] | Customer-facing issues |

---

## 8. Release Calendar

### 8.1 Release Windows

| Day | Window | Type Allowed |
|-----|--------|--------------|
| Monday | 10am-2pm | Patch, Minor |
| Tuesday | 10am-4pm | All types |
| Wednesday | 10am-4pm | All types |
| Thursday | 10am-2pm | Patch, Minor |
| Friday | Emergency only | Hotfix only |
| Weekend | Emergency only | Hotfix only |

### 8.2 Blackout Periods

| Period | Dates | Rationale |
|--------|-------|-----------|
| End of month | Last 2 business days | Business critical period |
| Holidays | Per company calendar | Reduced coverage |
| Major events | As announced | Customer impact |

---

## 9. Metrics and Reporting

### 9.1 Release Metrics to Track

| Metric | Target |
|--------|--------|
| Deployment success rate | >95% |
| Rollback rate | <5% |
| Mean deployment time | <15 min |
| Time to communication | <5 min |

### 9.2 Monthly Release Report

```markdown
## Monthly Release Report - [MONTH]

### Summary
- Total releases: X
- Successful: X (X%)
- Rollbacks: X (X%)

### By Type
| Type | Count | Success Rate |
|------|-------|--------------|
| Hotfix | X | X% |
| Patch | X | X% |
| Minor | X | X% |
| Major | X | X% |

### Notable Releases
- [Release description]
- [Release description]

### Issues
- [Any release issues]

### Improvements Identified
- [Improvement 1]
- [Improvement 2]
```

---

## 10. Templates Library

All templates available at: `docs/templates/releases/`

| Template | Purpose |
|----------|---------|
| pre-release-notice.md | Pre-release announcement |
| release-start.md | Deployment start |
| release-complete.md | Deployment complete |
| release-notes.md | Release notes |
| rollback-notice.md | Rollback announcement |
| monthly-report.md | Monthly summary |

---

## 11. Quick Reference

### Release Communication Flow

```
┌─────────────────────────────────────────────────────────┐
│                 RELEASE COMMUNICATION FLOW               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PRE-RELEASE        DAY-OF           POST-RELEASE      │
│  ───────────        ──────           ────────────      │
│  3-7 days before    Release day      Same day + after  │
│                                                         │
│  • Announce date    • Start notice   • Complete notice │
│  • Share scope      • Progress       • Release notes   │
│  • Get approvals    • Complete       • Monitor         │
│  • Prep docs        • (or rollback)  • Retrospective   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
