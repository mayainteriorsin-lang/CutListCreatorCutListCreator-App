# SLO & Error Budget Policy

## Document Version: 1.0
## Effective Date: Post Go-Live

---

## 1. Service Level Objectives (SLOs)

### 1.1 API Availability SLO

| Metric | Definition | Target | Measurement Window |
|--------|------------|--------|-------------------|
| **Availability** | Percentage of successful responses (HTTP 2xx/3xx/4xx excluding 5xx) | **99.5%** | Rolling 30 days |

**Measurement Formula**:
```
Availability = (Total Requests - 5xx Errors) / Total Requests × 100
```

**Data Source**: Application logs with `[METRICS]` prefix
```bash
# Example query (conceptual)
grep "[METRICS]" logs | awk '{if($NF >= 500) errors++; total++} END {print (total-errors)/total*100}'
```

**Exclusions**:
- Planned maintenance windows (announced 24h in advance)
- External dependency failures (documented separately)

---

### 1.2 API Latency SLO

| Metric | Definition | Target | Measurement Window |
|--------|------------|--------|-------------------|
| **p50 Latency** | 50th percentile response time | **< 200ms** | Rolling 7 days |
| **p95 Latency** | 95th percentile response time | **< 500ms** | Rolling 7 days |
| **p99 Latency** | 99th percentile response time | **< 2000ms** | Rolling 7 days |

**Measurement Formula**:
```
p95 = PERCENTILE(response_time_ms, 95) over window
```

**Data Source**: `[METRICS] request_duration_ms=XXX` log entries

**Exclusions**:
- File upload endpoints (> 1MB payload)
- Report generation endpoints (async)
- Bulk operations (> 100 items)

---

### 1.3 Error Rate SLO

| Metric | Definition | Target | Measurement Window |
|--------|------------|--------|-------------------|
| **Error Rate** | Percentage of requests returning 5xx errors | **< 1%** | Rolling 7 days |

**Measurement Formula**:
```
Error Rate = (5xx Responses / Total Responses) × 100
```

**Data Source**: Application logs, health endpoint responses

---

## 2. Error Budget Definition

### 2.1 Budget Calculation

| SLO | Target | Error Budget (30 days) |
|-----|--------|----------------------|
| Availability 99.5% | 0.5% downtime allowed | **216 minutes** |
| Error Rate 1% | 1% errors allowed | **1% of requests** |

**Monthly Error Budget Breakdown**:
```
Total minutes in 30 days: 43,200
Availability target: 99.5%
Error budget: 43,200 × 0.005 = 216 minutes of downtime allowed
```

### 2.2 Budget Consumption Tracking

| Budget Level | Status | Action |
|--------------|--------|--------|
| 0-50% consumed | GREEN | Normal operations |
| 50-75% consumed | YELLOW | Increased monitoring, no risky deploys |
| 75-90% consumed | ORANGE | Release freeze for non-critical changes |
| 90-100% consumed | RED | Full release freeze, reliability focus only |
| >100% consumed | CRITICAL | Emergency mode, leadership escalation |

---

## 3. Release Freeze Policy

### 3.1 Automatic Freeze Triggers

| Condition | Freeze Level | Duration |
|-----------|--------------|----------|
| Error budget > 75% consumed | Non-critical freeze | Until budget < 75% |
| Error budget > 90% consumed | Full freeze | Until budget < 75% |
| P0 incident active | Full freeze | Until incident resolved |
| 3+ P1 incidents in 24h | Partial freeze | 24 hours |

### 3.2 Freeze Scope

**Non-Critical Freeze** (blocks):
- New feature deployments
- Non-essential configuration changes
- Dependency updates (non-security)

**Non-Critical Freeze** (allows):
- Security patches
- P0/P1 bug fixes
- Observability improvements

**Full Freeze** (blocks):
- All deployments except:
  - Rollbacks
  - Critical security patches (CVE score > 9.0)
  - Direct incident remediation

### 3.3 Freeze Override Policy

