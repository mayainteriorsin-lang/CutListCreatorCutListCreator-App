# DORA Metrics Baseline Model

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Establish a baseline model for tracking DORA metrics (Deployment Frequency, Lead Time, Change Failure Rate, MTTR) to measure and improve developer productivity.

---

## 2. DORA Metrics Overview

### 2.1 The Four Key Metrics

| Metric | Definition | Elite | High | Medium | Low |
|--------|------------|-------|------|--------|-----|
| **Deployment Frequency** | How often code is deployed to production | On-demand (multiple/day) | Daily to weekly | Weekly to monthly | Monthly+ |
| **Lead Time for Changes** | Time from commit to production | <1 hour | 1 day - 1 week | 1 week - 1 month | 1-6 months |
| **Change Failure Rate** | % of deployments causing failure | 0-15% | 16-30% | 31-45% | 46-60% |
| **Mean Time to Recovery** | Time to recover from failure | <1 hour | <1 day | <1 week | 1 week+ |

### 2.2 Current State Assessment

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Deployment Frequency | GAP - not tracked | Weekly | Unknown |
| Lead Time for Changes | GAP - not tracked | <1 week | Unknown |
| Change Failure Rate | GAP - not tracked | <15% | Unknown |
| Mean Time to Recovery | GAP - not tracked | <4 hours | Unknown |

---

## 3. Measurement Implementation

### 3.1 Data Sources

| Metric | Primary Source | Secondary Source | Status |
|--------|----------------|------------------|--------|
| Deployment Frequency | Render deploy logs | GitHub releases | GAP |
| Lead Time | Git commits → Render deploys | GitHub Actions | GAP |
| Change Failure Rate | Incident log + deploy log | Rollback count | GAP |
| MTTR | Incident timeline | Alert → resolution time | GAP |

### 3.2 Deployment Frequency Tracking

**Definition**: Count of production deployments per time period

**Data Collection**:
```markdown
## Deployment Log Template

| Date | Deploy ID | Version | Type | Initiator | Status |
|------|-----------|---------|------|-----------|--------|
| YYYY-MM-DD | [id] | vX.Y.Z | [hotfix/patch/minor/major] | @name | success/failed |
```

**Calculation**:
```
Weekly Deployment Frequency = Successful deploys in week / 1 week
Monthly Deployment Frequency = Successful deploys in month / 4.33 weeks
```

**GAP: Automated Collection**
- Currently: Manual tracking required
- Recommendation: Parse Render deploy webhook or API

### 3.3 Lead Time for Changes Tracking

**Definition**: Time from first commit to production deployment

**Components**:
```
Lead Time = Coding Time + Review Time + Deploy Time

Where:
- Coding Time = First commit → PR created
- Review Time = PR created → PR merged
- Deploy Time = PR merged → Production deploy
```

**Data Collection**:
```markdown
## Lead Time Tracking Template

| PR # | First Commit | PR Created | PR Merged | Deployed | Total Lead Time |
|------|--------------|------------|-----------|----------|-----------------|
| #123 | YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | X hours/days |
```

**GAP: Automated Collection**
- Currently: Manual tracking required
- Recommendation: GitHub API + Render API correlation

### 3.4 Change Failure Rate Tracking

**Definition**: Percentage of deployments that result in degraded service or require rollback

**What Counts as Failure**:
- Deployment causes incident (P0/P1)
- Deployment requires rollback
- Deployment requires immediate hotfix
- Service degradation detected within 24 hours

**Data Collection**:
```markdown
## Change Failure Log

| Deploy ID | Date | Version | Failure Type | Incident ID | Rolled Back |
|-----------|------|---------|--------------|-------------|-------------|
| [id] | YYYY-MM-DD | vX.Y.Z | [incident/rollback/hotfix] | INC-XXX | Yes/No |
```

**Calculation**:
```
Change Failure Rate = (Failed Deploys / Total Deploys) × 100%

Monthly CFR = (Deploys causing failure in month / Total deploys in month) × 100%
```

### 3.5 Mean Time to Recovery Tracking

**Definition**: Average time from incident detection to service restoration

**Measurement Points**:
```
MTTR = Detection Time + Response Time + Resolution Time

Where:
- Detection Time = Incident start → Alert/detection
- Response Time = Alert → First responder engaged
- Resolution Time = Engaged → Service restored
```

**Data Collection**:
```markdown
## MTTR Tracking Log

| Incident ID | Severity | Detected | Responded | Resolved | Total MTTR |
|-------------|----------|----------|-----------|----------|------------|
| INC-XXX | P0/P1 | YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | X hours |
```

