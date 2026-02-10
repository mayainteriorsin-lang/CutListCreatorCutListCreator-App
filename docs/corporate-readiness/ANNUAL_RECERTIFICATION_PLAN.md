# Annual Recertification Plan

## Document Version: 1.0
## Effective Date: 2026-02-05

---

## 1. Purpose

Define the annual cycle for maintaining enterprise certification readiness, including control reviews, evidence collection, audit preparation, and certification renewal activities.

---

## 2. Annual Certification Cycle

### 2.1 12-Month Certification Calendar

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ANNUAL CERTIFICATION CYCLE                          │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┤
│  JAN  │  FEB  │  MAR  │  APR  │  MAY  │  JUN  │  JUL  │  AUG  │  SEP  │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│Control│ Gap   │Remedn.│Remedn.│Remedn.│Pentest│ Intl  │ Audit │ Ext   │
│Invent.│Assess.│Plan   │Execute│Execute│       │ Audit │ Prep  │ Audit │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│  OCT  │  NOV  │  DEC  │
├───────┼───────┼───────┤
│ Cert  │ Post- │Annual │
│Renewal│ Audit │Plan   │
└───────┴───────┴───────┘
```

### 2.2 Phase Descriptions

| Phase | Months | Focus | Deliverables |
|-------|--------|-------|--------------|
| **Planning** | Jan-Feb | Inventory & assessment | Control list, gap register |
| **Remediation** | Mar-May | Fix gaps | Completed remediations |
| **Testing** | Jun-Jul | Internal validation | Pentest, internal audit |
| **Audit** | Aug-Sep | External audit | Audit report |
| **Renewal** | Oct | Certification | Certificate |
| **Improvement** | Nov-Dec | Planning | Annual plan |

---

## 3. Control Inventory (January)

### 3.1 Control Inventory Process

**Owner**: Security Lead
**Duration**: 2 weeks

| Task | Week | Deliverable |
|------|------|-------------|
| Extract current controls | 1 | Control spreadsheet |
| Validate against standards | 1 | Mapping document |
| Identify new requirements | 2 | Requirements list |
| Update control register | 2 | Updated register |

### 3.2 Control Inventory Template

| Control ID | Control Name | Category | Standard | Implementation Status | Last Tested |
|------------|--------------|----------|----------|----------------------|-------------|
| AUTH-001 | JWT Validation | Authentication | ISO 27001 A.9 | Implemented | Q4 2025 |
| AUTHZ-002 | Tenant Isolation | Authorization | SOC 2 CC6.1 | Implemented | Q4 2025 |
| ... | ... | ... | ... | ... | ... |

### 3.3 Standards Mapping

| Standard | Applicable? | Key Controls |
|----------|-------------|--------------|
| SOC 2 Type II | Future | CC1-CC9 |
| ISO 27001 | Future | Annex A controls |
| GDPR | Yes (EU data) | Art. 5, 25, 32 |
| HIPAA | Not applicable | N/A |

---

## 4. Gap Assessment (February)

### 4.1 Gap Assessment Process

**Owner**: Engineering Lead + Security Lead
**Duration**: 3 weeks

| Task | Week | Deliverable |
|------|------|-------------|
| Control effectiveness testing | 1-2 | Test results |
| Evidence availability check | 2 | Evidence inventory |
| Gap identification | 2-3 | Gap register |
| Remediation estimation | 3 | Effort estimates |

### 4.2 Gap Assessment Checklist

```markdown
## Control Gap Assessment Checklist

### For Each Control
- [ ] Control is documented
- [ ] Control is implemented
- [ ] Evidence is available
- [ ] Evidence is current (< 90 days)
- [ ] Control was tested in past year
- [ ] No known deficiencies

### Gap Classification
- [ ] Missing control (not implemented)
- [ ] Partial control (incomplete)
- [ ] Evidence gap (implemented but no proof)
- [ ] Testing gap (not validated)
- [ ] Documentation gap (not documented)
```

### 4.3 Gap Prioritization Matrix

| Gap Type | Audit Impact | Priority | Resolution SLA |
|----------|--------------|----------|----------------|
| Missing critical control | Fail | P0 | 30 days |
| Missing high control | Major finding | P1 | 60 days |
| Evidence gap | Minor finding | P2 | 30 days |
| Documentation gap | Observation | P3 | 90 days |

---

## 5. Remediation (March-May)

### 5.1 Remediation Planning

**Owner**: Engineering Lead
**Output**: Remediation project plan

| Element | Description |
|---------|-------------|
| Gap prioritization | Order by audit impact |
| Resource allocation | Sprint capacity |
| Dependencies | Blockers identified |
| Timeline | Week-by-week schedule |
| Verification | How to confirm complete |

### 5.2 Remediation Tracking

```markdown
## Remediation Status Report - [Month]

