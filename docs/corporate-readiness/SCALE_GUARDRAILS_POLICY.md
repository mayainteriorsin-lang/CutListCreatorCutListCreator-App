# Scale Guardrails Policy

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define capacity triggers, throttling policies, backpressure handling, and high-load incident protocols for enterprise scale operations.

---

## 2. Current Scale Controls

### 2.1 Implemented Controls

| Control | Status | Evidence |
|---------|--------|----------|
| Global API rate limiting | ✅ IMPLEMENTED | `server/index.ts` |
| Health probes | ✅ IMPLEMENTED | `server/routes.ts` |
| Graceful shutdown | ✅ IMPLEMENTED | `server/lib/gracefulShutdown.ts` |
| Request correlation | ✅ IMPLEMENTED | `server/middleware/requestId.ts` |
| Structured logging | ✅ IMPLEMENTED | `server/index.ts` |

### 2.2 Current Rate Limit Configuration

```typescript
// server/index.ts - current configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);
```

**Effective Limit**: ~67 requests/minute per IP globally

---

## 3. Capacity Triggers

### 3.1 Resource Utilization Triggers

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | 70% for 10 min | 85% for 5 min | Scale review / Scale up |
| Memory | 75% for 10 min | 90% for 5 min | Scale review / Scale up |
| DB Connections | 80% pool | 95% pool | Connection review |
| Storage | 75% capacity | 90% capacity | Storage expansion |

### 3.2 Performance Triggers

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| p95 Latency | >500ms for 10 min | >1s for 5 min | Performance investigation |
| Error Rate | >1% for 10 min | >5% for 5 min | Incident declaration |
| Request Queue | >100 pending | >500 pending | Backpressure activation |

### 3.3 Capacity Triggers

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Requests/sec | 80 rps | 100 rps | Scale planning |
| Concurrent users | 80% estimate | 95% estimate | Scale up |
| Active tenants | 80% planned | 95% planned | Capacity review |

---

## 4. Throttling Policy

### 4.1 Throttling Tiers

| Tier | Scope | Current Status |
|------|-------|----------------|
| Global | All requests | ✅ 1000/15min per IP |
| Per-tenant | Tenant's requests | 🔴 NOT IMPLEMENTED |
| Per-endpoint | Specific endpoints | 🔴 NOT IMPLEMENTED |
| Per-user | Individual user | 🔴 NOT IMPLEMENTED |

### 4.2 Proposed Rate Limits by Plan

| Plan | Requests/15min | Concurrent | Burst |
|------|----------------|------------|-------|
| Free | 500 | 10 | 20 |
| Starter | 2,000 | 25 | 50 |
| Professional | 10,000 | 100 | 200 |
| Enterprise | Custom | Custom | Custom |

### 4.3 Rate Limit Response

```json
// HTTP 429 Response
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after the window resets.",
  "retryAfter": 300,
  "limit": 1000,
  "remaining": 0,
  "resetAt": "2026-02-03T12:15:00Z"
}
```

### 4.4 Rate Limit Headers

| Header | Description | Status |
|--------|-------------|--------|
| X-RateLimit-Limit | Total allowed | ✅ Implemented |
| X-RateLimit-Remaining | Remaining | ✅ Implemented |
| X-RateLimit-Reset | Reset timestamp | ✅ Implemented |
| Retry-After | Seconds to wait | ✅ Implemented |

---

## 5. Backpressure Policy

### 5.1 Current State: NOT IMPLEMENTED

| Mechanism | Status | Notes |
|-----------|--------|-------|
| Request queuing | 🔴 NOT IMPLEMENTED | Direct processing only |
| Circuit breakers | 🔴 NOT IMPLEMENTED | No dependency protection |
| Load shedding | 🔴 NOT IMPLEMENTED | All requests accepted |
| Graceful degradation | 🔴 NOT IMPLEMENTED | Full or nothing |

### 5.2 Proposed Backpressure Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Request Flow                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Incoming ──▶ Rate ──▶ Queue ──▶ Circuit ──▶ Process   │
│  Request      Limit    Check     Breaker     Request   │
│                │         │          │                   │
│                ▼         ▼          ▼                   │
│              429       503        503                   │
│            (Too Many) (Overload) (Dependency)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Circuit Breaker Configuration (Proposed)

| Dependency | Failure Threshold | Recovery Time | Fallback |
|------------|-------------------|---------------|----------|
| Database | 5 failures in 10s | 30s | 503 error |
| External API | 3 failures in 10s | 60s | Cached/503 |
| File storage | 3 failures in 10s | 30s | 503 error |

---

## 6. High-Load Incident Protocol

### 6.1 Load Levels

| Level | Indicators | Response |
|-------|------------|----------|
| **Normal** | <70% capacity, <200ms p95 | Monitor |
| **Elevated** | 70-85% capacity, 200-500ms p95 | Increased monitoring |
| **High** | 85-95% capacity, 500ms-1s p95 | Active management |
| **Critical** | >95% capacity, >1s p95 | Emergency response |

### 6.2 High-Load Response Procedure

