# Data Residency & Regional Policy

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Define data residency policies, regional deployment strategy, and cross-border data transfer requirements.

---

## 2. Current Deployment Architecture

### 2.1 Infrastructure Location

| Component | Provider | Region | Data Center |
|-----------|----------|--------|-------------|
| Application | Render | US (Oregon) | AWS us-west-2 |
| Database | Neon | US | AWS us-east |
| Backups | Neon | US | Neon-managed |
| DNS | TBD | Global | Anycast |

### 2.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    United States                         │
│  ┌─────────────┐         ┌─────────────────────────┐   │
│  │   Render    │◀───────▶│   Neon PostgreSQL      │   │
│  │   US-West   │         │   US-East              │   │
│  │ (Oregon)    │         │                        │   │
│  └─────────────┘         └─────────────────────────┘   │
│         ▲                                              │
│         │                                              │
└─────────┼──────────────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │   Users   │  (Global access via internet)
    │ Worldwide │
    └───────────┘
```

---

## 3. Data Classification

### 3.1 Data Categories

| Category | Description | Residency Requirement |
|----------|-------------|----------------------|
| **User PII** | Name, email, IP address | May have regional requirements |
| **Business Data** | Projects, cuts, measurements | Customer-specific |
| **Credentials** | Password hashes, tokens | High security, regional possible |
| **Audit Logs** | User actions, timestamps | Compliance-specific |
| **System Data** | Configs, metrics | No residency requirement |

### 3.2 Data Storage by Category

| Data | Table | Current Location | Residency Control |
|------|-------|------------------|-------------------|
| User profiles | users | US | 🔴 None |
| Tenant info | tenants | US | 🔴 None |
| Audit logs | audit_logs | US | 🔴 None |
| Projects | projects | US | 🔴 None |
| Uploaded files | filesystem | US | 🔴 None |

---

## 4. Regional Compliance Requirements

### 4.1 GDPR (European Union)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Data processing agreement | 🟡 PARTIAL | Template needed |
| SCCs for US transfer | 🔴 NOT READY | Not implemented |
| Data subject rights | 🔴 NOT READY | Export API needed |
| Right to be forgotten | 🔴 NOT READY | Delete workflow needed |
| EU data storage option | 🔴 NOT READY | Single US region |

### 4.2 Other Regional Requirements

| Region | Regulation | Status | Notes |
|--------|------------|--------|-------|
| California | CCPA | 🟡 PARTIAL | Similar to GDPR |
| Canada | PIPEDA | 🟡 PARTIAL | US-CA data flow allowed |
| UK | UK GDPR | 🔴 NOT READY | Same as EU GDPR |
| Australia | Privacy Act | 🟡 PARTIAL | US transfer allowed |
| Brazil | LGPD | 🔴 NOT READY | Similar to GDPR |

---

## 5. Data Residency Policy

### 5.1 Current Policy

**All customer data is stored in the United States.**

| Policy Item | Current State |
|-------------|---------------|
| Primary storage region | US |
| Backup storage region | US |
| Processing location | US |
| Support access location | US |
| Log storage location | US |

### 5.2 Data Transfer Basis

For customers outside the US, data transfer to the US is based on:

1. **Customer consent** (via Terms of Service)
2. **Standard Contractual Clauses** (for EU, if implemented)
3. **Legitimate business interest** (service delivery)

### 5.3 Enterprise Data Residency Options

| Option | Status | Availability |
|--------|--------|--------------|
| US data residency | ✅ Available | Default |
| EU data residency | 🔴 NOT AVAILABLE | Requires EU deployment |
| APAC data residency | 🔴 NOT AVAILABLE | Requires APAC deployment |
| Custom region | 🔴 NOT AVAILABLE | Requires dedicated deployment |

---

## 6. Multi-Region Roadmap

### 6.1 Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Global Load Balancer                     │
└─────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    US Region    │  │    EU Region    │  │   APAC Region   │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │   App     │  │  │  │   App     │  │  │  │   App     │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │   DB      │  │  │  │   DB      │  │  │  │   DB      │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 6.2 Implementation Timeline

| Milestone | Target | Status |
|-----------|--------|--------|
| US region (current) | Done | ✅ |
| EU region | Q3 2026 | 🔴 Not started |
| APAC region | Q4 2026 | 🔴 Not started |
| Region selection per tenant | Q3 2026 | 🔴 Not started |

### 6.3 Multi-Region Requirements

| Requirement | Complexity | Status |
|-------------|------------|--------|
| Regional Render deployments | Medium | 🔴 Not started |
| Regional Neon databases | Medium | 🔴 Not started |
| Tenant-to-region mapping | Medium | 🔴 Not started |
| Global load balancing | Medium | 🔴 Not started |
| Data isolation per region | High | 🔴 Not started |
| Cross-region admin access | Medium | 🔴 Not started |

---

## 7. Cross-Border Data Transfer

### 7.1 Current Transfers

| From | To | Data Types | Legal Basis |
|------|----|-----------|----|
| EU users | US | All user data | ToS consent, SCCs (planned) |
| UK users | US | All user data | ToS consent, SCCs (planned) |
| APAC users | US | All user data | ToS consent |
| Other | US | All user data | ToS consent |

### 7.2 Transfer Safeguards

| Safeguard | Status | Notes |
|-----------|--------|-------|
| Encryption in transit | ✅ IMPLEMENTED | TLS 1.2+ |
| Encryption at rest | ✅ IMPLEMENTED | Platform-managed |
| Access controls | ✅ IMPLEMENTED | RBAC |
| Audit logging | ✅ IMPLEMENTED | audit_logs table |
| SCCs for EU | 🔴 NOT IMPLEMENTED | Legal review needed |
| DPA template | 🔴 NOT IMPLEMENTED | Legal review needed |

---

## 8. Enterprise Customer Requirements

### 8.1 Common Enterprise Requests

| Requirement | Frequency | Current Response |
|-------------|-----------|------------------|
| Data stored in US | Common | ✅ Available |
| Data stored in EU | Common | 🔴 Not available |
| No cross-border transfer | Uncommon | 🔴 Not available |
| Dedicated infrastructure | Uncommon | 🔴 Not available |
| Data sovereignty guarantee | Common | 🔴 Not available |

### 8.2 Enterprise Data Residency Questionnaire

```markdown
## Data Residency Requirements

