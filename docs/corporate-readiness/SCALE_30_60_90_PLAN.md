# Scale 30/60/90 Plan

## Purpose
Capacity and reliability backlog with owners and sequencing for scaling CutListCreator.

---

## Current State Assessment

### Capacity Baseline
| Metric | Current | Target (90 days) |
|--------|---------|------------------|
| Concurrent users | ~100 | 500 |
| Requests/second | ~100 | 300 |
| Database connections | 50 max | 100 max |
| Storage | 1GB | 10GB |

### Reliability Baseline
| Metric | Current | Target (90 days) |
|--------|---------|------------------|
| Availability | 99%* | 99.5% |
| p95 Latency | <500ms | <300ms |
| Error Rate | <1% | <0.5% |
| MTTR | TBD | <1 hour |

*Estimated, formal SLO tracking begins in hypercare

---

## 30-Day Plan (Stabilization)

### Focus: Production stability, monitoring, critical fixes

### Week 1-2: Foundation

| Item | Priority | Owner | Status |
|------|----------|-------|--------|
| Deploy production monitoring | P0 | DevOps | Pending |
| Configure alert thresholds | P0 | DevOps | Pending |
| Fix react-router XSS vulnerability | P0 | Frontend | Pending |
| Implement production logging aggregation | P1 | DevOps | Pending |
| Complete first resilience drill | P1 | DevOps | Pending |

### Week 3-4: Optimization

| Item | Priority | Owner | Status |
|------|----------|-------|--------|
| Database connection pool tuning | P1 | Backend | Pending |
| Implement Redis caching layer | P1 | Backend | Pending |
| CDN configuration for static assets | P2 | DevOps | Pending |
| Upgrade jspdf to v4.x | P2 | Frontend | Pending |
| First monthly security review | P2 | Security | Pending |

### 30-Day Success Criteria
- [ ] Zero P0 incidents lasting > 4 hours
- [ ] All critical vulnerabilities addressed
- [ ] Monitoring and alerting operational
- [ ] First resilience drill completed
- [ ] SLO tracking active

---

## 60-Day Plan (Performance)

### Focus: Performance optimization, capacity expansion, operational maturity

### Week 5-6: Caching & Performance

| Item | Priority | Owner | Status |
|------|----------|-------|--------|
| Redis caching fully operational | P1 | Backend | Pending |
| Query result caching implemented | P1 | Backend | Pending |
| Database query optimization | P1 | Backend | Pending |
| Image optimization pipeline | P2 | Frontend | Pending |
| API response compression audit | P2 | Backend | Pending |

### Week 7-8: Scaling Preparation

| Item | Priority | Owner | Status |
|------|----------|-------|--------|
| Horizontal scaling configuration | P1 | DevOps | Pending |
| Auto-scaling policies defined | P1 | DevOps | Pending |
| Load testing at 2x baseline | P1 | QA | Pending |
| Database read replica evaluation | P2 | Backend | Pending |
| Cost optimization review | P2 | DevOps | Pending |

### 60-Day Success Criteria
- [ ] p95 latency < 400ms
- [ ] Redis caching reducing DB load by 30%
- [ ] Horizontal scaling tested and ready
- [ ] Two resilience drills completed
- [ ] Error budget maintained > 50%

---

## 90-Day Plan (Scale)

### Focus: Full scale readiness, automation, long-term sustainability

### Week 9-10: Scale Infrastructure

| Item | Priority | Owner | Status |
|------|----------|-------|--------|
| Auto-scaling active in production | P1 | DevOps | Pending |
| Database connection scaling | P1 | Backend | Pending |
| Multi-region evaluation | P2 | DevOps | Pending |
| Async processing for heavy operations | P2 | Backend | Pending |
| File storage migration to object storage | P2 | Backend | Pending |

### Week 11-12: Operational Excellence

| Item | Priority | Owner | Status |
|------|----------|-------|--------|
| Full observability stack | P1 | DevOps | Pending |
| Automated incident detection | P1 | DevOps | Pending |
| On-call rotation established | P1 | Engineering | Pending |
| Quarterly security audit completed | P2 | Security | Pending |
| Disaster recovery plan tested | P2 | DevOps | Pending |