### Summary
- Total gaps: ___
- Closed this month: ___
- Remaining: ___
- On track: [ ] Yes [ ] No

### P0 Gaps (Critical)
| Gap ID | Description | Owner | Status | Due | Notes |
|--------|-------------|-------|--------|-----|-------|
| | | | | | |

### P1 Gaps (High)
| Gap ID | Description | Owner | Status | Due | Notes |
|--------|-------------|-------|--------|-----|-------|
| | | | | | |

### Blockers
| Issue | Impact | Resolution Plan |
|-------|--------|-----------------|
| | | |
```

### 5.3 Monthly Remediation Reviews

**Frequency**: Weekly during remediation phase
**Attendees**: Engineering Lead, Security Lead, affected teams

| Week | Focus |
|------|-------|
| Mar W1 | Kickoff, resource allocation |
| Mar W2-4 | Progress tracking |
| Apr W1-4 | Progress tracking |
| May W1-3 | Progress tracking |
| May W4 | Final verification |

---

## 6. Penetration Testing (June)

### 6.1 Pentest Scope

| Area | In Scope | Out of Scope |
|------|----------|--------------|
| External attack surface | ✅ | |
| Authentication/authorization | ✅ | |
| API security | ✅ | |
| Business logic | ✅ | |
| Third-party integrations | | ✅ (limited access) |
| Physical security | | ✅ (SaaS platform) |

### 6.2 Pentest Process

| Phase | Duration | Activities |
|-------|----------|------------|
| Scoping | 1 week | Define scope, rules of engagement |
| Testing | 2 weeks | Active testing by vendor |
| Reporting | 1 week | Findings report |
| Remediation | 2 weeks | Fix critical/high findings |
| Retest | 1 week | Verify fixes |

### 6.3 Pentest Report Review

| Finding Severity | Response SLA | Retest Required |
|------------------|--------------|-----------------|
| Critical | 7 days | Yes |
| High | 14 days | Yes |
| Medium | 30 days | Recommended |
| Low | 90 days | No |
| Informational | Best effort | No |

---

## 7. Internal Audit (July)

### 7.1 Internal Audit Scope

**Owner**: Security Lead (or Internal Audit if available)
**Duration**: 2 weeks

| Area | Audit Activities |
|------|------------------|
| Access management | Review user access, privilege |
| Change management | Review change records |
| Incident management | Review incident logs |
| Vendor management | Review vendor assessments |
| Control effectiveness | Sample testing |

### 7.2 Internal Audit Checklist

```markdown
## Internal Audit Checklist

### Access Management
- [ ] User list current
- [ ] Terminated users removed
- [ ] Privileged access justified
- [ ] Access reviews completed

### Change Management
- [ ] Changes authorized
- [ ] Changes tested
- [ ] Changes documented
- [ ] Emergency changes reviewed

### Incident Management
- [ ] Incidents logged
- [ ] Incidents investigated
- [ ] Root cause identified
- [ ] Corrective actions tracked

### Control Effectiveness
- [ ] Controls operating as designed
- [ ] Evidence available
- [ ] Exceptions documented
- [ ] Compensating controls in place
```

### 7.3 Internal Audit Report

| Section | Content |
|---------|---------|
| Executive summary | Key findings, overall assessment |
| Scope and methodology | What was reviewed, how |
| Findings | Issues identified, severity |
| Recommendations | Remediation actions |
| Management response | Action plan, timeline |

---

## 8. External Audit Preparation (August)

### 8.1 Audit Prep Checklist

```markdown
## External Audit Preparation Checklist

### 4 Weeks Before
- [ ] Confirm audit dates and scope
- [ ] Identify control owners
- [ ] Review internal audit findings
- [ ] Verify all remediations complete

### 2 Weeks Before
- [ ] Compile evidence packages
- [ ] Run validation scripts
- [ ] Brief control owners
- [ ] Prepare presentation materials

### 1 Week Before
- [ ] Stage evidence in accessible location
- [ ] Test auditor access
- [ ] Confirm availability of key personnel
- [ ] Prepare meeting rooms/calls

