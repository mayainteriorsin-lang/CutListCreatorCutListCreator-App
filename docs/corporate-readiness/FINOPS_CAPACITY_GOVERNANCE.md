# FinOps & Capacity Governance

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Establish cost monitoring categories, alert thresholds, and capacity trigger rules for sustainable financial and resource management.

---

## 2. Cost Monitoring Framework

### 2.1 Cost Categories

| Category | Services | Owner | Budget Allocation |
|----------|----------|-------|-------------------|
| **Compute** | Render hosting | DevOps | 40% |
| **Database** | Neon PostgreSQL | Backend | 30% |
| **Caching** | Redis (planned) | Backend | 10% |
| **Monitoring** | TBD | DevOps | 10% |
| **CDN/Storage** | TBD | DevOps | 10% |

### 2.2 Cost Baseline

| Environment | Service | Tier | Monthly Cost |
|-------------|---------|------|--------------|
| **Production** | Render | Starter/Pro | $7-50 |
| | Neon | Free/Pro | $0-19 |
| | Redis | Hobby (future) | $0-15 |
| | **Subtotal** | | **$7-84** |
| **Staging** | Render | Starter | $7 |
| | Neon | Free | $0 |
| | **Subtotal** | | **$7** |
| **Total** | | | **$14-91** |

### 2.3 Cost Projections by Scale

| Users | Requests/day | Est. Monthly | Notes |
|-------|--------------|--------------|-------|
| 100 | 10,000 | $15-30 | Current baseline |
| 250 | 25,000 | $30-50 | +Redis, +monitoring |
| 500 | 50,000 | $60-100 | Scaled compute |
| 1,000 | 100,000 | $100-180 | Full scaling |
| 5,000 | 500,000 | $200-400 | Enterprise tier |

---

## 3. Cost Alert Thresholds

### 3.1 Alert Configuration

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Budget Warning | 80% of monthly budget | Warning | Review spend |
| Budget Critical | 100% of monthly budget | Critical | Immediate review |
| Daily Spike | 150% of daily average | Warning | Investigate |
| Daily Critical | 200% of daily average | Critical | Immediate action |
| Resource Waste | Utilization <20% for 7 days | Info | Right-sizing review |

### 3.2 Alert Response Procedures

```markdown
## Cost Alert Response

### Budget Warning (80%)
1. Review current spend breakdown
2. Identify largest cost drivers
3. Check for unexpected usage
4. Forecast end-of-month spend
5. Prepare optimization options

### Budget Critical (100%)
1. Immediate spend freeze (non-critical)
2. Identify and stop wasteful resources
3. Escalate to Engineering Lead
4. Emergency cost review meeting
5. Implement immediate optimizations

### Daily Spike (150%+)
1. Identify anomalous service
2. Check for:
   - Traffic spike (legitimate or attack)
   - Resource misconfiguration
   - Runaway process
3. Take corrective action
4. Document root cause
```

### 3.3 GAP: Automated Cost Monitoring

**Status**: GAP - manual monitoring via dashboards

**Current Approach**: Check Render and Neon dashboards weekly

**Recommended Implementation**:
- Configure billing alerts in Render
- Configure usage alerts in Neon
- Set up monthly cost report email

---

## 4. Capacity Governance

### 4.1 Capacity Metrics

| Metric | Current Limit | Warning | Critical |
|--------|---------------|---------|----------|
| CPU Usage | 100% | 70% | 85% |
| Memory Usage | 512MB-2GB | 75% | 90% |
| Database Connections | 50 | 40 (80%) | 45 (90%) |
| Storage | Per plan | 75% | 90% |
| Request Rate | ~100 rps | 80 rps | 95 rps |

### 4.2 Capacity Trigger Rules

```markdown
## Capacity Scaling Triggers

### Scale-Up Triggers
| Trigger | Condition | Response |
|---------|-----------|----------|
| CPU High | >70% for 15 min sustained | Review scaling |
| CPU Critical | >85% for 10 min | Immediate scale |
| Memory High | >75% for 15 min sustained | Review scaling |
| Memory Critical | >90% for 5 min | Immediate scale |
| DB Connections High | >80% for 10 min | Review pool/scaling |
| Latency High | p95 >1s for 10 min | Investigate + scale |

### Scale-Down Triggers
| Trigger | Condition | Response |
|---------|-----------|----------|
| CPU Low | <30% for 7 days | Consider downsize |
| Memory Low | <40% for 7 days | Consider downsize |
| Off-Peak | Known low-traffic periods | Scheduled downsize |
```

### 4.3 Scaling Decision Matrix

| Current State | Traffic Trend | Action |
|---------------|---------------|--------|
| Healthy | Stable | No action |
| Healthy | Increasing | Monitor, prepare scale plan |
| Warning | Stable | Investigate, optimize |
| Warning | Increasing | Scale up |
| Critical | Any | Immediate scale up |

---

## 5. Capacity Planning Process

### 5.1 Monthly Capacity Review

**Schedule**: Third Wednesday of each month
**Participants**: DevOps, Engineering Lead, Product

**Agenda**:
```markdown
## Monthly Capacity Review - [MONTH]

### 1. Current Utilization (10 min)
| Resource | Avg | Peak | Trend |
|----------|-----|------|-------|
| CPU | __% | __% | ↑/→/↓ |
| Memory | __% | __% | ↑/→/↓ |
| DB Conn | __ | __ | ↑/→/↓ |
| Storage | __GB | - | ↑ |

### 2. Traffic Analysis (10 min)
- Daily active users: __
- Peak concurrent users: __
- Request volume trend: __
- Geographic distribution: __

### 3. Forecasting (10 min)
- Expected growth: __%
- Planned features impacting capacity: __
- Marketing/events impacting traffic: __

### 4. Scaling Recommendations (15 min)
| Resource | Current | Recommended | Timeline |
|----------|---------|-------------|----------|
| | | | |

### 5. Cost Impact (10 min)
- Current monthly spend: $__
- Projected after scaling: $__
- Budget impact: __

### 6. Action Items (5 min)
| Action | Owner | Due |
|--------|-------|-----|
| | | |
```