### 90-Day Success Criteria
- [ ] Support 500 concurrent users
- [ ] p95 latency < 300ms
- [ ] 99.5% availability achieved
- [ ] Auto-scaling operational
- [ ] On-call rotation active
- [ ] Three resilience drills completed

---

## Capacity Scaling Milestones

### Milestone 1: 100 Users (Current)
| Component | Configuration |
|-----------|---------------|
| App instances | 1 |
| Database tier | Neon Free/Pro |
| Cache | In-memory |
| CDN | None |

### Milestone 2: 250 Users (30 days)
| Component | Configuration |
|-----------|---------------|
| App instances | 1-2 |
| Database tier | Neon Pro |
| Cache | Redis (single) |
| CDN | Static assets |

### Milestone 3: 500 Users (60 days)
| Component | Configuration |
|-----------|---------------|
| App instances | 2-4 (auto-scale) |
| Database tier | Neon Pro (scaled) |
| Cache | Redis (with persistence) |
| CDN | Full static + API caching |

### Milestone 4: 1000+ Users (90+ days)
| Component | Configuration |
|-----------|---------------|
| App instances | Auto-scale (4+) |
| Database tier | Neon Pro + read replica |
| Cache | Redis cluster |
| CDN | Edge caching |
| Async | Queue for heavy operations |

---

## Reliability Improvements Backlog

### High Priority (30 days)
| Improvement | Impact | Effort |
|-------------|--------|--------|
| Structured logging aggregation | High | Low |
| Alert threshold tuning | High | Low |
| Circuit breaker for external deps | Medium | Medium |

### Medium Priority (60 days)
| Improvement | Impact | Effort |
|-------------|--------|--------|
| Distributed tracing | High | Medium |
| Database connection pooling upgrade | Medium | Low |
| Request retry with exponential backoff | Medium | Low |

### Lower Priority (90 days)
| Improvement | Impact | Effort |
|-------------|--------|--------|
| Multi-AZ deployment | High | High |
| Database failover automation | High | High |
| Chaos engineering integration | Medium | Medium |

---

## Cost Projections

### Infrastructure Cost by Milestone

| Milestone | Users | Est. Monthly Cost |
|-----------|-------|-------------------|
| Current | 100 | $15-30 |
| 30-day | 250 | $30-60 |
| 60-day | 500 | $60-120 |
| 90-day | 1000 | $120-250 |

### Cost Optimization Opportunities

| Optimization | Potential Savings | Timeline |
|--------------|-------------------|----------|
| Reserved instances | 20-30% | 90 days |
| Caching (reduced DB load) | 15-25% | 30 days |
| CDN (reduced bandwidth) | 10-15% | 30 days |
| Right-sizing | 10-20% | 60 days |

---

## Owner Responsibility Matrix

| Area | Primary Owner | Backup |
|------|--------------|--------|
| Infrastructure/DevOps | DevOps Lead | Backend Lead |
| Backend Performance | Backend Lead | DevOps Lead |
| Frontend Performance | Frontend Lead | Backend Lead |
| Security | Security Lead | Engineering Lead |
| Monitoring/Alerting | DevOps Lead | Backend Lead |
| Database | Backend Lead | DevOps Lead |
| Cost Management | DevOps Lead | CTO |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Rapid user growth exceeds capacity | Medium | High | Auto-scaling, monitoring alerts |
| Database becomes bottleneck | Medium | High | Caching, read replica |
| Key dependency failure | Low | High | Circuit breakers, fallbacks |
| Cost overrun | Medium | Medium | Monitoring, alerts, optimization |
| Staff unavailability | Low | Medium | Documentation, on-call rotation |

---

## Review Schedule

| Review | Frequency | Participants |
|--------|-----------|--------------|
| Scale progress check | Weekly | Engineering leads |
| Capacity planning | Bi-weekly | Engineering + Product |
| Cost review | Monthly | Engineering + Finance |
| 30/60/90 plan review | Monthly | Full team |

---

## Appendix: Key Metrics Dashboard

### Capacity Metrics
- Current active users
- Requests per second
- Database connections
- Memory usage
- CPU usage

### Performance Metrics
- p50, p95, p99 latency
- Error rate by endpoint
- Cache hit ratio
- Database query time

### Cost Metrics
- Daily infrastructure spend
- Cost per user
- Resource utilization efficiency
