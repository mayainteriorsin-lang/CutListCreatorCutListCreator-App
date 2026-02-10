# Enterprise Customer Operations Playbook

## Document Version: 1.0
## Effective Date: 2026-02-05

---

## 1. Purpose

Define the end-to-end operational procedures for managing enterprise customer lifecycle from initial onboarding through renewal, ensuring consistent service delivery and customer success.

---

## 2. Customer Lifecycle Overview

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   PRE-SALES  │──▶│  ONBOARDING  │──▶│  OPERATIONS  │──▶│   RENEWAL    │
│              │   │              │   │              │   │              │
│ • Discovery  │   │ • Provision  │   │ • Support    │   │ • Review     │
│ • Qualify    │   │ • Configure  │   │ • Monitor    │   │ • Negotiate  │
│ • Proposal   │   │ • Train      │   │ • Optimize   │   │ • Extend     │
│ • Contract   │   │ • Go-Live    │   │ • Expand     │   │ • Upsell     │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## 3. Pre-Sales Operations

### 3.1 Discovery Phase

**Owner**: Sales Lead
**Duration**: 1-2 weeks

| Task | Deliverable | Owner |
|------|-------------|-------|
| Initial call | Meeting notes | Sales |
| Requirements gathering | Requirements doc | Sales |
| Technical assessment | Fit analysis | Engineering |
| Security questionnaire | Completed questionnaire | Security |

### 3.2 Qualification Checklist

```markdown
## Enterprise Customer Qualification Checklist

### Fit Assessment
- [ ] Use case aligns with product capabilities
- [ ] User count within plan limits
- [ ] Technical requirements achievable
- [ ] Timeline is reasonable

### Commercial Assessment
- [ ] Budget authority confirmed
- [ ] Decision-maker identified
- [ ] Purchase timeline known
- [ ] Competitive situation understood

### Technical Assessment
- [ ] Authentication requirements (SSO status: NOT AVAILABLE until Q2 2026)
- [ ] Integration requirements documented
- [ ] Data residency acceptable (US only)
- [ ] Security requirements reviewable
```

### 3.3 Proposal Generation

| Component | Template | Owner |
|-----------|----------|-------|
| Executive summary | `templates/exec-summary.md` | Sales |
| Technical architecture | `templates/tech-arch.md` | Engineering |
| Pricing | Standard enterprise pricing | Sales |
| SLA | Standard enterprise SLA | Legal |
| Timeline | Implementation timeline | Customer Success |

---

## 4. Onboarding Operations

### 4.1 Onboarding Process

**Duration**: 2-4 weeks (depending on complexity)

```
Week 1: Provisioning
├── Contract signed ✓
├── Tenant created
├── Admin users created
└── Initial configuration

Week 2: Configuration
├── Custom settings applied
├── User provisioning
├── Integration setup (if applicable)
└── Data migration (if applicable)

Week 3: Training
├── Admin training session
├── End-user training
├── Documentation provided
└── Support process explained

Week 4: Go-Live
├── Final verification
├── Go-live confirmation
├── Hypercare period starts
└── Success metrics defined
```

### 4.2 Onboarding Kickoff Agenda

**Meeting**: 60 minutes
**Attendees**: Customer stakeholders, Customer Success, Engineering (optional)

| Time | Topic | Owner |
|------|-------|-------|
| 0-10 | Introductions & objectives | Customer Success |
| 10-25 | Product overview | Customer Success |
| 25-40 | Implementation plan review | Customer Success |
| 40-50 | Timeline & milestones | Customer Success |
| 50-60 | Q&A & next steps | All |

### 4.3 Provisioning Procedure

**Reference**: [TENANT_LIFECYCLE_AUTOMATION_PLAYBOOK.md](TENANT_LIFECYCLE_AUTOMATION_PLAYBOOK.md)

| Step | Action | Owner | Verification |
|------|--------|-------|--------------|
| 1 | Create tenant record | Engineering | SQL verification |
| 2 | Set plan to 'enterprise' | Engineering | Plan = 'enterprise' |
| 3 | Create admin user | Engineering | Can log in |
| 4 | Configure rate limits | Engineering | Headers verified |
| 5 | Send welcome email | Customer Success | Delivery confirmed |

### 4.4 Training Curriculum

