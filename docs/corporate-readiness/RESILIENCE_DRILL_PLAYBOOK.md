# Resilience Drill Playbook

## Purpose
Monthly procedures for testing system resilience through controlled failure scenarios.

---

## 1. Drill Schedule

### Monthly Drill Calendar

| Month | Drill Type | Duration | Participants |
|-------|-----------|----------|--------------|
| Jan, Apr, Jul, Oct | Database Failover | 2 hours | DevOps, Backend |
| Feb, May, Aug, Nov | Service Restart | 1 hour | DevOps |
| Mar, Jun, Sep, Dec | Dependency Outage | 2 hours | Full Team |

### Drill Windows
- **Preferred**: Tuesday or Wednesday, 10:00-12:00 local time
- **Avoid**: Monday mornings, Friday afternoons, end of month
- **Notice**: 48-hour advance notice to team

---

## 2. Pre-Drill Checklist

```markdown
## Drill Preparation (24 hours before)

### Communication
- [ ] Notify team via #engineering channel
- [ ] Confirm drill participants available
- [ ] Prepare rollback procedures
- [ ] Alert support team of planned drill

### Environment
- [ ] Verify staging environment matches production
- [ ] Confirm monitoring dashboards accessible
- [ ] Prepare log aggregation queries
- [ ] Have production access ready (if needed)

### Documentation
- [ ] Print/bookmark relevant runbooks
- [ ] Prepare incident timeline template
- [ ] Have escalation contacts ready
- [ ] Prepare drill report template

### Safety
- [ ] Confirm rollback capability
- [ ] Identify abort criteria
- [ ] Set maximum drill duration
- [ ] Have production freeze plan ready
```

---

## 3. Drill Type: Database Failover

### Objective
Verify application handles database unavailability gracefully and recovers when database returns.

### Scenario
Simulate Neon database becoming unavailable for 5-10 minutes.

### Procedure

```markdown
## Database Failover Drill

### Phase 1: Preparation (15 min)
- [ ] Announce drill starting in #incidents
- [ ] Open monitoring dashboards
- [ ] Prepare to capture metrics
- [ ] Verify baseline health endpoint responses

### Phase 2: Induce Failure (5 min)
**Method**: Temporarily modify DATABASE_URL to invalid value

Option A (Staging only):
- [ ] Update DATABASE_URL in Render dashboard
- [ ] Trigger redeployment
- [ ] Start timer

Option B (Connection simulation):
- [ ] Block database port via network policy (if available)
- [ ] Start timer

### Phase 3: Observe Behavior (10 min)
- [ ] Check readiness probe: `curl /api/health/ready`
  - Expected: 503, status: "not_ready"
- [ ] Check liveness probe: `curl /api/health/live`
  - Expected: 200, status: "alive"
- [ ] Attempt authenticated API call
  - Expected: Appropriate error response with requestId
- [ ] Monitor error rates in logs
- [ ] Verify no process crashes

### Phase 4: Recovery (10 min)
- [ ] Restore valid DATABASE_URL
- [ ] Trigger redeployment (if changed)
- [ ] Wait for readiness probe to return 200
- [ ] Verify authenticated API calls succeed
- [ ] Confirm error rates return to baseline

### Phase 5: Debrief (20 min)
- [ ] Document actual vs expected behavior
- [ ] Note any unexpected failures
- [ ] Identify improvement opportunities
- [ ] Complete drill report
```

### Success Criteria
| Criteria | Expected | Pass/Fail |
|----------|----------|-----------|
| Liveness probe during outage | 200 OK | |
| Readiness probe during outage | 503 | |
| API returns structured error | Yes, with requestId | |
| No process crashes | 0 crashes | |
| Recovery time after DB restore | < 30 seconds | |

---

## 4. Drill Type: Service Restart

### Objective
Verify graceful shutdown and startup procedures work correctly.

### Scenario
Simulate rolling restart of application instances.

### Procedure

```markdown
## Service Restart Drill

### Phase 1: Preparation (10 min)
- [ ] Announce drill starting
- [ ] Open monitoring dashboards
- [ ] Note current uptime from /api/health/live
- [ ] Capture current request patterns

### Phase 2: Trigger Restart (5 min)
**Method**: Use platform restart capability

Via Render Dashboard:
- [ ] Navigate to Service > Manual Deploy
- [ ] Or use "Restart" option if available
- [ ] Start timer

### Phase 3: Observe Shutdown (5 min)
- [ ] Watch logs for shutdown sequence:
  - "[SHUTDOWN] Received signal"
  - "[SHUTDOWN] Closing HTTP server"
  - "[SHUTDOWN] Database pool closed"
  - "[SHUTDOWN] Complete"
- [ ] Verify no in-flight request errors
- [ ] Note shutdown duration

### Phase 4: Observe Startup (5 min)
- [ ] Watch logs for startup sequence:
  - "[STARTUP] Beginning startup validation"
  - "[STARTUP] Configuration valid"
  - "Server running on port..."
- [ ] Check health endpoints become available
- [ ] Verify readiness probe returns 200

### Phase 5: Verify Function (10 min)
- [ ] Test authentication flow
- [ ] Test a CRUD operation
- [ ] Verify no data loss
- [ ] Check for any error spikes

### Phase 6: Debrief (15 min)
- [ ] Document restart duration
- [ ] Note any issues
- [ ] Complete drill report
```