```markdown
## High-Load Incident Response

### Detection (Automated)
- Alert triggers at WARNING or CRITICAL threshold
- On-call notified via PagerDuty (GAP - not configured)

### Assessment (5 minutes)
1. Check current metrics:
   - CPU/Memory utilization
   - Request rate and latency
   - Error rates
   - Database connections
2. Identify cause:
   - Traffic spike
   - Resource leak
   - External dependency
   - Attack

### Mitigation (Based on cause)

#### Traffic Spike
1. Enable aggressive rate limiting
2. Scale up infrastructure (if available)
3. Enable request queuing (if implemented)
4. Consider load shedding

#### Resource Leak
1. Identify leaking component
2. Restart affected service
3. Root cause investigation

#### External Dependency
1. Activate circuit breaker (if implemented)
2. Enable cached responses (if available)
3. Disable non-critical features

#### Attack (DDoS)
1. Enable WAF rules (if available)
2. Implement IP blocking
3. Contact platform support
4. Consider CDN acceleration

### Recovery
1. Monitor metrics return to normal
2. Gradually restore normal limits
3. Document incident
4. Schedule post-mortem
```

### 6.3 Emergency Scaling Procedure

```markdown
## Emergency Scale-Up Procedure

### Render Manual Scale
1. Log into Render dashboard
2. Navigate to service
3. Settings > Instance Type
4. Upgrade to larger instance
5. Monitor deployment
6. Verify health endpoints

### Render Horizontal Scale (if available)
1. Log into Render dashboard
2. Navigate to service
3. Settings > Instances
4. Increase instance count
5. Monitor deployment
6. Verify load distribution

### Database Scale
1. Log into Neon console
2. Navigate to project settings
3. Increase compute size
4. Monitor connection pool
5. Verify application connectivity
```

---

## 7. Load Shedding Strategy

### 7.1 Request Priority (Proposed)

| Priority | Request Types | Shed Order |
|----------|---------------|------------|
| P0 (Critical) | Health checks, auth refresh | Never |
| P1 (High) | Read operations, core CRUD | Last |
| P2 (Medium) | List operations, search | Second |
| P3 (Low) | Reports, exports, bulk ops | First |

### 7.2 Load Shedding Triggers

| Condition | Action |
|-----------|--------|
| Queue depth > 100 | Shed P3 requests (503) |
| Queue depth > 250 | Shed P3 + P2 requests |
| Queue depth > 500 | Shed P3 + P2 + slow P1 |
| Memory > 90% | Aggressive shedding |

---

## 8. Monitoring and Alerting

### 8.1 Scale Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Request rate | Application logs | >80 rps |
| Error rate | Application logs | >1% |
| p95 latency | Application logs | >500ms |
| CPU usage | Platform metrics | >70% |
| Memory usage | Platform metrics | >75% |
| DB connections | Database metrics | >80% pool |

### 8.2 Alerting Configuration (GAP)

**Current State**: No automated alerting configured

**Required Implementation**:
- Configure alerts in Render (if available)
- Set up external monitoring (UptimeRobot, etc.)
- Integrate with PagerDuty/Opsgenie

---

## 9. Capacity Planning

### 9.1 Current Capacity Estimates

| Metric | Current Capacity | Confidence |
|--------|------------------|------------|
| Concurrent users | ~100 | Medium |
| Requests/second | ~100 | Medium |
| Active tenants | ~50 | Low |
| Database connections | 50 | High |

### 9.2 Scale Milestones

| Milestone | Tenants | Users | RPS | Changes Required |
|-----------|---------|-------|-----|------------------|
| Current | 50 | 500 | 100 | None |
| 250 tenants | 250 | 2,500 | 250 | Scale Render, tune DB |
| 500 tenants | 500 | 5,000 | 500 | Redis cache, worker queue |
| 1000 tenants | 1000 | 10,000 | 1000 | Multi-region, sharding |

---

## 10. Enterprise SLA Guardrails

### 10.1 SLA Tiers

| Tier | Availability | Response Time | Support |
|------|--------------|---------------|---------|
| Standard | 99% | <500ms p95 | Email |
| Professional | 99.5% | <300ms p95 | Priority email |
| Enterprise | 99.9% | <200ms p95 | Dedicated |

### 10.2 SLA Protection Measures

| Measure | Status | Purpose |
|---------|--------|---------|
| Rate limiting | ✅ IMPLEMENTED | Prevent overload |
| Health probes | ✅ IMPLEMENTED | Detect issues |
| Graceful shutdown | ✅ IMPLEMENTED | Clean restarts |
| Request correlation | ✅ IMPLEMENTED | Debug issues |
| Per-tenant limits | 🔴 NOT IMPLEMENTED | Noisy neighbor |
| Circuit breakers | 🔴 NOT IMPLEMENTED | Dependency protection |
| Request queuing | 🔴 NOT IMPLEMENTED | Smooth spikes |

---

## 11. Implementation Roadmap

### Q1 2026

| Feature | Priority | Effort |
|---------|----------|--------|
| External monitoring alerts | P0 | 1 day |
| Per-tenant rate limiting | P1 | 3 days |
| Load shedding (basic) | P2 | 2 days |

### Q2 2026

| Feature | Priority | Effort |
|---------|----------|--------|
| Circuit breakers | P1 | 1 week |
| Request queuing | P2 | 1 week |
| Auto-scaling configuration | P1 | 3 days |

### Q3 2026

| Feature | Priority | Effort |
|---------|----------|--------|
| Advanced load shedding | P2 | 1 week |
| Multi-region failover | P1 | 2 weeks |
| Enterprise SLA monitoring | P1 | 1 week |

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| DevOps Lead | __________ | __________ |
| CTO | __________ | __________ |
