# Incident Command Runbook

## Purpose
This runbook provides step-by-step procedures for managing production incidents for CutListCreator.

---

## 1. Incident Declaration

### When to Declare an Incident

| Condition | Severity | Action |
|-----------|----------|--------|
| Service completely unavailable | P0 | Declare immediately |
| Error rate > 5% sustained 5+ min | P0 | Declare immediately |
| Authentication broken | P0 | Declare immediately |
| Data integrity issue suspected | P0 | Declare immediately |
| Major feature broken, workaround exists | P1 | Declare within 15 min |
| Performance degraded (p95 > 2s) | P1 | Declare within 15 min |
| Minor feature issue | P2 | Log ticket, no incident |

### Declaration Command
```
Post to #incidents channel:

🚨 INCIDENT DECLARED 🚨
Severity: P0/P1
Title: [Brief description]
Impact: [User-facing impact]
Incident Commander: @[your-name]
Status: INVESTIGATING

Time: [timestamp]
```

---

## 2. Incident Roles

### Incident Commander (IC)
- **Responsibility**: Overall coordination, communication, decision-making
- **Actions**:
  - Assign roles
  - Coordinate investigation
  - Make rollback decisions
  - Communicate status updates
  - Declare incident resolved

### Technical Lead
- **Responsibility**: Technical investigation and remediation
- **Actions**:
  - Diagnose root cause
  - Implement fixes
  - Execute rollback if needed
  - Verify resolution

### Communications Lead
- **Responsibility**: Stakeholder communication
- **Actions**:
  - Update status page (if applicable)
  - Notify affected users
  - Keep leadership informed
  - Document timeline

---

## 3. Investigation Procedures

### Step 1: Assess Impact (First 5 minutes)

```bash
# Check service health
curl -s https://[production-url]/api/health | jq .

# Check liveness
curl -s https://[production-url]/api/health/live | jq .

# Check readiness
curl -s https://[production-url]/api/health/ready | jq .
```

**Questions to answer**:
- Is the service responding?
- Is the database connected?
- What is the current error rate?
- How many users are affected?

### Step 2: Check Recent Changes (5-10 minutes)

```bash
# Check recent deployments
# Via Render Dashboard: Deploys tab

# Check recent commits
git log --oneline -10

# Check for config changes
git diff HEAD~5 -- "*.env*" ".github/*" "server/*.ts"
```

### Step 3: Review Logs (10-15 minutes)

```bash
# Search for errors with requestId
# Via log aggregation service or Render logs

# Key patterns to search:
# [GLOBAL ERROR]
# [METRICS] ... status=5xx
# [SHUTDOWN]
# [STARTUP ERROR]
```

### Step 4: Check Dependencies

| Dependency | Check Method |
|------------|--------------|
| Database (Neon) | Health endpoint or Neon dashboard |
| Redis (if configured) | Connection test |
| External APIs | Manual test calls |

---

## 4. Common Incident Scenarios

### Scenario A: High Error Rate

**Symptoms**: Error rate > 5%, health endpoint shows degraded

**Investigation**:
```bash
# Check health
curl -s https://[production-url]/api/health | jq .

# Look for patterns in recent requests
# Check logs for common error messages
```

**Common Causes**:
1. Database connection issues
2. Bad deployment
3. External dependency failure
4. Traffic spike

**Remediation**:
1. If bad deployment → Rollback
2. If database → Check Neon status, connection pool
3. If external dependency → Enable fallback/circuit breaker
4. If traffic → Scale resources

### Scenario B: Service Unavailable

**Symptoms**: Health endpoints not responding, timeouts

**Investigation**:
```bash
# Check if service is running (Render dashboard)
# Check deployment status
# Check for recent restarts
```

**Common Causes**:
1. Deployment failure
2. Process crash
3. Resource exhaustion
4. Platform outage

**Remediation**:
1. Check Render status page
2. Trigger manual restart via dashboard
3. Rollback to last known good version
4. Scale resources if needed

### Scenario C: Database Issues

**Symptoms**: Readiness probe failing, slow queries, connection errors

**Investigation**:
```bash
# Check readiness specifically
curl -s https://[production-url]/api/health/ready | jq .

# Check Neon dashboard for:
# - Connection count
# - Query performance
# - Storage usage
```