### Day Before
- [ ] Final evidence check
- [ ] Distribute audit schedule
- [ ] Confirm executive availability
- [ ] Prepare opening presentation
```

### 8.2 Evidence Package Preparation

| Package | Contents | Format |
|---------|----------|--------|
| Policy pack | All current policies | PDF |
| Control inventory | Control list with status | Excel |
| Evidence index | Mapping of controls to evidence | Excel |
| Test results | Recent test outputs | PDF/JSON |
| Meeting minutes | Governance meeting records | PDF |
| Incident log | Incident records for period | Excel |

### 8.3 Auditor Communication Plan

| Communication | When | Content |
|---------------|------|---------|
| Kickoff meeting | Day 1 | Scope, timeline, access |
| Daily standup | Daily | Progress, blockers |
| Finding discussion | As needed | Clarification |
| Exit meeting | Final day | Preliminary findings |
| Report review | +2 weeks | Management response |

---

## 9. External Audit (September)

### 9.1 Audit Execution Support

| Role | Responsibilities |
|------|------------------|
| Audit Coordinator | Point of contact, scheduling |
| Control Owners | Answer questions, provide evidence |
| IT Support | Technical access, systems |
| Executive Sponsor | Escalation, decisions |

### 9.2 During Audit Protocol

| Scenario | Action |
|----------|--------|
| Evidence request | Provide within 24 hours |
| Finding discussion | Schedule with control owner |
| Potential finding | Engage immediately |
| Escalation needed | Contact audit coordinator |
| Scope creep | Discuss with auditor lead |

### 9.3 Finding Response Process

1. **Receive** finding from auditor
2. **Validate** accuracy with control owner
3. **Assess** severity and impact
4. **Respond** with agreement or context
5. **Plan** remediation if required
6. **Document** management response

---

## 10. Certification Renewal (October)

### 10.1 Post-Audit Activities

| Activity | Timeline | Owner |
|----------|----------|-------|
| Receive final report | +2 weeks | Auditor |
| Submit management response | +1 week | CTO |
| Remediation plan | +1 week | Engineering Lead |
| Certificate issuance | +2 weeks | Auditor |
| Publish certificate | +1 day | Marketing |

### 10.2 Certificate Maintenance

| Item | Requirement | Frequency |
|------|-------------|-----------|
| Certificate display | Website, security page | Continuous |
| Certificate validity | 1 year | Annual renewal |
| Scope changes | Notify auditor | As needed |
| Material changes | May require re-audit | As needed |

---

## 11. Post-Audit Improvement (November)

### 11.1 Post-Audit Review

**When**: November, week 1-2
**Owner**: Security Lead

| Agenda | Time | Output |
|--------|------|--------|
| Audit outcome review | 30 min | Lessons learned |
| Finding analysis | 30 min | Root cause |
| Process improvement | 30 min | Action items |
| Next year planning | 30 min | Calendar |

### 11.2 Remediation Tracking

| Finding ID | Description | Owner | Due Date | Status |
|------------|-------------|-------|----------|--------|
| FINDING-001 | ... | ... | ... | ... |

---

## 12. Annual Planning (December)

### 12.1 Planning Activities

| Activity | Week | Output |
|----------|------|--------|
| Annual review | 1 | Year-end summary |
| Control refresh | 2 | Updated control list |
| Calendar planning | 3 | Next year calendar |
| Budget allocation | 4 | Audit budget |

### 12.2 Next Year Preparation

```markdown
## Next Year Certification Preparation

### Scope Review
- [ ] Standards applicable
- [ ] New requirements
- [ ] Scope changes

### Resource Planning
- [ ] Audit budget approved
- [ ] Pentest vendor selected
- [ ] Internal resources allocated

### Calendar
- [ ] Key dates scheduled
- [ ] Stakeholders notified
- [ ] Dependencies identified
```

---

## 13. Drill Schedule

### 13.1 Annual Drill Calendar

| Drill | Quarter | Duration | Owner |
|-------|---------|----------|-------|
| DR recovery drill | Q1 | 4 hours | Engineering Lead |
| Incident response drill | Q2 | 2 hours | On-Call Lead |
| Access review simulation | Q3 | 2 hours | Security Lead |
| Audit simulation | Q4 | 4 hours | Security Lead |

### 13.2 Drill Documentation

| Component | Requirement |
|-----------|-------------|
| Scenario | Documented before drill |
| Participants | Attendance tracked |
| Execution | Steps recorded |
| Results | Success/failure documented |
| Lessons | Improvements identified |
| Follow-up | Actions tracked |

---

## 14. Approval

| Role | Name | Date |
|------|------|------|
| Security Lead | __________ | __________ |
| Engineering Lead | __________ | __________ |
| CTO | __________ | __________ |