### Success Criteria
| Criteria | Expected | Pass/Fail |
|----------|----------|-----------|
| Graceful shutdown logged | Yes | |
| Shutdown duration | < 30 seconds | |
| Startup validation passed | Yes | |
| Time to ready | < 60 seconds | |
| No request failures during restart | 0 failures | |

---

## 5. Drill Type: Dependency Outage

### Objective
Verify application handles external dependency failures gracefully.

### Scenario
Simulate failure of external services (future: Redis, external APIs).

### Procedure

```markdown
## Dependency Outage Drill

### Phase 1: Preparation (15 min)
- [ ] Identify dependency to test
- [ ] Document expected degradation behavior
- [ ] Prepare fallback verification
- [ ] Announce drill starting

### Phase 2: Induce Outage (5 min)
**Method**: Block/disable dependency access

For Redis (when implemented):
- [ ] Disable Redis connection
- [ ] Or point to non-existent Redis

For External API:
- [ ] Block outbound requests to API
- [ ] Or configure mock failure responses

### Phase 3: Observe Degradation (15 min)
- [ ] Verify core functionality continues
- [ ] Check health endpoint status
- [ ] Document degraded features
- [ ] Monitor error handling

Expected Behaviors:
- [ ] Cache miss falls back to database
- [ ] Circuit breakers activate (if implemented)
- [ ] Appropriate error messages returned
- [ ] No cascading failures

### Phase 4: Recovery (10 min)
- [ ] Restore dependency access
- [ ] Verify automatic reconnection
- [ ] Confirm all features restored
- [ ] Check error rates normalize

### Phase 5: Debrief (20 min)
- [ ] Document degradation behavior
- [ ] Identify missing fallbacks
- [ ] Plan improvements
- [ ] Complete drill report
```

### Success Criteria
| Criteria | Expected | Pass/Fail |
|----------|----------|-----------|
| Core auth continues working | Yes | |
| Health shows degraded | Yes | |
| No process crashes | 0 | |
| Auto-recovery on restore | Yes | |
| User-facing errors handled | Yes | |

---

## 6. Drill Report Template

```markdown
# Resilience Drill Report

## Drill Information
- **Date**: YYYY-MM-DD
- **Type**: [Database Failover / Service Restart / Dependency Outage]
- **Environment**: [Staging / Production]
- **Duration**: XX minutes
- **Participants**: @name1, @name2

## Summary
[Brief description of drill and overall result]

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Drill started |
| HH:MM | Failure induced |
| HH:MM | Degradation observed |
| HH:MM | Recovery initiated |
| HH:MM | Full recovery confirmed |
| HH:MM | Drill ended |

## Results

### Success Criteria
| Criteria | Expected | Actual | Pass/Fail |
|----------|----------|--------|-----------|
| [Criteria 1] | [Expected] | [Actual] | |
| [Criteria 2] | [Expected] | [Actual] | |

### Unexpected Findings
1. [Finding 1]
2. [Finding 2]

### Metrics During Drill
- Error rate: X%
- Latency p95: Xms
- Failed requests: X

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action 1] | @name | YYYY-MM-DD |
| [Action 2] | @name | YYYY-MM-DD |

## Approvals
- Drill Lead: @name
- Engineering Lead: @name
```

---

## 7. Abort Criteria

### Immediate Abort Triggers
- Production user impact detected (if running on production)
- Data corruption suspected
- Unable to recover from induced failure
- Security incident detected
- Drill exceeds maximum duration (2x planned)

### Abort Procedure
```markdown
1. Announce "DRILL ABORT" in #incidents
2. Immediately begin recovery procedure
3. Restore all modified configurations
4. Verify system health
5. Document reason for abort
6. Schedule follow-up investigation
```

---

## 8. Drill History Log

| Date | Type | Environment | Result | Report Link |
|------|------|-------------|--------|-------------|
| | | | | |

---

## Appendix: Quick Reference

### Health Endpoint URLs
```bash
# Liveness (is process alive?)
curl -s https://[url]/api/health/live | jq .

# Readiness (can serve traffic?)
curl -s https://[url]/api/health/ready | jq .

# Combined health
curl -s https://[url]/api/health | jq .
```

### Log Patterns to Watch
```
[SHUTDOWN] - Graceful shutdown sequence
[STARTUP] - Startup validation
[GLOBAL ERROR] - Unhandled errors
[METRICS] - Request metrics
status=5xx - Server errors
```

### Key Contacts During Drills
| Role | Contact |
|------|---------|
| Drill Lead | @[name] |
| On-Call Engineer | Check schedule |
| Database Expert | @[name] |