**Remediation**:
1. Check Neon status page
2. Verify DATABASE_URL is correct
3. Check connection pool settings
4. Contact Neon support if platform issue

### Scenario D: Authentication Failures

**Symptoms**: Users cannot log in, 401 errors increasing

**Investigation**:
```bash
# Test auth endpoint
curl -X POST https://[production-url]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Check JWT_SECRET is configured
# Verify token format in logs
```

**Common Causes**:
1. JWT_SECRET misconfigured
2. Token expiration issues
3. Database user table issues

**Remediation**:
1. Verify environment variables
2. Check startup validation logs
3. Rollback if recent deployment

---

## 5. Rollback Procedure

### Pre-Rollback Checklist
- [ ] Confirm rollback will help (not making it worse)
- [ ] Identify rollback target (which deployment)
- [ ] Notify team in #incidents
- [ ] Have verification plan ready

### Execute Rollback

**Via Render Dashboard**:
1. Navigate to service → Deploys
2. Find last known good deployment
3. Click "Rollback to this deploy"
4. Monitor deployment progress

**Post-Rollback**:
```bash
# Verify service health
curl -s https://[production-url]/api/health | jq .

# Verify key functionality
curl -s https://[production-url]/api/health/ready | jq .

# Monitor error rate for 5 minutes
```

### Rollback Communication
```
Post to #incidents:

🔄 ROLLBACK EXECUTED
Target: Deploy [deploy-id] from [timestamp]
Reason: [brief reason]
Status: VERIFYING

Monitoring for next 5 minutes...
```

---

## 6. Resolution & Closure

### Resolution Checklist
- [ ] Root cause identified (or contained)
- [ ] Fix deployed and verified
- [ ] Error rate returned to normal
- [ ] All affected users can access service
- [ ] No new errors related to incident

### Closure Communication
```
Post to #incidents:

✅ INCIDENT RESOLVED
Duration: [X hours Y minutes]
Root Cause: [brief description]
Resolution: [what fixed it]
Follow-up: [RCA ticket link]

Impact Summary:
- Users affected: [number/percentage]
- Duration of impact: [time]
- Data loss: [none/description]
```

### Post-Incident Actions
1. Create RCA ticket (use RCA_TEMPLATE.md)
2. Schedule RCA meeting (within 48h for P0, 1 week for P1)
3. Update runbooks if new scenario discovered
4. Review and update alerts if missed detection

---

## 7. Communication Templates

### Status Update Template (Every 30 min for P0)
```
📊 INCIDENT UPDATE - [timestamp]
Severity: P0/P1
Status: INVESTIGATING / IDENTIFIED / FIXING / MONITORING
Impact: [current user impact]
ETA: [estimated resolution time or "investigating"]
Next update: [time]
```

### Executive Escalation Template
```
🔴 EXECUTIVE ESCALATION
Incident: [title]
Severity: P0
Duration so far: [time]
Impact: [user-facing impact]
Current status: [what's being done]
Need: [specific ask if any]
```

---

## 8. Quick Reference

### Key URLs
```
Production: https://[production-url]
Health: https://[production-url]/api/health
Render Dashboard: https://dashboard.render.com
Neon Dashboard: https://console.neon.tech
```

### Key Contacts
| Role | Contact |
|------|---------|
| On-Call | Check PagerDuty schedule |
| Engineering Manager | @[name] |
| Security Lead | @[name] |
| Product Owner | @[name] |

### Severity Response Times
| Severity | Acknowledge | Update Frequency | Resolution Target |
|----------|-------------|------------------|-------------------|
| P0 | 15 min | 30 min | 4 hours |
| P1 | 30 min | 1 hour | 8 hours |
| P2 | 4 hours | Daily | 24 hours |

---

## Appendix: Incident Log Template

```markdown
# Incident: [TITLE]

## Summary
- **Severity**: P0/P1/P2
- **Duration**: [start] - [end]
- **Impact**: [description]

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Incident detected |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Root Cause
[Description]

## Resolution
[What fixed it]

## Action Items
- [ ] [Action 1] - Owner: @name - Due: date
- [ ] [Action 2] - Owner: @name - Due: date
```
