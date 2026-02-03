# Operational Runbook - Phase 8 Enterprise Hardening

## Overview

This document describes the operational controls implemented in Phase 8 for enterprise-grade reliability and security.

## Health Endpoints

### Liveness Probe
- **Endpoint**: `GET /api/health/live`
- **Purpose**: Verifies the process is alive
- **Response (200)**: `{ "status": "alive", "timestamp": "...", "uptime": 123.45 }`
- **Use**: Kubernetes/ECS liveness checks to detect zombie processes

### Readiness Probe
- **Endpoint**: `GET /api/health/ready`
- **Purpose**: Verifies the service can handle requests (dependencies available)
- **Response (200)**: `{ "status": "ready", "timestamp": "...", "checks": { "database": "connected" } }`
- **Response (503)**: `{ "status": "not_ready", ... }`
- **Use**: Load balancer health checks to route traffic

### Combined Health
- **Endpoint**: `GET /api/health`
- **Purpose**: Detailed system health for monitoring dashboards
- **Response**: Includes uptime, database status, version

## Request Correlation

### Header: `x-request-id`
- Every API request is assigned a unique request ID
- If client sends `x-request-id`, it is preserved (distributed tracing)
- Request ID is echoed in response header
- Request ID is included in:
  - Structured logs: `[METRICS] requestId=xxx ...`
  - Error responses: `{ "error": "...", "requestId": "xxx" }`
  - Audit logs

## Graceful Shutdown

### Signal Handling
- **SIGTERM**: Initiates graceful shutdown
- **SIGINT**: Initiates graceful shutdown (Ctrl+C)
- **Timeout**: 30 seconds max for graceful shutdown

### Shutdown Sequence
1. Stop accepting new connections
2. Wait for in-flight requests to complete
3. Close database connection pool
4. Exit cleanly with code 0

### Logs
```
[SHUTDOWN] Received SIGTERM, starting graceful shutdown...
[SHUTDOWN] Closing HTTP server...
[SHUTDOWN] HTTP server closed
[SHUTDOWN] Running cleanup handlers...
[SHUTDOWN] Closing database pool...
[SHUTDOWN] Database pool closed
[SHUTDOWN] Graceful shutdown complete
```

## Startup Configuration Validation

### Critical Settings (Production)
| Setting | Requirement | Failure Mode |
|---------|-------------|--------------|
| `JWT_SECRET` | Required, >= 32 chars | Process exits |
| `DATABASE_URL` | Required | Process exits |
| `VITE_BYPASS_AUTH` | Must not be `true` | Process exits |
| `BYPASS_AUTH` | Must not be `true` | Process exits |

### Warnings (Development)
- Missing `JWT_SECRET` uses fallback
- Missing `REDIS_URL` uses in-memory cache

### Logs
```
[STARTUP] Configuration validation passed
```
or
```
[STARTUP ERROR] FATAL: JWT_SECRET is required in production
[STARTUP] Aborting due to critical configuration errors
```

## Audit Logging

### Audited Operations
| Endpoint | Action | Resource |
|----------|--------|----------|
| `POST /api/crm/leads` | `lead.upsert` | `lead` |
| `PATCH /api/crm/leads/:id/status` | `lead.status_update` | `lead` |
| `POST /api/crm/activities` | `activity.create` | `activity` |
| `POST /api/crm/quotes` | `quote.upsert` | `quote` |

### Audit Log Fields
- `tenantId`: Tenant scope
- `userId`: Acting user
- `action`: Action type
- `resourceType`: Resource category
- `resourceId`: Specific resource
- `changes`: Request body (for mutations)
- `ipAddress`: Client IP
- `userAgent`: Client user agent
- `requestId`: Request correlation ID

## Security Guardrails

### Production Mode Enforcement
- Dev auth bypass (`admin@cutlist.pro/admin123`) is **disabled** in production
- Weak JWT secrets are rejected
- Environment validation runs at startup

### Token Security
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry
- Tokens include tenant context for isolation

## Monitoring Integration

### Structured Logs
All API requests emit structured metrics:
```
[METRICS] requestId=xxx request_duration_ms=123 method=GET path=/api/health status=200
```

### Alerting Triggers
1. **Liveness failure**: Process restart required
2. **Readiness failure**: Database connectivity issue
3. **High error rate**: Check application logs
4. **Slow responses**: Check database performance
