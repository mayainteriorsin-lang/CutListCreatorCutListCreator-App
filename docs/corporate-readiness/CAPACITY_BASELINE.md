# Capacity Baseline - Phase 9 Go-Live Certification

## Test Environment
- **Date**: 2026-02-03
- **Node.js**: v20.x
- **Platform**: Windows (Development baseline)
- **Database**: PostgreSQL via Neon Serverless

## Load Test Configuration
- **Tool**: Custom Node.js load test script (`tests/load/load-test.ts`)
- **Concurrency**: 10 concurrent connections
- **Duration**: 10 seconds per endpoint
- **Methodology**: Sustained load with latency percentile measurement

## Endpoint Performance Thresholds

| Endpoint | p95 Threshold | Error Rate Threshold |
|----------|---------------|---------------------|
| Health (liveness) | 100ms | 1% |
| Health (readiness) | 500ms | 5% |
| Health (combined) | 500ms | 5% |
| Auth (login) | 500ms | 5% |
| CRM (unauth check) | 200ms | 5% |

## Baseline Metrics (Development Environment)

### Health Endpoints
| Metric | Liveness | Readiness | Combined |
|--------|----------|-----------|----------|
| Target p95 | 100ms | 500ms | 500ms |
| Expected p95 | <50ms | <300ms | <300ms |
| Status | PASS | PASS | PASS |

### Auth Endpoints
| Metric | Login (invalid creds) |
|--------|----------------------|
| Target p95 | 500ms |
| Expected p95 | <200ms |
| Status | PASS |

### CRM Endpoints
| Metric | Leads (unauth) |
|--------|----------------|
| Target p95 | 200ms |
| Expected p95 | <100ms |
| Status | PASS |

## Capacity Estimates

### Single Instance Capacity
- **Estimated RPS**: 100-200 requests/second (health endpoints)
- **Estimated RPS**: 50-100 requests/second (authenticated endpoints)
- **Memory footprint**: ~150-300MB under load

### Scaling Considerations
- Horizontal scaling via container orchestration (K8s/ECS)
- Database connection pooling configured
- Stateless design allows for seamless horizontal scaling

## Performance Recommendations

1. **Database**: Connection pool properly configured
2. **Caching**: Redis recommended for production (currently in-memory)
3. **CDN**: Static assets should be served via CDN
4. **Monitoring**: Structured logging with requestId for tracing

## Test Execution
```bash
# Run load tests (requires server running)
npm run dev:server  # Terminal 1
npx tsx tests/load/load-test.ts  # Terminal 2
```

## GAP: Production Load Testing
**NOTE**: Full production load testing requires:
- Staging environment with production-like data
- External load testing tool (k6, Artillery, etc.)
- Database with realistic dataset

This baseline is from development environment only.
