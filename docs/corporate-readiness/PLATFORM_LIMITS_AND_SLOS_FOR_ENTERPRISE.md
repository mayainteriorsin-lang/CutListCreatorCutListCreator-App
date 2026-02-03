# Platform Limits & SLOs for Enterprise

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define platform limits, quotas, and Service Level Objectives (SLOs) for enterprise customers.

---

## 2. Service Level Objectives

### 2.1 Availability SLOs

| Tier | Monthly Uptime | Allowed Downtime | Status |
|------|----------------|------------------|--------|
| Standard | 99.0% | 7.3 hours | ✅ Achievable |
| Professional | 99.5% | 3.65 hours | ✅ Achievable |
| Enterprise | 99.9% | 43.8 minutes | 🟡 Stretch |

**Evidence**: SLO monitoring via health endpoints (`/api/health/*`)

### 2.2 Performance SLOs

| Metric | Standard | Professional | Enterprise |
|--------|----------|--------------|------------|
| API p50 latency | <200ms | <150ms | <100ms |
| API p95 latency | <500ms | <400ms | <300ms |
| API p99 latency | <1s | <800ms | <500ms |
| Page load time | <3s | <2s | <1.5s |

**Evidence**: Structured logging with `[METRICS]` prefix tracks latency

### 2.3 Reliability SLOs

| Metric | Standard | Professional | Enterprise |
|--------|----------|--------------|------------|
| Error rate | <1% | <0.5% | <0.1% |
| Data durability | 99.99% | 99.999% | 99.999% |
| RTO | 4 hours | 2 hours | 1 hour |
| RPO | 1 hour | 15 min | 5 min |

---

## 3. Platform Limits by Plan

### 3.1 User Limits

| Limit | Free | Starter | Professional | Enterprise |
|-------|------|---------|--------------|------------|
| Total users | 5 | 25 | 100 | Custom |
| Admin users | 1 | 3 | 10 | Custom |
| Concurrent sessions | 5 | 25 | 100 | Custom |

### 3.2 Resource Limits

| Limit | Free | Starter | Professional | Enterprise |
|-------|------|---------|--------------|------------|
| Projects | 10 | 100 | 1,000 | Unlimited |
| Storage | 100MB | 1GB | 10GB | Custom |
| File upload size | 10MB | 25MB | 50MB | 100MB |
| Export history | 30 days | 90 days | 1 year | Custom |

### 3.3 API Limits

| Limit | Free | Starter | Professional | Enterprise |
|-------|------|---------|--------------|------------|
| Requests/15min | 500 | 2,000 | 10,000 | Custom |
| Requests/day | 5,000 | 25,000 | 100,000 | Custom |
| Burst rate | 20/sec | 50/sec | 100/sec | Custom |
| Concurrent requests | 5 | 25 | 50 | Custom |

### 3.4 Feature Availability

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Basic features | ✅ | ✅ | ✅ | ✅ |
| Advanced features | ❌ | ✅ | ✅ | ✅ |
| SSO (SAML/OIDC) | ❌ | ❌ | ❌ | ✅ |
| SCIM provisioning | ❌ | ❌ | ❌ | ✅ |
| API access | ❌ | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ✅ | ✅ |
| Custom integrations | ❌ | ❌ | ❌ | ✅ |
| Dedicated support | ❌ | ❌ | ❌ | ✅ |
| SLA guarantee | ❌ | ❌ | ✅ | ✅ |
| Data residency options | ❌ | ❌ | ❌ | ✅ |

---

## 4. Current Implementation Status

### 4.1 Limit Enforcement

| Limit Type | Status | Evidence |
|------------|--------|----------|
| Global rate limit | ✅ IMPLEMENTED | `server/index.ts` (express-rate-limit) |
| Per-tenant rate limit | 🔴 NOT IMPLEMENTED | - |
| User count limit | 🔴 NOT IMPLEMENTED | - |
| Storage limit | 🔴 NOT IMPLEMENTED | - |
| Project limit | 🔴 NOT IMPLEMENTED | - |
| Feature flags | 🔴 NOT IMPLEMENTED | - |

### 4.2 SLO Monitoring

| Capability | Status | Evidence |
|------------|--------|----------|
| Availability tracking | 🟡 PARTIAL | Health endpoints exist |
| Latency tracking | ✅ IMPLEMENTED | Structured logging |
| Error rate tracking | 🟡 PARTIAL | Logging, no aggregation |
| Dashboard | 🔴 NOT IMPLEMENTED | No SLO dashboard |
| Alerting | 🔴 NOT IMPLEMENTED | No SLO alerts |

---

## 5. Rate Limit Implementation

### 5.1 Current Configuration

```typescript
// server/index.ts - current rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                // 1000 requests per window
  standardHeaders: true,    // Return rate limit info in headers
  legacyHeaders: false,
});
app.use("/api", limiter);
```

