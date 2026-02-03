# Performance & Cost Baseline

## Document Version: 1.0
## Baseline Date: 2026-02-03

---

## 1. Performance Baseline

### 1.1 API Response Time Targets

| Endpoint Category | p50 Target | p95 Target | p99 Target |
|-------------------|------------|------------|------------|
| Health endpoints | 20ms | 100ms | 200ms |
| Authentication | 100ms | 300ms | 500ms |
| CRUD operations | 100ms | 300ms | 500ms |
| List operations | 150ms | 500ms | 1000ms |
| File operations | 500ms | 2000ms | 5000ms |

### 1.2 Throughput Baseline

| Metric | Development Baseline | Production Target |
|--------|---------------------|-------------------|
| Requests/second (health) | 100-200 rps | 500+ rps |
| Requests/second (API) | 50-100 rps | 200+ rps |
| Concurrent connections | 100 | 500+ |

### 1.3 Error Rate Baseline

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| 5xx error rate | < 0.1% | > 1% |
| 4xx error rate | < 5% | > 10% |
| Timeout rate | < 0.1% | > 0.5% |

---

## 2. Resource Utilization Baseline

### 2.1 Application Server

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| CPU usage | < 50% | 70% | 85% |
| Memory usage | < 60% | 75% | 90% |
| Process restarts | 0/day | 1/day | 3/day |

### 2.2 Database (Neon PostgreSQL)

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Connection pool usage | < 50% | 75% | 90% |
| Query time (p95) | < 100ms | 500ms | 1000ms |
| Active connections | < 20 | 40 | 50 |
| Storage usage | < 50% | 75% | 90% |

### 2.3 Network

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Bandwidth usage | < 50% | 75% | 90% |
| Request size (avg) | < 100KB | 500KB | 1MB |
| Response size (avg) | < 200KB | 1MB | 5MB |

---

## 3. Identified Hotspots

### 3.1 Current Hotspots

| Hotspot | Description | Impact | Mitigation |
|---------|-------------|--------|------------|
| Database queries | No query optimization layer | Medium | Add query caching |
| In-memory cache | No distributed cache | Low | Redis migration planned |
| File uploads | Stored locally | Medium | Object storage migration |
| PDF generation | Synchronous, memory-intensive | Low | Consider async processing |

### 3.2 Optimization Opportunities

| Optimization | Effort | Impact | Priority |
|--------------|--------|--------|----------|
| Add Redis caching | Medium | High | P1 |
| Database connection pooling tuning | Low | Medium | P1 |
| Query result caching | Low | Medium | P2 |
| CDN for static assets | Low | Medium | P2 |
| Image optimization | Medium | Low | P3 |

---

## 4. Cost Baseline

### 4.1 Infrastructure Costs (Estimated Monthly)

| Service | Tier | Estimated Cost | Notes |
|---------|------|----------------|-------|
| Render (App hosting) | Starter | $7-25/mo | Scales with traffic |
| Neon (Database) | Free/Pro | $0-19/mo | Based on compute hours |
| Redis (if added) | Hobby | $0-15/mo | For caching layer |
| Domain/DNS | - | $15/year | - |
| **Total** | - | **$7-60/mo** | Baseline |

### 4.2 Scaling Cost Projections

| Users | Requests/day | Est. Monthly Cost |
|-------|--------------|-------------------|
| 100 | 10,000 | $15-30 |
| 500 | 50,000 | $30-60 |
| 1,000 | 100,000 | $50-100 |
| 5,000 | 500,000 | $100-250 |

### 4.3 Cost Optimization Levers

| Lever | Savings Potential | Implementation |
|-------|-------------------|----------------|
| Caching (Redis) | 20-30% DB costs | Week 4 |
| Query optimization | 10-20% DB costs | Ongoing |
| Static asset CDN | 10-15% bandwidth | Week 2 |
| Auto-scaling policies | Avoid over-provisioning | Week 4 |

---

## 5. Performance Monitoring

### 5.1 Key Metrics to Track

```
# From application logs
[METRICS] requestId=xxx request_duration_ms=xxx method=xxx path=xxx status=xxx

# Derived metrics
- p50, p95, p99 latency per endpoint
- Error rate by status code
- Request volume by endpoint
- Response size distribution
```

### 5.2 Dashboard Requirements

| Panel | Metric | Aggregation |
|-------|--------|-------------|
| Request Rate | Requests/minute | Sum |
| Latency Distribution | p50, p95, p99 | Percentile |
| Error Rate | 5xx/total | Percentage |
| Availability | Successful/total | Percentage |
| Top Endpoints | Request count by path | Count |
| Slowest Endpoints | p95 by path | Percentile |

### 5.3 Alert Configuration

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | > 5% for 5 min | P1 |
| High Latency | p95 > 2s for 5 min | P1 |
| Low Availability | < 99% for 10 min | P0 |
| High Resource Usage | CPU > 85% for 10 min | P2 |

---

## 6. Capacity Planning

### 6.1 Current Capacity

| Dimension | Current Limit | Buffer |
|-----------|---------------|--------|
| Concurrent users | ~100 | 50% |
| Requests/second | ~100 | 100% |
| Database connections | 50 | 60% |
| Storage | 1GB | 90% |

### 6.2 Scaling Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| CPU sustained > 70% | 15 min | Scale up instance |
| Memory sustained > 75% | 15 min | Scale up instance |
| DB connections > 40 | 5 min | Review connection pool |
| Response time p95 > 1s | 10 min | Investigate hotspot |

### 6.3 Scaling Runbook

```bash
# Monitor current resource usage
# Via Render Dashboard: Service > Metrics

# Scale up (Render)
# Dashboard > Service > Settings > Instance Type

# Scale horizontally (if supported)
# Dashboard > Service > Settings > Instances

# Verify after scaling
curl -s https://[production-url]/api/health | jq .
```

---

## 7. Performance Testing

### 7.1 Load Test Script

**Location**: `tests/load/load-test.ts`

```bash
# Run load test (requires server running)
npm run dev:server  # Terminal 1
npx tsx tests/load/load-test.ts  # Terminal 2
```

### 7.2 Test Scenarios

| Scenario | Duration | Concurrency | Purpose |
|----------|----------|-------------|---------|
| Smoke test | 1 min | 5 | Basic functionality |
| Load test | 10 min | 50 | Normal load |
| Stress test | 10 min | 100+ | Find breaking point |
| Soak test | 1 hour | 30 | Memory leak detection |

### 7.3 GAP: Production Load Testing

**NOTE**: Full production load testing requires:
- Staging environment with production-like data
- External load testing service (k6, Artillery, Locust)
- Isolated test window to avoid user impact

---

## 8. Optimization Checklist

### Quick Wins (Week 1-2)
- [ ] Enable gzip compression (if not enabled)
- [ ] Set appropriate cache headers
- [ ] Optimize database indexes for common queries
- [ ] Review and tune connection pool size

### Medium-Term (Week 3-4)
- [ ] Implement Redis caching layer
- [ ] Add CDN for static assets
- [ ] Implement query result caching
- [ ] Set up auto-scaling policies

### Long-Term (Month 2+)
- [ ] Database read replicas (if needed)
- [ ] Async processing for heavy operations
- [ ] Edge caching for API responses
- [ ] Geographic distribution (if needed)

---

## Appendix: Benchmark Commands

```bash
# Health endpoint benchmark
ab -n 1000 -c 10 https://[production-url]/api/health/live

# API endpoint benchmark (with auth)
# Use tests/load/load-test.ts for authenticated endpoints

# Database query timing
# Check Neon dashboard for slow query log
```
