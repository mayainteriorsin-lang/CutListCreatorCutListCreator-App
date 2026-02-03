# Reliability Automation Plan

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define automated operational checks and repeatable reliability review workflows for sustainable operations.

---

## 2. Automated Health Checks

### 2.1 Implemented Checks

| Check | Endpoint | Frequency | Alert Condition |
|-------|----------|-----------|-----------------|
| Liveness | `/api/health/live` | 30s | No response for 2 cycles |
| Readiness | `/api/health/ready` | 30s | 503 for 3 cycles |
| Combined Health | `/api/health` | 60s | Degraded status |

**Implementation Location**: [server/routes.ts](../../server/routes.ts) lines 50-120

### 2.2 Health Check Responses

```typescript
// Liveness - Is the process alive?
GET /api/health/live
{
  "status": "alive",
  "timestamp": "2026-02-03T...",
  "uptime": 12345.67
}

// Readiness - Can the service handle traffic?
GET /api/health/ready
{
  "status": "ready" | "not_ready",
  "timestamp": "2026-02-03T...",
  "checks": {
    "database": "connected" | "disconnected"
  }
}
```

### 2.3 GAP: External Health Monitoring

**Status**: GAP - requires external monitoring service

**Recommended Implementation**:
```bash
# Example: External health check script (to be deployed externally)
#!/bin/bash
HEALTH_URL="https://[production-url]/api/health"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json $HEALTH_URL)

if [ "$RESPONSE" != "200" ]; then
  # Send alert via PagerDuty/Slack/etc.
  echo "ALERT: Health check failed with status $RESPONSE"
fi
```

---

## 3. SLO Drift Detection

### 3.1 SLO Thresholds

| SLO | Target | Warning | Critical |
|-----|--------|---------|----------|
| Availability | 99.5% | <99.7% | <99.5% |
| p95 Latency | 500ms | >400ms | >500ms |
| Error Rate | <1% | >0.5% | >1% |

### 3.2 Drift Detection Logic

**Current Implementation**: Structured logging with `[METRICS]` prefix

```typescript
// server/middleware/requestId.ts - metrics logging
[METRICS] requestId=xxx request_duration_ms=xxx method=xxx path=xxx status=xxx
```

**GAP: Automated Aggregation**

Requires log aggregation service to:
1. Collect metrics logs
2. Calculate percentiles (p50, p95, p99)
3. Compare against thresholds
4. Trigger alerts on drift

### 3.3 Recommended Automation Script

```typescript
// scripts/slo-check.ts (example - not yet implemented)
interface SLOMetrics {
  availability: number;    // percentage
  p95Latency: number;      // milliseconds
  errorRate: number;       // percentage
}

function checkSLODrift(metrics: SLOMetrics): string[] {
  const alerts: string[] = [];

  if (metrics.availability < 99.5) {
    alerts.push(`CRITICAL: Availability ${metrics.availability}% below 99.5% SLO`);
  } else if (metrics.availability < 99.7) {
    alerts.push(`WARNING: Availability ${metrics.availability}% approaching SLO`);
  }

  if (metrics.p95Latency > 500) {
    alerts.push(`CRITICAL: p95 latency ${metrics.p95Latency}ms exceeds 500ms SLO`);
  } else if (metrics.p95Latency > 400) {
    alerts.push(`WARNING: p95 latency ${metrics.p95Latency}ms approaching SLO`);
  }

  if (metrics.errorRate > 1) {
    alerts.push(`CRITICAL: Error rate ${metrics.errorRate}% exceeds 1% SLO`);
  } else if (metrics.errorRate > 0.5) {
    alerts.push(`WARNING: Error rate ${metrics.errorRate}% approaching SLO`);
  }

  return alerts;
}
```

---

## 4. Error Spike Detection

### 4.1 Current Implementation

Error logging includes requestId for correlation:
```typescript
// Global error handler in server/index.ts
{
  "error": "...",
  "requestId": "uuid",
  "timestamp": "..."
}
```

### 4.2 GAP: Automated Spike Detection

**Required**: Log aggregation with anomaly detection

**Detection Rules**:
| Rule | Condition | Action |
|------|-----------|--------|
| Error spike | 5xx rate > 5% for 5 min | P0 alert |
| Error trend | 5xx rate increasing 3 consecutive checks | P1 alert |
| New error type | New error message pattern | P2 investigation |

---

## 5. Weekly Reliability Review Workflow

### 5.1 Schedule

**Day**: Monday
**Time**: 10:00 AM (30 minutes)
**Participants**: On-call engineer, Engineering Lead

### 5.2 Pre-Meeting Checklist