| Session | Duration | Audience | Content |
|---------|----------|----------|---------|
| Admin fundamentals | 60 min | Admins | User management, settings |
| End-user basics | 45 min | All users | Core workflows |
| Advanced features | 45 min | Power users | Optimization, exports |
| API/Integration | 60 min | Technical | API usage, best practices |

### 4.5 Go-Live Checklist

```markdown
## Go-Live Readiness Checklist

### Technical Readiness
- [ ] All users provisioned
- [ ] Admin can access all features
- [ ] Test transactions successful
- [ ] Performance acceptable
- [ ] Integration verified (if applicable)

### Operational Readiness
- [ ] Support contacts known
- [ ] Escalation path documented
- [ ] SLA terms understood
- [ ] Emergency procedures shared

### Training Completion
- [ ] Admin training completed
- [ ] User training completed
- [ ] Documentation delivered
- [ ] FAQ/troubleshooting shared

### Sign-Off
- [ ] Customer confirms ready
- [ ] Internal team confirms ready
- [ ] Go-live date agreed
```

---

## 5. Operations Phase

### 5.1 Ongoing Support Model

| Support Tier | Response SLA | Resolution SLA | Channel |
|--------------|--------------|----------------|---------|
| P1 (Critical) | 1 hour | 4 hours | Phone/Email |
| P2 (High) | 4 hours | 24 hours | Email/Portal |
| P3 (Medium) | 24 hours | 72 hours | Email/Portal |
| P4 (Low) | 48 hours | 1 week | Email/Portal |

### 5.2 Customer Health Monitoring

**Frequency**: Monthly

| Metric | Healthy | At Risk | Critical |
|--------|---------|---------|----------|
| Login frequency | Daily | Weekly | < Monthly |
| Feature usage | > 5 features | 2-5 features | < 2 features |
| Support tickets | < 3/month | 3-10/month | > 10/month |
| NPS/CSAT | > 8 | 6-8 | < 6 |

### 5.3 Monthly Customer Review

**Owner**: Customer Success
**Duration**: 30 minutes

| Agenda Item | Time | Focus |
|-------------|------|-------|
| Health metrics review | 5 min | Usage, tickets, satisfaction |
| Open issues status | 10 min | Outstanding items |
| Upcoming changes | 5 min | Releases, maintenance |
| Customer feedback | 5 min | Concerns, requests |
| Action items | 5 min | Next steps |

### 5.4 Quarterly Business Review (QBR)

**Owner**: Customer Success + Account Executive
**Duration**: 60 minutes

| Section | Time | Content |
|---------|------|---------|
| Executive summary | 10 min | Relationship overview |
| Value delivered | 15 min | ROI, metrics, achievements |
| Product roadmap | 15 min | Upcoming features, SSO timeline |
| Success planning | 10 min | Next quarter objectives |
| Strategic discussion | 10 min | Expansion, renewal preview |

---

## 6. Escalation Management

### 6.1 Escalation Path

```
┌─────────────────┐
│ Customer Issue  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Support Tier 1  │ ◀── Standard support
└────────┬────────┘
         ▼ (SLA breach or P1)
┌─────────────────┐
│ Customer Success│ ◀── Relationship owner
└────────┬────────┘
         ▼ (Unresolved 24h)
┌─────────────────┐
│ Engineering Lead│ ◀── Technical escalation
└────────┬────────┘
         ▼ (Customer request or critical)
┌─────────────────┐
│     CTO         │ ◀── Executive escalation
└────────┬────────┘
         ▼ (Contract/legal/strategic)
┌─────────────────┐
│     CEO         │
└─────────────────┘
```

### 6.2 Escalation Triggers

| Trigger | Escalate To | Action |
|---------|-------------|--------|
| SLA breach imminent | Customer Success | Prioritize resolution |
| Customer threatens churn | Account Executive | Executive involvement |
| Security incident | CTO | Incident response |
| Data breach | CEO + Legal | Crisis management |
| Feature blocker | Product Lead | Roadmap discussion |

---

## 7. Expansion and Upsell

### 7.1 Expansion Indicators

| Signal | Action | Owner |
|--------|--------|-------|
| Hitting user limits | Propose upgrade | Customer Success |
| New department interested | Expansion meeting | Account Executive |
| Feature requests | Product discussion | Customer Success |
| Positive QBR feedback | Expansion proposal | Account Executive |

### 7.2 Expansion Playbook