**Calculation**:
```
MTTR = Sum of all recovery times / Number of incidents

Monthly MTTR = Sum of MTTRs in month / Count of incidents in month
```

---

## 4. Baseline Establishment Process

### 4.1 30-Day Baseline Period

```markdown
## DORA Baseline Collection - 30 Day Period

### Week 1: [DATES]
| Metric | Value |
|--------|-------|
| Deployments | __ |
| Avg Lead Time | __ |
| Failed Deploys | __ |
| Incidents | __ |
| Avg MTTR | __ |

### Week 2: [DATES]
[Same format]

### Week 3: [DATES]
[Same format]

### Week 4: [DATES]
[Same format]

### 30-Day Summary
| Metric | Total/Average | Per Week |
|--------|---------------|----------|
| Deployment Frequency | __ deploys | __/week |
| Lead Time | __ avg | - |
| Change Failure Rate | __% | - |
| MTTR | __ avg | - |
```

### 4.2 Baseline Targets

| Metric | Initial Target | 90-Day Target | Rationale |
|--------|----------------|---------------|-----------|
| Deployment Frequency | 1/week | 2-3/week | Build deployment confidence |
| Lead Time | <2 weeks | <1 week | Reduce batch size |
| Change Failure Rate | <20% | <15% | Improve quality gates |
| MTTR | <8 hours | <4 hours | Improve detection and response |

---

## 5. Reporting and Review

### 5.1 Weekly DORA Report

```markdown
## Weekly DORA Report - Week of [DATE]

### Metrics Summary
| Metric | This Week | Last Week | Trend | Target |
|--------|-----------|-----------|-------|--------|
| Deployments | __ | __ | ↑/→/↓ | 1+/week |
| Avg Lead Time | __ | __ | ↑/→/↓ | <2 weeks |
| Change Failure Rate | __% | __% | ↑/→/↓ | <20% |
| MTTR | __ | __ | ↑/→/↓ | <8 hours |

### Deployment Details
| Date | Version | Type | Lead Time | Result |
|------|---------|------|-----------|--------|
| | | | | |

### Incidents (if any)
| Incident | Severity | MTTR | Related Deploy |
|----------|----------|------|----------------|
| | | | |

### Observations
[Notable patterns, concerns, or improvements]

### Action Items
| Action | Owner | Due |
|--------|-------|-----|
| | | |
```

### 5.2 Monthly DORA Review

**Schedule**: Last Friday of month
**Participants**: Engineering team

**Agenda**:
```markdown
## Monthly DORA Review - [MONTH]

### 1. Metrics Overview (10 min)
| Metric | Month Value | Prev Month | Trend | Target |
|--------|-------------|------------|-------|--------|
| Deployment Frequency | __ | __ | | |
| Lead Time | __ | __ | | |
| Change Failure Rate | __% | __% | | |
| MTTR | __ | __ | | |

### 2. Deployment Analysis (10 min)
- Total deployments: __
- Successful: __
- Failed/Rolled back: __
- By type: Hotfix __, Patch __, Minor __, Major __

### 3. Lead Time Breakdown (10 min)
- Avg coding time: __
- Avg review time: __
- Avg deploy time: __
- Bottleneck: __

### 4. Failure Analysis (10 min)
- Failures this month: __
- Root causes:
  - Code issues: __
  - Config issues: __
  - Infrastructure: __
  - External: __

### 5. Recovery Analysis (10 min)
- Incidents requiring recovery: __
- Avg detection time: __
- Avg response time: __
- Avg resolution time: __

### 6. Improvement Actions (10 min)
| Action | Expected Impact | Owner | Due |
|--------|-----------------|-------|-----|
| | | | |
```

### 5.3 Quarterly DORA Trends

```markdown
## Quarterly DORA Trends - Q[X] [YEAR]

### Trend Charts
[Insert trend visualizations]

### Quarter-over-Quarter Comparison
| Metric | Q[X-1] | Q[X] | Change |
|--------|--------|------|--------|
| Deployment Frequency | __/week | __/week | +/-__% |
| Lead Time | __ | __ | +/-__% |
| Change Failure Rate | __% | __% | +/-__pp |
| MTTR | __ | __ | +/-__% |

### Performance Category
Based on DORA research benchmarks:
- Current: [Low/Medium/High/Elite]
- Target: [Medium/High/Elite]

### Strategic Recommendations
[Recommendations for next quarter]
```

