# Enterprise Onboarding Runbook

## Document Version: 1.0
## Effective Date: 2026-02-03

---

## 1. Purpose

Step-by-step procedures for onboarding enterprise customers with custom requirements including SSO, SCIM, and custom configurations.

---

## 2. Onboarding Overview

### 2.1 Enterprise Onboarding Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Pre-Sales Technical | 1-2 weeks | Sales Engineering |
| Contract & Legal | 1-4 weeks | Legal |
| Technical Setup | 1-2 weeks | Engineering |
| Validation | 3-5 days | Joint |
| Go-Live | 1 day | Engineering |
| Hypercare | 2 weeks | Customer Success |

### 2.2 Onboarding Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│Pre-Sales │──▶│ Contract │──▶│Technical │──▶│Validation│──▶│ Go-Live  │
│Technical │   │ & Legal  │   │  Setup   │   │          │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## 3. Pre-Onboarding Checklist

### 3.1 Sales Handoff Requirements

```markdown
## Sales-to-Engineering Handoff Checklist

### Customer Information
- [ ] Company name: _________________
- [ ] Primary contact: _________________
- [ ] Technical contact: _________________
- [ ] Contract start date: _________________
- [ ] Expected go-live date: _________________

### Commercial Terms
- [ ] Plan: [ ] Professional [ ] Enterprise [ ] Custom
- [ ] User count: _________________
- [ ] Contract term: _________________
- [ ] SLA tier: _________________

### Technical Requirements
- [ ] SSO required: [ ] Yes [ ] No
  - [ ] Provider: [ ] SAML [ ] OIDC
  - [ ] IdP: _________________
- [ ] SCIM required: [ ] Yes [ ] No
- [ ] API access required: [ ] Yes [ ] No
- [ ] Webhooks required: [ ] Yes [ ] No
- [ ] Custom integrations: _________________

### Compliance Requirements
- [ ] Data residency: [ ] US [ ] EU [ ] Other: ____
- [ ] Security questionnaire completed: [ ] Yes [ ] No
- [ ] DPA required: [ ] Yes [ ] No
- [ ] Compliance certifications needed: _________________

### Special Considerations
- [ ] Notes: _________________
```

### 3.2 Technical Discovery

| Item | Required Info | Collected |
|------|---------------|-----------|
| User volume | Expected users, growth | [ ] |
| Data volume | Storage needs | [ ] |
| Integration points | Systems to integrate | [ ] |
| Security requirements | MFA, IP restrictions | [ ] |
| Network requirements | Firewall, proxy | [ ] |

---

## 4. Technical Setup Procedures

### 4.1 Tenant Provisioning

```markdown
## Tenant Provisioning Procedure

### Prerequisites
- Sales handoff complete
- Contract signed
- Technical requirements documented

### Step 1: Create Tenant

**Database Operation:**
```sql
INSERT INTO tenants (name, slug, plan, status, settings)
VALUES (
  'Enterprise Customer Name',
  'enterprise-customer-slug',
  'enterprise',
  'active',
  '{
    "features": {
      "sso": true,
      "scim": false,
      "api_access": true
    },
    "limits": {
      "users": 1000,
      "api_calls_per_15min": 50000
    }
  }'
)
RETURNING id;
```

### Step 2: Create Admin User

```sql
-- Note: Password should be temporary, force change on first login
INSERT INTO users (email, password_hash, full_name, role, tenant_id)
VALUES (
  'admin@customer.com',
  '[bcrypt hash of temporary password]',
  'Admin User',
  'admin',
  '[tenant-id-from-step-1]'
);
```

### Step 3: Configure Plan Settings
- [ ] Set appropriate rate limits
- [ ] Enable/disable features per contract
- [ ] Configure storage limits

### Step 4: Verify Setup
- [ ] Admin can log in
- [ ] Tenant settings correct
- [ ] Features enabled per contract
```

### 4.2 SSO Configuration (When Available)