### 5.2 Capacity Planning Horizons

| Horizon | Planning | Action Type |
|---------|----------|-------------|
| Immediate | 0-2 weeks | Reactive scaling |
| Short-term | 1-3 months | Proactive scaling |
| Medium-term | 3-6 months | Architecture planning |
| Long-term | 6-12 months | Strategic planning |

---

## 6. Cost Optimization Levers

### 6.1 Optimization Opportunities

| Lever | Savings Potential | Effort | Status |
|-------|-------------------|--------|--------|
| Caching (Redis) | 20-30% DB costs | Medium | Planned |
| Query optimization | 10-20% DB costs | Low | Ongoing |
| Static asset CDN | 10-15% bandwidth | Low | Planned |
| Right-sizing | 10-20% compute | Low | Periodic |
| Reserved instances | 20-30% compute | Low | Future |
| Auto-scaling | Avoid over-provision | Medium | Future |

### 6.2 Optimization Checklist

```markdown
## Quarterly Cost Optimization Review

### Compute
- [ ] Review instance sizes vs actual usage
- [ ] Check for idle instances
- [ ] Evaluate reserved instance options
- [ ] Review auto-scaling configuration

### Database
- [ ] Analyze slow query log
- [ ] Review connection pool efficiency
- [ ] Check for unused indexes
- [ ] Evaluate read replica need

### Caching
- [ ] Review cache hit rates
- [ ] Optimize cache TTLs
- [ ] Check for cache stampedes
- [ ] Evaluate cache tier

### Network
- [ ] Review bandwidth usage
- [ ] Optimize asset delivery (CDN)
- [ ] Compress responses (gzip)
- [ ] Review API payload sizes

### Storage
- [ ] Clean up unused data
- [ ] Archive old records
- [ ] Review backup retention
- [ ] Optimize file storage
```

---

## 7. Budget Management

### 7.1 Budget Allocation

| Quarter | Budget | Allocation |
|---------|--------|------------|
| Q1 | $300 | Baseline operations |
| Q2 | $400 | +Redis, scaling |
| Q3 | $500 | Growth buffer |
| Q4 | $500 | Growth buffer |

### 7.2 Budget Variance Reporting

```markdown
## Monthly Budget Report - [MONTH]

### Summary
| Category | Budget | Actual | Variance |
|----------|--------|--------|----------|
| Compute | $__ | $__ | +/-$__ |
| Database | $__ | $__ | +/-$__ |
| Caching | $__ | $__ | +/-$__ |
| Monitoring | $__ | $__ | +/-$__ |
| **Total** | **$__** | **$__** | **+/-$__** |

### Variance Analysis
[Explanation of significant variances]

### Forecast
- End of month projection: $__
- End of quarter projection: $__

### Recommendations
[Cost optimization recommendations]
```

---

## 8. FinOps Responsibilities

### 8.1 Role Assignments

| Role | Responsibilities |
|------|------------------|
| **DevOps Lead** | Overall cost management, infrastructure decisions |
| **Engineering Lead** | Technical optimization, capacity planning |
| **Finance** | Budget approval, variance review |
| **CTO** | Strategic decisions, major investments |

### 8.2 Review Cadence

| Review | Frequency | Owner | Participants |
|--------|-----------|-------|--------------|
| Cost monitoring | Weekly | DevOps Lead | DevOps |
| Capacity review | Monthly | DevOps Lead | Engineering |
| Budget review | Monthly | DevOps Lead | Finance |
| Strategic review | Quarterly | CTO | Leadership |

---

## 9. Metrics Dashboard

### 9.1 Key FinOps Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Cost per user | Monthly cost / active users | <$0.50 |
| Cost per request | Monthly cost / total requests | <$0.0001 |
| Infrastructure efficiency | Revenue / infra cost | >10x |
| Resource utilization | Avg CPU/Memory usage | 40-70% |
| Waste ratio | Unused resources / total | <10% |

### 9.2 GAP: FinOps Dashboard

**Status**: GAP - no unified dashboard

**Current Approach**: Manual aggregation from:
- Render Dashboard (compute costs)
- Neon Console (database costs)
- Spreadsheet tracking

**Recommended Implementation**:
- Aggregate costs in spreadsheet (short-term)
- Consider FinOps tool (long-term): CloudHealth, Kubecost

---

## 10. Appendix: Service Pricing Reference

### Render Pricing (as of 2026)

| Instance Type | CPU | Memory | Price |
|---------------|-----|--------|-------|
| Starter | Shared | 512MB | $7/mo |
| Standard | 0.5 | 2GB | $25/mo |
| Pro | 1 | 4GB | $85/mo |

### Neon Pricing (as of 2026)

| Plan | Compute | Storage | Price |
|------|---------|---------|-------|
| Free | 0.25 CU | 0.5GB | $0/mo |
| Pro | 1 CU | 10GB | $19/mo |
| Scale | Custom | Custom | Variable |

### Redis (Upstash/Render) Pricing

| Plan | Commands | Storage | Price |
|------|----------|---------|-------|
| Free | 10K/day | 256MB | $0/mo |
| Pay-as-you-go | Variable | Variable | ~$0.20/100K |
| Pro | Unlimited | 3GB | $10-30/mo |
