# Post-Release Validation Checklist

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define the post-release validation procedure to verify successful deployment and detect issues early.

---

## 2. Validation Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                POST-RELEASE VALIDATION TIMELINE              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  T+0          T+5min       T+15min      T+1hr      T+24hr  │
│  ────         ──────       ───────      ─────      ──────  │
│  Deploy       Smoke        Validation   Deep       Full    │
│  Complete     Test         Complete     Check      Clear   │
│                                                             │
│  • Health     • Auth       • Metrics    • Trends   • Close │
│  • Ready      • CRUD       • Errors     • Alerts   • Notes │
│  • Live       • Critical   • Latency    • Users    • Done  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Immediate Validation (T+0 to T+5min)

### 3.1 Health Check Validation

```markdown
## Immediate Health Checks

### Endpoint Verification
- [ ] Liveness probe returns 200
  ```bash
  curl -s https://[production-url]/api/health/live
  # Expected: {"status":"alive",...}
  ```

- [ ] Readiness probe returns 200
  ```bash
  curl -s https://[production-url]/api/health/ready
  # Expected: {"status":"ready","checks":{"database":"connected"}}
  ```

- [ ] Combined health shows healthy
  ```bash
  curl -s https://[production-url]/api/health
  # Expected: {"status":"healthy",...}
  ```

### Infrastructure Check
- [ ] Deployment shows as successful in Render dashboard
- [ ] No restart loops detected
- [ ] Memory usage within normal range
- [ ] CPU usage within normal range
```

### 3.2 Immediate Validation Commands

```bash
#!/bin/bash
# post-release-immediate.sh

PROD_URL="https://[production-url]"

echo "=== Immediate Post-Release Validation ==="
echo ""

echo "1. Liveness Check:"
curl -s -w "\nHTTP: %{http_code}\n" "$PROD_URL/api/health/live" | head -5

echo ""
echo "2. Readiness Check:"
curl -s -w "\nHTTP: %{http_code}\n" "$PROD_URL/api/health/ready" | head -5

echo ""
echo "3. Health Check:"
curl -s -w "\nHTTP: %{http_code}\n" "$PROD_URL/api/health" | head -5

echo ""
echo "=== Validation Complete ==="
```

---

## 4. Smoke Test Validation (T+5min)

### 4.1 Critical Path Testing

```markdown
## Smoke Test Checklist

### Authentication Flow
- [ ] Login page loads
- [ ] Valid credentials → successful login
- [ ] Invalid credentials → appropriate error
- [ ] Token refresh works (if testable)
- [ ] Logout works

### Core Functionality
- [ ] Main application page loads after login
- [ ] Primary navigation works
- [ ] Data displays correctly
- [ ] Basic CRUD operations work:
  - [ ] Create: Can create new record
  - [ ] Read: Can view existing records
  - [ ] Update: Can modify a record
  - [ ] Delete: Can delete a record (if applicable)

### Release-Specific Features
- [ ] [Feature 1 from release] works as expected
- [ ] [Feature 2 from release] works as expected
- [ ] [Bug fix from release] verified

### Error Handling
- [ ] Invalid input shows appropriate error
- [ ] 404 page displays for invalid routes
- [ ] Error messages are user-friendly
```

### 4.2 Smoke Test Script Template

```typescript
// Example smoke test checklist (manual execution)
const smokeTests = [
  { name: "Health endpoint", url: "/api/health", expected: 200 },
  { name: "Auth endpoint", url: "/api/auth/login", method: "POST", expected: [200, 401] },
  { name: "Protected endpoint (unauth)", url: "/api/leads", expected: 401 },
];

// Run each test and record pass/fail
```

---

## 5. Validation Complete (T+15min)

### 5.1 Metrics Validation

```markdown
## Metrics Validation Checklist

### Error Rates
- [ ] 5xx error rate: __% (threshold: <1%)
- [ ] 4xx error rate: __% (threshold: <10%)
- [ ] No new error patterns in logs

### Latency
- [ ] p50 latency: __ms (threshold: <200ms)
- [ ] p95 latency: __ms (threshold: <500ms)
- [ ] No latency spikes detected

### Throughput
- [ ] Request rate: __ rps (compare to baseline)
- [ ] No request queueing
- [ ] Database connections: __ (threshold: <40)

### Comparison to Pre-Release
| Metric | Pre-Release | Post-Release | Status |
|--------|-------------|--------------|--------|
| Error rate | | | |
| p95 latency | | | |
| Request rate | | | |
```

### 5.2 Log Review

```markdown
## Log Review Checklist

### Error Logs
- [ ] Search for `[GLOBAL ERROR]` - Count: __
- [ ] Search for `status=5` - Count: __
- [ ] No unexpected error patterns

### Warning Signs
- [ ] No startup errors after deploy
- [ ] No database connection errors
- [ ] No authentication failures (beyond normal)
- [ ] No memory warnings

### Sample Log Check Commands
```bash
# Check for errors (via log aggregation or Render logs)
grep "[GLOBAL ERROR]" logs/ | wc -l
grep "status=5" logs/ | wc -l
grep "FATAL\|CRITICAL" logs/
```
```

---

## 6. Deep Check (T+1hr)