### 5.2 Rate Limit Response

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests, please try again later.",
  "retryAfter": 300
}
```

**Headers Included**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until retry (on 429)

### 5.3 Proposed Per-Tenant Rate Limiting

```typescript
// Proposed: Per-tenant rate limiting
const createTenantLimiter = (plan: string) => {
  const limits = {
    free: { windowMs: 15 * 60 * 1000, max: 500 },
    starter: { windowMs: 15 * 60 * 1000, max: 2000 },
    professional: { windowMs: 15 * 60 * 1000, max: 10000 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 50000 },
  };
  return rateLimit({
    ...limits[plan] || limits.free,
    keyGenerator: (req) => req.user?.tenantId || req.ip,
  });
};
```

---

## 6. Enterprise-Specific SLOs

### 6.1 Enterprise SLA Terms

| Term | Commitment | Measurement |
|------|------------|-------------|
| Availability | 99.9% monthly | Health probe success rate |
| Response time | p95 < 300ms | Application metrics |
| Support response | 1 hour (P1) | Ticket timestamp |
| Incident notification | 15 minutes | Alert → communication |
| RCA delivery | 48 hours | Incident close → RCA |

### 6.2 SLA Exclusions

| Exclusion | Description |
|-----------|-------------|
| Scheduled maintenance | Pre-announced maintenance windows |
| Force majeure | Natural disasters, etc. |
| Customer-caused | Issues from customer actions |
| Third-party | IdP outages, etc. |
| Beta features | Non-GA features |

### 6.3 SLA Credits (Proposed)

| Monthly Uptime | Credit |
|----------------|--------|
| 99.9% - 99.0% | 10% |
| 99.0% - 95.0% | 25% |
| < 95.0% | 50% |

---

## 7. Capacity Planning for Enterprise

### 7.1 Per-Enterprise Tenant Sizing

| Size | Users | Projects | Storage | API/day |
|------|-------|----------|---------|---------|
| Small | <100 | <500 | <5GB | <50K |
| Medium | 100-500 | 500-2000 | 5-25GB | 50-200K |
| Large | 500-2000 | 2000-10000 | 25-100GB | 200K-1M |
| XL | 2000+ | 10000+ | 100GB+ | 1M+ |

### 7.2 Infrastructure Requirements

| Size | Compute | Database | Cache |
|------|---------|----------|-------|
| Small | Shared | Shared | Shared |
| Medium | Shared | Shared | Shared |
| Large | Dedicated | Dedicated connection pool | Dedicated |
| XL | Dedicated instance | Dedicated database | Dedicated |

---

## 8. Monitoring and Reporting

### 8.1 Enterprise Dashboard Metrics

| Metric | Update Frequency | Display |
|--------|------------------|---------|
| Availability (30 day) | Real-time | Percentage |
| Latency (p50/p95/p99) | Real-time | Milliseconds |
| Error rate | Real-time | Percentage |
| API usage | Hourly | Requests |
| Storage usage | Daily | GB |
| Active users | Daily | Count |

### 8.2 Monthly Report Contents

```markdown
## Monthly Enterprise Report - [Month Year]

### Executive Summary
- Overall availability: X.XX%
- SLA status: Met / Missed
- Major incidents: X

### Availability
- Target: 99.9%
- Actual: X.XX%
- Downtime: XX minutes

### Performance
- p50 latency: XXms (target: <100ms)
- p95 latency: XXms (target: <300ms)
- p99 latency: XXms (target: <500ms)

### Usage
- API calls: X,XXX,XXX
- Active users: XXX
- Storage: XX GB

### Incidents
| Date | Duration | Impact | RCA |
|------|----------|--------|-----|

### Upcoming
- Scheduled maintenance
- Feature releases
- Known issues
```

---

## 9. Limit Increase Requests

### 9.1 Request Process

1. Customer submits limit increase request
2. Customer Success reviews business justification
3. Engineering reviews technical feasibility
4. Approval from Engineering Lead
5. Implementation and validation
6. Customer notification

### 9.2 Limit Increase Considerations

| Factor | Consideration |
|--------|---------------|
| Contract terms | Does contract allow increases? |
| Technical capacity | Can infrastructure support it? |
| Other tenants | Will it impact noisy neighbor? |
| Cost | Additional infrastructure cost? |
| Timeline | How quickly needed? |

---

## 10. Implementation Roadmap

### 10.1 Q1 2026

| Feature | Priority | Status |
|---------|----------|--------|
| Per-tenant rate limiting | P1 | 🔴 Not started |
| Basic usage tracking | P1 | 🔴 Not started |
| Limit exceeded notifications | P2 | 🔴 Not started |

### 10.2 Q2 2026

| Feature | Priority | Status |
|---------|----------|--------|
| Feature flags per plan | P1 | 🔴 Not started |
| Storage limit enforcement | P1 | 🔴 Not started |
| SLO dashboard | P2 | 🔴 Not started |

### 10.3 Q3 2026

| Feature | Priority | Status |
|---------|----------|--------|
| Automated SLA reporting | P1 | 🔴 Not started |
| Self-service limit viewing | P2 | 🔴 Not started |
| Usage analytics | P2 | 🔴 Not started |

---

## 11. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Product Lead | __________ | __________ |
| CTO | __________ | __________ |
