# Integration Operations Runbook

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

This runbook provides operational procedures for managing CutListCreator integrations with enterprise systems. It covers authentication flows, API usage patterns, and troubleshooting procedures.

---

## 2. Integration Architecture Overview

### 2.1 Current Integration Capabilities

| Capability | Status | Notes |
|------------|--------|-------|
| JWT Authentication | ✅ AVAILABLE | 15-min access tokens, 7-day refresh |
| REST API | ✅ AVAILABLE | JSON request/response |
| Rate Limiting | ✅ AVAILABLE | Per-tenant by plan |
| Audit Logging | ✅ AVAILABLE | All actions logged |
| SSO (SAML) | ❌ PLANNED Q2 2026 | Not available for pilot |
| SSO (OIDC) | ❌ PLANNED Q2 2026 | Not available for pilot |
| SCIM 2.0 | ❌ PLANNED Q3 2026 | Not available for pilot |
| Webhooks | ❌ PLANNED Q3 2026 | Not available for pilot |
| API Keys | ❌ PLANNED Q2 2026 | Not available for pilot |

### 2.2 Integration Flow Diagram

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Client     │──────│  CutList     │──────│  Database    │
│   App        │      │  Creator     │      │  (Neon)      │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │
       │ 1. Login            │
       │─────────────────────│
       │                     │
       │ 2. JWT Token        │
       │◄────────────────────│
       │                     │
       │ 3. API Requests     │
       │ (Bearer Token)      │
       │─────────────────────│
       │                     │
       │ 4. JSON Response    │
       │◄────────────────────│
```

---

## 3. Authentication Operations

### 3.1 User Login Flow

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "user@enterprise.com",
  "password": "secure-password"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "uuid",
      "email": "user@enterprise.com",
      "role": "admin",
      "tenantId": "tenant-uuid"
    }
  }
}
```

**Error Responses**:

| Status | Code | Meaning |
|--------|------|---------|
| 401 | INVALID_CREDENTIALS | Wrong email/password |
| 403 | TENANT_SUSPENDED | Account suspended |
| 403 | TENANT_OFFBOARDED | Account terminated |
| 429 | RATE_LIMIT | Too many attempts |

### 3.2 Token Refresh Flow

**Endpoint**: `POST /api/auth/refresh`

**When to Use**: Access tokens expire after 15 minutes. Use refresh token to get a new access token without re-authentication.

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Implementation Best Practice**:
```javascript
// Recommended: Proactive token refresh
const TOKEN_REFRESH_BUFFER = 60000; // 1 minute before expiry

function shouldRefreshToken(accessToken) {
  const payload = jwt.decode(accessToken);
  const expiresAt = payload.exp * 1000;
  return Date.now() > (expiresAt - TOKEN_REFRESH_BUFFER);
}
```

### 3.3 Logout Flow

**Endpoint**: `POST /api/auth/logout`

**Purpose**: Revoke refresh token to prevent further token refreshes.

**Header**: `Authorization: Bearer <access-token>`

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 4. API Usage Patterns

### 4.1 Making Authenticated Requests

All API requests (except `/api/auth/login` and `/api/auth/register`) require authentication.

**Header Format**:
```
Authorization: Bearer <access-token>
```