---

## 6. Golden Path for Feature Delivery

### 6.1 Standard Feature Delivery Path

```
┌─────────────────────────────────────────────────────────────┐
│                GOLDEN PATH - FEATURE DELIVERY                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PLAN          BUILD          VALIDATE       RELEASE        │
│  ────          ─────          ────────       ───────        │
│  1-2 days      2-5 days       1-2 days       <1 day         │
│                                                             │
│  • Ticket      • Feature      • Code         • Deploy       │
│  • Design      • Tests        • PR review    • Validate     │
│  • Scope       • Docs         • CI gates     • Monitor      │
│                                                             │
│                    MANDATORY GATES                          │
│  ─────────────────────────────────────────────────────────  │
│  □ Ticket approved          □ Tests pass                    │
│  □ Design reviewed          □ Code reviewed                 │
│  □ Scope confirmed          □ Security scan                 │
│  □ Dependencies identified  □ Post-release validation       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Mandatory Gates Checklist

```markdown
## Feature Delivery Gates

### Gate 1: Planning Complete
- [ ] Ticket created with acceptance criteria
- [ ] Technical design documented (if complex)
- [ ] Scope agreed with product owner
- [ ] Dependencies identified
- [ ] Estimated effort documented

### Gate 2: Development Complete
- [ ] Feature implemented per requirements
- [ ] Unit tests written and passing
- [ ] Integration tests written (if applicable)
- [ ] Documentation updated
- [ ] No new linting errors

### Gate 3: Review Complete
- [ ] PR created with description
- [ ] Code review approved
- [ ] CI pipeline passing
- [ ] Security scan passed
- [ ] No blocking comments

### Gate 4: Release Complete
- [ ] Deployed to staging
- [ ] Staging validation passed
- [ ] Deployed to production
- [ ] Post-release validation passed
- [ ] Ticket closed
```

### 6.3 Lead Time Targets by Feature Size

| Size | Definition | Lead Time Target |
|------|------------|------------------|
| XS | <4 hours work | <2 days |
| S | 4-8 hours work | <3 days |
| M | 1-3 days work | <1 week |
| L | 3-5 days work | <2 weeks |
| XL | >5 days work | Split into smaller items |

---

## 7. Improvement Strategies

### 7.1 Improving Deployment Frequency

| Strategy | Description | Impact |
|----------|-------------|--------|
| Smaller batches | Deploy smaller changes more often | High |
| Automate deployment | Reduce manual steps | High |
| Feature flags | Decouple deploy from release | Medium |
| Trunk-based development | Reduce branch complexity | Medium |

### 7.2 Reducing Lead Time

| Strategy | Description | Impact |
|----------|-------------|--------|
| Faster code review | SLA for review turnaround | High |
| CI optimization | Faster pipeline execution | Medium |
| Smaller PRs | Easier to review and merge | High |
| Automated testing | Reduce manual QA time | Medium |

### 7.3 Reducing Change Failure Rate

| Strategy | Description | Impact |
|----------|-------------|--------|
| Better testing | More comprehensive tests | High |
| Staged rollout | Canary/blue-green deploys | High |
| Pre-deploy checks | Additional validation gates | Medium |
| Post-deploy monitoring | Faster detection | Medium |

### 7.4 Reducing MTTR

| Strategy | Description | Impact |
|----------|-------------|--------|
| Better monitoring | Faster detection | High |
| Runbooks | Faster diagnosis | High |
| Rollback automation | Faster recovery | High |
| On-call training | Better response | Medium |

---

## 8. Implementation Roadmap

### 8.1 Phase 1: Manual Tracking (Now)

- [ ] Create deployment log spreadsheet
- [ ] Create incident log spreadsheet
- [ ] Start weekly DORA report
- [ ] Establish 30-day baseline

### 8.2 Phase 2: Semi-Automated (Month 2)

- [ ] GitHub API integration for PR metrics
- [ ] Render API for deployment data
- [ ] Automated weekly report generation
- [ ] Dashboard prototype

### 8.3 Phase 3: Full Automation (Month 3+)

- [ ] Fully automated data collection
- [ ] Real-time DORA dashboard
- [ ] Trend alerting
- [ ] Integration with planning tools

---

## 9. Ownership

| Area | Owner |
|------|-------|
| DORA metric collection | Engineering Lead |
| Weekly reporting | On-call engineer |
| Monthly review | Engineering Lead |
| Process improvements | Engineering team |
| Tooling implementation | DevOps Lead |