1. **Identify** expansion opportunity from signals
2. **Qualify** with stakeholder mapping
3. **Propose** expanded scope/pricing
4. **Negotiate** commercial terms
5. **Execute** provisioning of additional capacity
6. **Onboard** new users/departments

---

## 8. Renewal Operations

### 8.1 Renewal Timeline

| Milestone | When | Owner | Action |
|-----------|------|-------|--------|
| Health assessment | -90 days | Customer Success | Review metrics |
| Renewal kickoff | -60 days | Account Executive | Initial conversation |
| Proposal delivery | -45 days | Account Executive | Renewal terms |
| Negotiation | -30 days | Account Executive | Final terms |
| Contract execution | -14 days | Legal | Sign documents |
| Renewal complete | 0 days | Customer Success | Confirm renewal |

### 8.2 Renewal Risk Assessment

```markdown
## Renewal Risk Assessment

### Customer: _____________ Renewal Date: _____________

### Health Score: [ ] Healthy [ ] At Risk [ ] Critical

### Risk Factors
- [ ] Low usage (< 30% capacity)
- [ ] High support tickets
- [ ] Negative feedback in QBR
- [ ] Champion left organization
- [ ] Competitive evaluation underway
- [ ] Budget concerns expressed
- [ ] Requesting features on roadmap

### Mitigation Actions
| Risk | Action | Owner | Due Date |
|------|--------|-------|----------|
|      |        |       |          |

### Renewal Probability: ____%
```

### 8.3 Renewal Pricing

| Scenario | Approach |
|----------|----------|
| Standard renewal | Current rate + inflation adjustment |
| Expansion | Volume discount applied |
| At-risk | Retention pricing with success plan |
| Multi-year | Annual discount for commitment |

---

## 9. Offboarding (If Required)

### 9.1 Offboarding Triggers

| Trigger | Grace Period | Process |
|---------|--------------|---------|
| Non-renewal | 30 days | Standard offboarding |
| Non-payment | 60 days | Collection + offboarding |
| Customer request | 30 days | Immediate start |
| Terms violation | 0 days | Immediate suspension |

### 9.2 Offboarding Procedure

**Reference**: [TENANT_LIFECYCLE_AUTOMATION_PLAYBOOK.md](TENANT_LIFECYCLE_AUTOMATION_PLAYBOOK.md)

1. **Notification**: Inform customer of offboarding timeline
2. **Data Export**: Provide data export (per GDPR)
3. **Grace Period**: 30-day access for transition
4. **Suspension**: Disable access, retain data
5. **Deletion**: After retention period (90 days)
6. **Confirmation**: Document completion

---

## 10. Customer Communication Templates

### 10.1 Welcome Email

```markdown
Subject: Welcome to CutListCreator Enterprise!

Dear [Customer Name],

Welcome to CutListCreator! We're excited to have [Company] join our enterprise community.

Your account is now active:
- Admin login: [email]
- Temporary password: [sent separately]
- First login: https://app.cutlistcreator.com

Next Steps:
1. Log in and change your password
2. Schedule your onboarding session: [calendar link]
3. Review the getting started guide: [link]

Your Customer Success Manager, [CSM Name], will be in touch within 24 hours.

Best regards,
CutListCreator Team
```

### 10.2 QBR Invitation

```markdown
Subject: Quarterly Business Review - [Company] + CutListCreator

Dear [Customer Name],

It's time for our quarterly business review! I'd like to schedule 60 minutes to:

- Review your success metrics
- Discuss product updates and roadmap
- Plan for the upcoming quarter
- Address any concerns or opportunities

Please select a time: [calendar link]

I'll send an agenda and data ahead of our meeting.

Best regards,
[CSM Name]
```

---

## 11. Success Metrics

### 11.1 Customer Success KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first value | < 7 days | Onboarding tracking |
| NPS | > 50 | Quarterly survey |
| Gross retention | > 90% | ARR retained |
| Net retention | > 110% | ARR including expansion |
| Support satisfaction | > 90% | Post-ticket survey |

### 11.2 Operational KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion | 100% in 4 weeks | Milestone tracking |
| QBR completion | 100% quarterly | Meeting log |
| Health check completion | 100% monthly | CRM tracking |
| Renewal rate | > 95% | Contract tracking |

---

## 12. Approval

| Role | Name | Date |
|------|------|------|
| Customer Success Lead | __________ | __________ |
| Sales Lead | __________ | __________ |
| CTO | __________ | __________ |