**Example**:
```bash
curl -X GET https://api.cutlistcreator.com/api/quotations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

### 4.2 Rate Limit Handling

**Response Headers**:
```
X-RateLimit-Limit: 10000       # Max requests per window
X-RateLimit-Remaining: 9850    # Requests remaining
X-RateLimit-Reset: 1706968800  # Unix timestamp when window resets
```

**Rate Limits by Plan**:

| Plan | Requests | Window |
|------|----------|--------|
| Free | 100 | 15 min |
| Starter | 500 | 15 min |
| Professional | 2,000 | 15 min |
| Enterprise | 10,000 | 15 min |

**Handling 429 Response**:
```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      console.log(`Rate limited. Retrying after ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

### 4.3 Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "requestId": "req-abc123"  // For support correlation
}
```

**Common Error Codes**:

| Code | Status | Meaning |
|------|--------|---------|
| NO_TOKEN | 401 | Authorization header missing |
| INVALID_TOKEN | 401 | Token expired or invalid |
| TENANT_SUSPENDED | 403 | Account suspended |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit hit |
| INTERNAL_ERROR | 500 | Server error |

---

## 5. Troubleshooting Procedures

### 5.1 Authentication Issues

#### Issue: "Invalid or expired token"

**Diagnosis**:
1. Check token expiration (15 min for access tokens)
2. Verify token is being sent correctly
3. Check for clock skew

**Resolution**:
```bash
# Decode token to check expiration
echo $ACCESS_TOKEN | cut -d. -f2 | base64 -d | jq .exp

# Compare with current time
date +%s
```

#### Issue: "TENANT_SUSPENDED"

**Diagnosis**:
1. Check tenant status in database
2. Review audit logs for suspension reason

**Resolution**:
1. Contact customer success for suspension reason
2. Resolve underlying issue (payment, policy, etc.)
3. Update tenant status: `UPDATE tenants SET status = 'active' WHERE id = '<tenant-id>'`
4. Clear tenant status cache (automatic after 5 minutes, or restart)

### 5.2 Rate Limiting Issues

#### Issue: "Rate limit exceeded"

**Diagnosis**:
1. Check `X-RateLimit-*` headers
2. Review request patterns

**Resolution**:
1. Implement exponential backoff
2. Batch requests where possible
3. Contact support if legitimate usage exceeds limits

### 5.3 Data Access Issues

#### Issue: "Resource not found" for existing data

**Diagnosis**:
1. Verify resource exists in database
2. Check tenant isolation (data may belong to different tenant)

**Resolution**:
```sql
-- Verify resource tenant ownership
SELECT tenant_id FROM quotations WHERE id = '<resource-id>';
-- Compare with user's tenant_id
```

---

## 6. Monitoring and Alerting

### 6.1 Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Auth failure rate | > 10/min | P1 |
| 5xx error rate | > 1% | P1 |
| P95 latency | > 2s | P2 |
| Rate limit hits | > 80% of limit | P3 |

### 6.2 Log Correlation

All requests include a `requestId` for tracing:

**Log Format**:
```
[METRICS] requestId=abc123 request_duration_ms=45 method=GET path=/api/quotations status=200
```

**To trace a request**:
```bash
# Search logs by requestId
grep "requestId=abc123" /var/log/cutlistcreator/*.log
```

---

## 7. Integration Testing Checklist

### 7.1 Pre-Production Testing

| Test | Expected | Pass |
|------|----------|------|
| Login with valid credentials | 200 + tokens | ☐ |
| Login with invalid credentials | 401 | ☐ |
| API call without token | 401 | ☐ |
| API call with expired token | 401 | ☐ |
| Token refresh | 200 + new tokens | ☐ |
| Rate limit enforcement | 429 after limit | ☐ |
| Cross-tenant access | 403 | ☐ |

### 7.2 Production Validation

| Validation | Method |
|------------|--------|
| End-to-end login flow | Manual test |
| Rate limit headers present | Inspect response |
| Audit logs generated | Query audit_logs table |
| Error responses formatted | Inspect 4xx responses |

---

## 8. Contact and Escalation

### 8.1 Support Contacts

| Issue Type | Contact | SLA |
|------------|---------|-----|
| Authentication issues | support@cutlistcreator.com | 4 hours |
| Rate limit adjustment | support@cutlistcreator.com | 24 hours |
| API errors | support@cutlistcreator.com | 4 hours |
| Security concerns | security@cutlistcreator.com | 1 hour |

### 8.2 When to Escalate

Escalate to engineering if:
- Multiple customers report same issue
- Error rate exceeds 5%
- Authentication system unresponsive
- Data integrity concern

---

## 9. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Customer Success | __________ | __________ |

