# Change Approval Checklist

## Purpose
This checklist ensures all production changes are properly reviewed, tested, and approved before deployment.

---

## 1. Change Classification

### Change Type (select one)
- [ ] **Standard**: Routine, pre-approved change (e.g., minor config update)
- [ ] **Normal**: Requires standard review and approval
- [ ] **Emergency**: Urgent fix for active incident (expedited approval)

### Change Category (select all that apply)
- [ ] Application code
- [ ] Database schema
- [ ] Configuration/Environment
- [ ] Infrastructure
- [ ] Dependencies
- [ ] Security-related

### Risk Level
| Risk | Criteria | Approval Required |
|------|----------|-------------------|
| Low | No user impact, easily reversible | Peer review |
| Medium | Minor user impact, reversible | Tech Lead |
| High | Significant impact, complex rollback | Engineering Manager |
| Critical | Data risk, security, or compliance | VP Engineering |

---

## 2. Pre-Deployment Checklist

### Code Quality
- [ ] Code reviewed and approved by at least 1 reviewer
- [ ] All automated tests pass (CI green)
- [ ] No new TypeScript errors introduced
- [ ] No new security vulnerabilities introduced
- [ ] Code follows project conventions

### Testing
- [ ] Unit tests added/updated for changes
- [ ] Integration tests pass
- [ ] Manual testing completed in development
- [ ] Edge cases considered and tested

### Documentation
- [ ] Code comments updated if needed
- [ ] API documentation updated if endpoints changed
- [ ] Runbooks updated if operational procedures affected
- [ ] README updated if setup/configuration changed

### Database Changes (if applicable)
- [ ] Migration tested in development
- [ ] Migration is reversible (rollback plan exists)
- [ ] No destructive changes to existing data
- [ ] Performance impact assessed
- [ ] Backup verified before migration

### Security (if applicable)
- [ ] Security review completed for sensitive changes
- [ ] No secrets/credentials in code
- [ ] Input validation implemented
- [ ] Authentication/authorization maintained

---

## 3. Deployment Readiness

### Environment
- [ ] Target environment identified (staging/production)
- [ ] Environment variables configured
- [ ] Feature flags set appropriately

### Monitoring
- [ ] Relevant alerts are active
- [ ] Dashboard reflects new metrics (if applicable)
- [ ] Log queries prepared for verification

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Rollback tested or validated
- [ ] Rollback decision criteria defined
- [ ] Rollback owner identified

---

## 4. Approval Matrix

### Standard Changes
```
Peer Review → Deploy
(No additional approval needed)
```

### Normal Changes
```
Peer Review → Tech Lead Approval → Deploy
```

### High-Risk Changes
```
Peer Review → Tech Lead → Engineering Manager → Deploy
```

### Emergency Changes
```
Verbal Approval → Deploy → Post-Deployment Review (within 24h)
```

---

## 5. Approval Record

### Change Details
| Field | Value |
|-------|-------|
| Change ID | CHG-YYYY-MM-DD-XXX |
| Title | [Brief description] |
| PR/Commit | [Link] |
| Author | @[name] |
| Date | YYYY-MM-DD |

### Approvals

| Role | Name | Date | Status |
|------|------|------|--------|
| Code Reviewer | | | ☐ Approved |
| Tech Lead | | | ☐ Approved |
| Engineering Manager | | | ☐ Approved (if required) |
| Security Review | | | ☐ Approved (if required) |

### Approval Notes
```
[Any conditions, concerns, or special instructions]
```

---

## 6. Deployment Execution

### Pre-Deployment
- [ ] All approvals obtained
- [ ] Team notified in #deployments
- [ ] Monitoring dashboards open
- [ ] Rollback procedure ready

### During Deployment
- [ ] Deployment initiated
- [ ] Deployment progress monitored
- [ ] Health endpoints verified
- [ ] Key functionality smoke tested

### Post-Deployment
- [ ] Service health confirmed
- [ ] Error rates normal
- [ ] No unexpected logs/alerts
- [ ] Deployment announced as complete

---

## 7. Post-Deployment Verification

### Health Checks
```bash
# Verify health endpoints
curl -s https://[production-url]/api/health | jq .
curl -s https://[production-url]/api/health/ready | jq .
```

### Functional Verification
- [ ] Key user flows tested
- [ ] New functionality verified (if applicable)
- [ ] No regression in existing features

### Monitoring Verification
- [ ] Error rate stable
- [ ] Latency within SLO
- [ ] No new alert triggers

---

## 8. Emergency Change Protocol

### When to Use
- Active P0 incident
- Security vulnerability being actively exploited
- Data integrity issue requiring immediate fix

### Expedited Process
1. **Verbal approval** from on-call Engineering Manager
2. **Deploy** with minimal testing (fix must be targeted)
3. **Document** approval within 2 hours
4. **Full review** within 24 hours
5. **RCA** if emergency was preventable

### Emergency Approval Record
| Field | Value |
|-------|-------|
| Incident ID | [If applicable] |
| Verbal Approver | [Name] |
| Approval Time | YYYY-MM-DD HH:MM |
| Reason for Emergency | [Brief explanation] |

---

## 9. Change Freeze Considerations

### Check Before Proceeding
- [ ] No active release freeze (check #releases channel)
- [ ] Error budget allows deployment (check SLO dashboard)
- [ ] No conflicting deployments in progress

### If Freeze is Active
1. Verify change qualifies for freeze exception
2. Obtain freeze override approval (see SLO_ERROR_BUDGET_POLICY.md)
3. Document override in this checklist
4. Proceed with heightened monitoring

---

## 10. Quick Reference

### Approval Contacts
| Role | Contact |
|------|---------|
| Tech Lead | @[name] |
| Engineering Manager | @[name] |
| VP Engineering | @[name] |
| Security Lead | @[name] |

### Key Channels
- #deployments - Deployment announcements
- #releases - Release coordination
- #incidents - Active incidents

### Related Documents
- [SLO_ERROR_BUDGET_POLICY.md](./SLO_ERROR_BUDGET_POLICY.md)
- [INCIDENT_COMMAND_RUNBOOK.md](./INCIDENT_COMMAND_RUNBOOK.md)
- [Operational Runbook](../operational-runbook.md)