```markdown
## Weekly Reliability Review Prep

### Data Collection (Friday before)
- [ ] Export SLO metrics for the week
- [ ] List all incidents (P0/P1/P2)
- [ ] Calculate error budget consumption
- [ ] Note any alert noise issues
- [ ] Review on-call handoff notes

### Artifacts to Prepare
- [ ] SLO dashboard screenshot (or metrics summary)
- [ ] Incident summary (if any)
- [ ] Error budget burn-down
- [ ] Top 5 slowest endpoints
- [ ] Top 5 error-prone endpoints
```

### 5.3 Review Agenda Template

```markdown
# Weekly Reliability Review - [DATE]

## 1. SLO Status (5 min)
| SLO | Target | Actual | Status |
|-----|--------|--------|--------|
| Availability | 99.5% | ___% | 🟢/🟡/🔴 |
| p95 Latency | 500ms | ___ms | 🟢/🟡/🔴 |
| Error Rate | <1% | ___% | 🟢/🟡/🔴 |

## 2. Error Budget (5 min)
- Monthly budget: 3.6 hours
- Consumed this month: ___ hours
- Remaining: ___ hours (___%)
- Burn rate: [Normal/Elevated/Critical]

## 3. Incidents (5 min)
| Incident | Severity | Duration | RCA Status |
|----------|----------|----------|------------|
| (none or list) | | | |

## 4. Alert Noise (5 min)
- False positives this week: ___
- Alerts to tune: ___
- New alerts needed: ___

## 5. Action Items (10 min)
| Action | Owner | Due |
|--------|-------|-----|
| | | |

## Next Review: [DATE]
```

### 5.4 Post-Meeting Actions

1. Share summary in #engineering channel
2. Update risk register if needed
3. Create tickets for action items
4. Archive review document

---

## 6. Monthly Reliability Deep-Dive

### 6.1 Schedule

**Day**: First Wednesday of month
**Time**: 2:00 PM (1 hour)
**Participants**: Engineering team, Product owner

### 6.2 Agenda Template

```markdown
# Monthly Reliability Deep-Dive - [MONTH YEAR]

## 1. Monthly SLO Trend (10 min)
[Chart showing weekly SLO metrics over the month]

### Trend Analysis
- Availability trend: [Stable/Improving/Declining]
- Latency trend: [Stable/Improving/Declining]
- Error rate trend: [Stable/Improving/Declining]

## 2. Incident Summary (10 min)
| Incident | Date | Duration | Impact | RCA Complete |
|----------|------|----------|--------|--------------|
| | | | | |

### Key Learnings
- [Learning 1]
- [Learning 2]

## 3. Error Budget Review (10 min)
- Budget for month: 3.6 hours
- Total consumed: ___ hours
- Remaining: ___ hours
- Release freeze triggered: [Yes/No]

## 4. Reliability Backlog (15 min)
| Item | Priority | Effort | Status |
|------|----------|--------|--------|
| | | | |

### Prioritization Discussion
[Notes]

## 5. Capacity Review (10 min)
- Current utilization: CPU ___%, Memory ___%, DB ___
- Scaling events: ___
- Capacity concerns: ___

## 6. Next Month Focus (5 min)
1. [Focus area 1]
2. [Focus area 2]
3. [Focus area 3]
```

---

## 7. Automation Roadmap

### 7.1 Current State

| Capability | Status | Location |
|------------|--------|----------|
| Health endpoints | ✅ Implemented | server/routes.ts |
| Request correlation | ✅ Implemented | server/middleware/requestId.ts |
| Structured logging | ✅ Implemented | server/index.ts |
| Graceful shutdown | ✅ Implemented | server/lib/gracefulShutdown.ts |
| Startup validation | ✅ Implemented | server/lib/startupValidation.ts |

### 7.2 GAP Items

| Capability | Priority | Effort | Target |
|------------|----------|--------|--------|
| External health monitoring | P1 | Low | Month 1 |
| Log aggregation service | P1 | Medium | Month 1 |
| Automated SLO dashboard | P1 | Medium | Month 2 |
| Alert management system | P1 | Medium | Month 2 |
| Anomaly detection | P2 | High | Month 3 |

---

## 8. Appendix: Quick Reference

### Health Check URLs
```bash
# Production (replace with actual URL)
curl https://[production-url]/api/health
curl https://[production-url]/api/health/live
curl https://[production-url]/api/health/ready
```

### Log Search Patterns
```bash
# Error logs
grep "\[GLOBAL ERROR\]" logs/

# Metrics logs
grep "\[METRICS\]" logs/

# Slow requests (>1000ms)
grep "request_duration_ms=[0-9]\{4,\}" logs/

# 5xx errors
grep "status=5" logs/ | grep "\[METRICS\]"
```