**Override Authority**:
| Freeze Level | Override Authority | Audit Requirement |
|--------------|-------------------|-------------------|
| Non-critical | Engineering Manager | Slack approval screenshot |
| Full freeze | VP Engineering or CTO | Written justification + approval |
| Critical | CTO only | RCA required within 48h |

**Override Request Process**:
1. Submit override request in #release-approvals
2. Include: Justification, risk assessment, rollback plan
3. Obtain written approval from authorized party
4. Document in change log with approval reference

---

## 4. SLO Reporting

### 4.1 Reporting Cadence

| Report | Frequency | Audience | Owner |
|--------|-----------|----------|-------|
| Daily SLO snapshot | Daily | Engineering | On-call |
| Weekly SLO summary | Weekly | Engineering + Product | Hypercare Lead |
| Monthly SLO review | Monthly | Leadership | Engineering Manager |
| Quarterly SLO review | Quarterly | Executive | VP Engineering |

### 4.2 Report Contents

**Daily Snapshot**:
- Current availability (24h)
- Current error rate (24h)
- p95 latency (24h)
- Error budget remaining

**Weekly Summary**:
- 7-day SLO compliance
- Incident count by severity
- Budget consumption trend
- Top error categories

### 4.3 SLO Dashboard Metrics

```
Required Dashboard Panels:
1. Availability (%) - 30 day rolling
2. Error Rate (%) - 7 day rolling
3. p95 Latency (ms) - 7 day rolling
4. Error Budget Remaining (%) - 30 day
5. Incident Count by Severity - 7 day
6. Request Volume - 24h
```

---

## 5. SLO Review and Adjustment

### 5.1 Review Triggers

- Quarterly scheduled review
- After any P0 incident
- After 3+ consecutive weeks of SLO breach
- Major architecture change
- Significant traffic pattern change

### 5.2 Adjustment Process

1. **Proposal**: Document proposed change with justification
2. **Analysis**: Review historical data for impact
3. **Stakeholder Review**: Product, Engineering, Operations
4. **Approval**: VP Engineering sign-off required
5. **Communication**: Announce to all stakeholders
6. **Implementation**: Update dashboards, alerts, documentation

### 5.3 SLO Change Log

| Date | Change | Justification | Approved By |
|------|--------|---------------|-------------|
| Go-Live | Initial SLOs established | Baseline | Engineering Lead |

---

## 6. Implementation Checklist

### Monitoring Setup
- [ ] Configure availability metric collection
- [ ] Configure latency percentile calculation
- [ ] Configure error rate tracking
- [ ] Set up error budget dashboard
- [ ] Configure alerting thresholds

### Alert Configuration
| Alert | Threshold | Notification |
|-------|-----------|--------------|
| Availability drop | < 99% (1h window) | PagerDuty |
| Error rate spike | > 5% (5m window) | Slack + PagerDuty |
| p95 latency spike | > 1000ms (5m window) | Slack |
| Budget 75% consumed | 75% monthly | Slack + Email |
| Budget 90% consumed | 90% monthly | PagerDuty |

---

## 7. Definitions

| Term | Definition |
|------|------------|
| **SLO** | Service Level Objective - target reliability level |
| **SLI** | Service Level Indicator - metric used to measure SLO |
| **Error Budget** | Allowed unreliability before action required |
| **Availability** | Percentage of time service is operational |
| **Latency** | Time to process and respond to a request |
| **p95** | 95th percentile - 95% of requests faster than this |

---

## Appendix: Metric Collection Points

### Current Implementation
```typescript
// server/index.ts - Metrics logging
console.log(`[METRICS] requestId=${requestId} request_duration_ms=${duration} method=${method} path=${path} status=${status}`);
```

### Health Endpoints
```
GET /api/health/live   - Liveness (always 200 if process running)
GET /api/health/ready  - Readiness (200 if DB connected, 503 otherwise)
GET /api/health        - Combined health with details
```

### GAP: Production Metrics Aggregation
**NOTE**: Full SLO monitoring requires:
- Log aggregation service (e.g., DataDog, CloudWatch)
- Metrics dashboard (e.g., Grafana)
- Alerting integration (e.g., PagerDuty)

These should be configured during production deployment.