```markdown
## SSO Configuration Procedure (GAP - NOT YET AVAILABLE)

### Prerequisites
- SSO implementation complete
- Customer IdP details received
- Test user account available

### SAML Configuration Steps
1. [ ] Receive IdP metadata from customer
2. [ ] Import IdP metadata into system
3. [ ] Configure attribute mapping
4. [ ] Generate and share SP metadata
5. [ ] Customer configures their IdP
6. [ ] Test SSO login with test user
7. [ ] Enable SSO for tenant
8. [ ] Disable password auth (optional)

### OIDC Configuration Steps
1. [ ] Receive OIDC configuration from customer
2. [ ] Configure client_id and client_secret
3. [ ] Configure scopes and claims
4. [ ] Test OIDC login
5. [ ] Enable OIDC for tenant

### Verification
- [ ] SSO login successful
- [ ] User attributes mapped correctly
- [ ] JIT provisioning works (if enabled)
- [ ] Logout works correctly
```

### 4.3 SCIM Configuration (When Available)

```markdown
## SCIM Configuration Procedure (GAP - NOT YET AVAILABLE)

### Prerequisites
- SCIM implementation complete
- Customer directory configured
- Test sync available

### Configuration Steps
1. [ ] Generate SCIM bearer token
2. [ ] Provide SCIM endpoint URL
3. [ ] Configure attribute mapping
4. [ ] Customer configures SCIM connector
5. [ ] Test user sync
6. [ ] Test group sync
7. [ ] Enable production sync

### Verification
- [ ] User creation via SCIM works
- [ ] User update via SCIM works
- [ ] User deactivation via SCIM works
- [ ] Group sync works (if configured)
```

---

## 5. Validation Procedures

### 5.1 Technical Validation Checklist

```markdown
## Technical Validation Checklist

### Authentication
- [ ] Admin login works
- [ ] SSO login works (if configured)
- [ ] Password reset works
- [ ] Session timeout correct

### Authorization
- [ ] Admin has full access
- [ ] Users have appropriate access
- [ ] Tenant isolation verified

### Features
- [ ] Core features accessible
- [ ] Enterprise features enabled
- [ ] Integrations working

### Performance
- [ ] Response times acceptable
- [ ] No errors in basic operations
- [ ] Rate limits appropriate

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Audit logging active
```

### 5.2 User Acceptance Testing

```markdown
## UAT Checklist

### Core Workflows
- [ ] User can create projects
- [ ] User can edit projects
- [ ] User can export results
- [ ] User can manage settings

### Enterprise Features
- [ ] SSO login works for all users
- [ ] Role assignments correct
- [ ] Integrations functional

### Sign-Off
Customer Technical Contact: __________ Date: __________
CutListCreator Engineering: __________ Date: __________
```

---

## 6. Go-Live Procedures

### 6.1 Go-Live Checklist

```markdown
## Go-Live Checklist

### Pre-Go-Live (T-1 day)
- [ ] All technical validation complete
- [ ] UAT signed off
- [ ] Support contacts exchanged
- [ ] Escalation path documented
- [ ] Monitoring configured

### Go-Live Day
- [ ] Final health check
- [ ] Enable production access
- [ ] Communicate go-live to customer
- [ ] Monitor for first hour
- [ ] Address any immediate issues

### Post-Go-Live (T+1 day)
- [ ] Review overnight metrics
- [ ] Check for error patterns
- [ ] Confirm user adoption starting
- [ ] Schedule hypercare check-ins
```

### 6.2 Go-Live Communication

```markdown
## Go-Live Email Template

Subject: CutListCreator Go-Live Complete - [Customer Name]

Dear [Customer Contact],

I'm pleased to confirm that CutListCreator is now live for [Customer Name].

**Access Details:**
- URL: https://app.cutlist.pro
- Login: [SSO / Email+Password]

**Support:**
- Email: support@cutlist.pro
- Response time: [per SLA tier]
- Escalation: [contact name]

**Next Steps:**
1. Begin user onboarding
2. Schedule 1-week check-in
3. Hypercare period: [dates]

Please don't hesitate to reach out with any questions.

Best regards,
[Your Name]
```

