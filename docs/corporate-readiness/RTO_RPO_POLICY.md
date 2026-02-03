# RTO/RPO Policy

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) for CutListCreator systems to guide disaster recovery planning and investment decisions.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| **RTO** | Recovery Time Objective - Maximum acceptable time to restore service after disruption |
| **RPO** | Recovery Point Objective - Maximum acceptable data loss measured in time |
| **MTTR** | Mean Time to Recovery - Average time to restore service |
| **MTPD** | Maximum Tolerable Period of Disruption - Business limit before severe impact |

---

## 3. System Classification

### 3.1 Criticality Tiers

| Tier | Description | Systems | Business Impact |
|------|-------------|---------|-----------------|
| **Tier 0** | Mission Critical | Database, Authentication | Immediate revenue/reputation impact |
| **Tier 1** | Business Critical | API Server, Web App | Direct user impact |
| **Tier 2** | Business Important | File Storage, Reports | Degraded functionality |
| **Tier 3** | Business Support | CI/CD, Monitoring | Internal impact only |

### 3.2 System Mapping

| System | Tier | Justification |
|--------|------|---------------|
| PostgreSQL Database | 0 | All persistent data |
| Authentication Service | 0 | User access control |
| API Server | 1 | Core business logic |
| Web Application | 1 | User interface |
| File Storage | 2 | Document management |
| Background Workers | 2 | Async processing |
| CI/CD Pipeline | 3 | Development workflow |
| Log Aggregation | 3 | Operational visibility |

---

## 4. RTO/RPO Targets

### 4.1 By Tier

| Tier | RTO | RPO | MTPD |
|------|-----|-----|------|
| **Tier 0** | 1 hour | 0 (no data loss) | 2 hours |
| **Tier 1** | 4 hours | 1 hour | 8 hours |
| **Tier 2** | 8 hours | 4 hours | 24 hours |
| **Tier 3** | 24 hours | 24 hours | 48 hours |

### 4.2 By System

| System | RTO | RPO | Recovery Method |
|--------|-----|-----|-----------------|
| PostgreSQL Database | 1 hour | ~5 min | Neon PITR |
| Authentication | 1 hour | 0 | Stateless + DB |
| API Server | 15 min | N/A | Render redeploy |
| Web Application | 15 min | N/A | Render redeploy |
| File Storage | 8 hours | 4 hours | Manual restore |
| CI/CD | 24 hours | 24 hours | Reconfigure |

---

## 5. Current Capability Assessment

### 5.1 Capability vs Target

| System | RTO Target | Current RTO | Gap | RPO Target | Current RPO | Gap |
|--------|------------|-------------|-----|------------|-------------|-----|
| Database | 1 hr | 30 min | ✅ None | 0 | ~5 min | ⚠️ Minor |
| Auth | 1 hr | 15 min | ✅ None | 0 | ~5 min | ⚠️ Minor |
| API | 4 hr | 15 min | ✅ None | 1 hr | N/A | ✅ None |
| Web App | 4 hr | 15 min | ✅ None | 1 hr | N/A | ✅ None |
| File Storage | 8 hr | GAP | ⚠️ High | 4 hr | GAP | ⚠️ High |
| CI/CD | 24 hr | 4 hr | ✅ None | 24 hr | 0 | ✅ None |

### 5.2 Gap Analysis

| Gap | Impact | Remediation | Priority |
|-----|--------|-------------|----------|
| File storage no backup | Cannot recover uploaded files | Implement object storage backup | P1 |
| Database RPO ~5 min | Up to 5 min data loss possible | Acceptable for current scale | P3 |

---

## 6. Recovery Strategies

### 6.1 Tier 0 - Mission Critical

**Strategy**: Hot standby with continuous replication

**Current Implementation**:
- Neon PostgreSQL with Point-in-Time Recovery (PITR)
- PITR granularity: ~5 minutes
- Retention: 7 days (Free) / 30 days (Pro)

**Recovery Procedure**:
1. Identify recovery point timestamp
2. Create branch from PITR
3. Update application configuration
4. Verify data integrity
5. Resume operations

**Evidence**: Neon platform documentation, PITR feature availability