### 6.1 Extended Validation

```markdown
## One-Hour Deep Check

### Trend Analysis
- [ ] Error rate trend: [Stable/Increasing/Decreasing]
- [ ] Latency trend: [Stable/Increasing/Decreasing]
- [ ] Request rate trend: [Stable/Increasing/Decreasing]

### Resource Utilization
- [ ] Memory trend: [Stable/Increasing]
- [ ] CPU trend: [Stable/Spiking]
- [ ] No memory leaks suspected

### User Impact
- [ ] No user complaints received
- [ ] Support tickets: __ (compare to normal)
- [ ] No social media mentions of issues

### Alerts
- [ ] No new alerts triggered
- [ ] All existing alerts in normal state
```

### 6.2 Issue Detection Criteria

| Signal | Action |
|--------|--------|
| Error rate > 5% for 5 min | Investigate immediately |
| Error rate > 1% sustained | Monitor closely |
| p95 latency > 1s | Investigate |
| Memory growing continuously | Monitor for leak |
| User complaints | Investigate immediately |

---

## 7. Full Clear (T+24hr)

### 7.1 Next-Day Validation

```markdown
## 24-Hour Validation Checklist

### Overnight Metrics
- [ ] No error spikes overnight
- [ ] Latency remained stable
- [ ] No service restarts
- [ ] No alerts triggered

### User Feedback
- [ ] Review support channels
- [ ] Check user feedback
- [ ] No regression reports

### Release Closure
- [ ] Mark release as stable
- [ ] Close release ticket
- [ ] Archive release notes
- [ ] Update deployment log
```

### 7.2 Release Sign-Off

```markdown
## Release Validation Sign-Off

**Release**: v[X.Y.Z]
**Deploy Time**: [TIMESTAMP]
**Sign-Off Time**: [TIMESTAMP]

### Validation Summary
| Phase | Status | Notes |
|-------|--------|-------|
| Immediate (T+0) | ✅/❌ | |
| Smoke Test (T+5m) | ✅/❌ | |
| Metrics (T+15m) | ✅/❌ | |
| Deep Check (T+1hr) | ✅/❌ | |
| Full Clear (T+24hr) | ✅/❌ | |

### Issues Detected
- [None / List issues]

### Sign-Off
- Release Owner: __________ Date: __________
- On-Call: __________ Date: __________
```

---

## 8. Validation Failure Procedures

### 8.1 Issue Severity Assessment

| Severity | Criteria | Action |
|----------|----------|--------|
| Critical | Service down, data loss | Immediate rollback |
| High | Major feature broken | Evaluate rollback vs hotfix |
| Medium | Degraded functionality | Monitor, plan fix |
| Low | Minor issue, workaround exists | Log ticket |

### 8.2 Escalation Matrix

| Condition | Escalate To | Timeline |
|-----------|-------------|----------|
| Health check failing | On-call engineer | Immediate |
| Error rate > 5% | Engineering Lead | 5 minutes |
| Rollback needed | Engineering Lead + CTO | Before rollback |
| Customer impact | Support Lead | Immediate |

### 8.3 Rollback Decision Tree

```
Is the service completely down?
├── Yes → ROLLBACK IMMEDIATELY
└── No → Is error rate > 5%?
    ├── Yes → Is it increasing?
    │   ├── Yes → ROLLBACK
    │   └── No → Monitor 10 min, then decide
    └── No → Is major feature broken?
        ├── Yes → Can it be hotfixed in <30 min?
        │   ├── Yes → HOTFIX
        │   └── No → ROLLBACK
        └── No → Continue monitoring
```

---

## 9. Automated Validation (Future)

### 9.1 GAP: Automated Post-Deploy Validation

**Status**: GAP - manual validation currently

**Recommended Implementation**:
```yaml
# Example GitHub Action for post-deploy validation
name: Post-Deploy Validation
on:
  deployment_status:
    types: [success]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Health Check
        run: |
          curl -f https://[production-url]/api/health/ready
      - name: Smoke Tests
        run: |
          npm run test:smoke
      - name: Notify on Failure
        if: failure()
        run: |
          # Send alert to Slack/PagerDuty
```

---

## 10. Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│            POST-RELEASE VALIDATION QUICK REF             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  IMMEDIATE (T+0):                                       │
│  curl /api/health/live   → 200                         │
│  curl /api/health/ready  → 200                         │
│                                                         │
│  SMOKE (T+5min):                                        │
│  □ Login works                                          │
│  □ Main page loads                                      │
│  □ CRUD works                                           │
│                                                         │
│  METRICS (T+15min):                                     │
│  □ Error rate < 1%                                      │
│  □ p95 < 500ms                                          │
│  □ No new error patterns                                │
│                                                         │
│  DEEP CHECK (T+1hr):                                    │
│  □ Trends stable                                        │
│  □ No user complaints                                   │
│  □ No alerts                                            │
│                                                         │
│  FULL CLEAR (T+24hr):                                   │
│  □ Overnight stable                                     │
│  □ Close release ticket                                 │
│                                                         │
│  ROLLBACK IF:                                           │
│  • Service down                                         │
│  • Error rate > 5% and increasing                       │
│  • Major feature broken, no quick fix                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