---

## 7. Hypercare Procedures

### 7.1 Hypercare Schedule

| Day | Activity | Owner |
|-----|----------|-------|
| Day 1-2 | Active monitoring, immediate support | Engineering |
| Day 3-5 | Daily check-ins, issue resolution | Customer Success |
| Week 2 | Bi-weekly check-ins, adoption review | Customer Success |
| Week 3+ | Standard support | Support |

### 7.2 Hypercare Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| Login success rate | >99% | <95% |
| Error rate | <0.1% | >1% |
| Response time p95 | <500ms | >1s |
| Support tickets | Trend | Spike |

### 7.3 Hypercare Check-In Template

```markdown
## Hypercare Check-In - [Date]

### Customer: [Name]
### Go-Live Date: [Date]
### Hypercare Day: [N]

### Metrics Summary
- Active users: ___
- Total logins: ___
- Error rate: ___%
- Support tickets: ___

### Issues Identified
1. [Issue description]
   - Status: [Open/Resolved]
   - Resolution: [Details]

### Customer Feedback
[Summary of feedback]

### Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]

### Next Check-In: [Date]
```

---

## 8. Rollback Procedures

### 8.1 When to Rollback

| Condition | Action |
|-----------|--------|
| Critical functionality broken | Rollback immediately |
| Security issue discovered | Rollback + investigate |
| Customer requests | Evaluate, discuss |
| Performance degradation | Investigate first |

### 8.2 Rollback Procedure

```markdown
## Enterprise Customer Rollback

### Assessment
1. Identify the issue
2. Evaluate impact
3. Determine if rollback is appropriate
4. Get customer approval

### Execution
1. Notify customer of rollback
2. Disable SSO (if applicable)
3. Reset to previous configuration
4. Verify functionality
5. Communicate completion

### Post-Rollback
1. Root cause analysis
2. Remediation plan
3. Re-attempt timeline
4. Customer communication
```

---

## 9. Troubleshooting Guide

### 9.1 Common Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| SSO not working | Login redirect fails | Check IdP config, certificates |
| Users not syncing | SCIM users not appearing | Check SCIM token, mapping |
| Rate limited | 429 errors | Review limits, adjust if needed |
| Slow performance | High latency | Check resources, optimize queries |

### 9.2 Escalation Path

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | Support team | 4 hours |
| L2 | Engineering | 2 hours |
| L3 | Engineering Lead | 1 hour |
| P0 | CTO | 30 minutes |

---

## 10. Documentation Handoff

### 10.1 Customer Documentation Package

| Document | Status | Notes |
|----------|--------|-------|
| User guide | 🟡 PARTIAL | Basic guide available |
| Admin guide | 🔴 NOT READY | Enterprise admin guide needed |
| SSO setup guide | 🔴 NOT READY | Pending SSO implementation |
| API documentation | 🔴 NOT READY | API docs needed |
| Integration guide | 🔴 NOT READY | Pending integrations |

### 10.2 Internal Documentation

| Document | Owner | Location |
|----------|-------|----------|
| Customer configuration | Engineering | Internal wiki |
| Incident history | Support | Ticket system |
| Contract details | Legal | CRM |
| Technical notes | Engineering | Internal wiki |

---

## 11. Contacts

### 11.1 Internal Contacts

| Role | Name | Email |
|------|------|-------|
| Engineering Lead | __________ | __________ |
| Customer Success | __________ | __________ |
| Support Lead | __________ | __________ |
| Security Lead | __________ | __________ |

### 11.2 Customer Contacts Template

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Executive Sponsor | | | |
| Technical Lead | | | |
| IT Admin | | | |
| Primary User | | | |

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Customer Success Lead | __________ | __________ |
| CTO | __________ | __________ |