### 6.2 Tier 1 - Business Critical

**Strategy**: Automated platform recovery

**Current Implementation**:
- Render automatic container restart
- Deployment from Git repository
- Stateless application design

**Recovery Procedure**:
1. Platform detects failure via health checks
2. Automatic container restart (or manual trigger)
3. Startup validation runs
4. Health probes confirm ready state
5. Traffic resumes

**Evidence**:
- Health endpoints: `server/routes.ts`
- Graceful shutdown: `server/lib/gracefulShutdown.ts`
- Startup validation: `server/lib/startupValidation.ts`

### 6.3 Tier 2 - Business Important

**Strategy**: Manual recovery from backup

**Current Implementation**: GAP for file storage

**Planned Implementation**:
- Object storage (S3/GCS) for files
- Automated backup with retention
- Manual restore procedure

### 6.4 Tier 3 - Business Support

**Strategy**: Rebuild from configuration

**Current Implementation**:
- CI/CD configuration in Git
- Infrastructure as code (where applicable)
- Documentation for manual setup

---

## 7. Recovery Testing Requirements

### 7.1 Testing Frequency

| Tier | Test Type | Frequency | Owner |
|------|-----------|-----------|-------|
| Tier 0 | Full recovery drill | Quarterly | DBA |
| Tier 1 | Failover test | Monthly | DevOps |
| Tier 2 | Restore test | Quarterly | Backend Lead |
| Tier 3 | Rebuild test | Annual | DevOps |

### 7.2 Test Success Criteria

| Tier | RTO Success | RPO Success |
|------|-------------|-------------|
| Tier 0 | Recovery < 1 hour | Data loss < target |
| Tier 1 | Recovery < 4 hours | N/A (stateless) |
| Tier 2 | Recovery < 8 hours | Data loss < 4 hours |
| Tier 3 | Recovery < 24 hours | N/A |

---

## 8. Escalation Thresholds

### 8.1 Recovery Time Escalation

| Time Elapsed | Action | Escalation To |
|--------------|--------|---------------|
| RTO - 30 min | Warning alert | On-call engineer |
| RTO | Escalation alert | Engineering Lead |
| RTO + 30 min | Critical escalation | CTO |
| MTPD | Executive escalation | CEO |

### 8.2 Data Loss Escalation

| Data Loss | Action | Escalation To |
|-----------|--------|---------------|
| > RPO | Assess and document | Engineering Lead |
| > 2x RPO | Customer notification assessment | Product + Legal |
| > MTPD equivalent | Executive notification | CTO + CEO |

---

## 9. Monitoring and Reporting

### 9.1 Recovery Metrics

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Actual RTO | < Target RTO | Incident timeline |
| Actual RPO | < Target RPO | Data timestamp analysis |
| Test success rate | 100% | Drill reports |
| MTTR trend | Decreasing | Monthly analysis |

### 9.2 Quarterly Report

```markdown
## RTO/RPO Quarterly Report - Q[X] [YEAR]

### Incidents
| Incident | System | Tier | Actual RTO | Target RTO | Actual RPO | Target RPO |
|----------|--------|------|------------|------------|------------|------------|

### Test Results
| Test | System | Date | RTO Result | RPO Result | Pass/Fail |
|------|--------|------|------------|------------|-----------|

### Recommendations
[Based on incidents and tests]
```

---

## 10. Policy Exceptions

### 10.1 Exception Process

Exceptions to RTO/RPO targets require:
1. Written justification
2. Risk assessment
3. Compensating controls
4. Engineering Lead approval
5. CTO approval (Tier 0/1)

### 10.2 Current Exceptions

| System | Standard Target | Exception | Justification | Expiry |
|--------|-----------------|-----------|---------------|--------|
| File storage | 8hr RTO / 4hr RPO | GAP | Migration in progress | 2026-03-01 |

---

## 11. Policy Review

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Policy review | Annual | Engineering Lead |
| Target adjustment | Annual | CTO |
| Gap assessment | Quarterly | Engineering Lead |
| Test result review | Quarterly | Engineering Lead |

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| CTO | __________ | __________ |