1. **Required data location**: [ ] US [ ] EU [ ] APAC [ ] Other: ____
2. **Cross-border transfer acceptable**: [ ] Yes [ ] No
3. **Regulatory requirements**: [ ] GDPR [ ] CCPA [ ] HIPAA [ ] Other: ____
4. **Data processing agreement required**: [ ] Yes [ ] No
5. **Dedicated infrastructure required**: [ ] Yes [ ] No
6. **Specific compliance certifications**: ____________________
```

---

## 9. Data Sovereignty Risks

### 9.1 Current Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| EU customer cannot use service | Medium | High | EU region roadmap |
| GDPR compliance issue | Medium | High | SCCs, DPA template |
| Enterprise deal blocked | High | High | Multi-region priority |
| Government data request (US) | Low | Medium | Legal process |

### 9.2 Risk Acceptance

| Risk | Accepted By | Expiry |
|------|-------------|--------|
| Single-region deployment | CTO | Q3 2026 |
| No EU data residency option | CTO | Q3 2026 |

---

## 10. Compliance Documentation

### 10.1 Required Documents

| Document | Status | Owner |
|----------|--------|-------|
| Privacy Policy | 🟡 EXISTS | Legal |
| Terms of Service | 🟡 EXISTS | Legal |
| Data Processing Agreement | 🔴 NOT READY | Legal |
| Standard Contractual Clauses | 🔴 NOT READY | Legal |
| Sub-processor list | 🔴 NOT READY | Legal |
| Data flow diagram | ✅ THIS DOCUMENT | Engineering |

### 10.2 Sub-Processors

| Sub-Processor | Service | Location | DPA |
|---------------|---------|----------|-----|
| Render | Hosting | US | Yes (via ToS) |
| Neon | Database | US | Yes (via ToS) |
| GitHub | Source control | US | Yes (via ToS) |

---

## 11. Policy Exceptions

### 11.1 Exception Process

For enterprise customers with strict data residency requirements:

1. **Document requirement** in sales process
2. **Evaluate feasibility** with engineering
3. **Approve exception** (CTO required)
4. **Implement workaround** or **decline deal**

### 11.2 Current Exceptions

| Customer | Requirement | Resolution | Expiry |
|----------|-------------|------------|--------|
| (None currently) | | | |

---

## 12. Action Items

| Action | Owner | Target Date |
|--------|-------|-------------|
| Create DPA template | Legal | Q1 2026 |
| Implement SCCs | Legal | Q2 2026 |
| Plan EU region deployment | DevOps | Q2 2026 |
| Implement tenant-region mapping | Backend | Q3 2026 |
| Deploy EU region | DevOps | Q3 2026 |

---

## 13. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Legal/Compliance | __________ | __________ |
| CTO | __________ | __________ |
