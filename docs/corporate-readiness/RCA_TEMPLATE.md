# Root Cause Analysis (RCA) Template

## Incident Information

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-MM-DD-XXX |
| **Incident Title** | [Brief descriptive title] |
| **Severity** | P0 / P1 / P2 |
| **Date/Time Detected** | YYYY-MM-DD HH:MM UTC |
| **Date/Time Resolved** | YYYY-MM-DD HH:MM UTC |
| **Duration** | X hours Y minutes |
| **RCA Author** | [Name] |
| **RCA Date** | YYYY-MM-DD |

---

## 1. Executive Summary

*[2-3 sentences describing what happened, impact, and resolution]*

**Example**:
> On [date], users experienced [impact] for [duration] due to [brief cause]. The issue was resolved by [resolution]. [X] users were affected during the incident window.

---

## 2. Impact Assessment

### User Impact
| Metric | Value |
|--------|-------|
| Users affected | [number or percentage] |
| Requests failed | [number] |
| Revenue impact | [if applicable] |
| Data loss | None / [description] |

### Business Impact
- [ ] Customer-facing service degradation
- [ ] Internal tool unavailability
- [ ] Data integrity affected
- [ ] Security implications
- [ ] Compliance implications

---

## 3. Timeline

| Time (UTC) | Event | Actor |
|------------|-------|-------|
| HH:MM | [First symptom observed] | Automated alert |
| HH:MM | [Incident declared] | [Name] |
| HH:MM | [Investigation started] | [Name] |
| HH:MM | [Root cause identified] | [Name] |
| HH:MM | [Mitigation applied] | [Name] |
| HH:MM | [Service restored] | [Name] |
| HH:MM | [Incident closed] | [Name] |

---

## 4. Root Cause Analysis

### What Happened
*[Detailed technical description of the failure]*

### Why It Happened (5 Whys)

1. **Why did [symptom] occur?**
   - Because [cause 1]

2. **Why did [cause 1] happen?**
   - Because [cause 2]

3. **Why did [cause 2] happen?**
   - Because [cause 3]

4. **Why did [cause 3] happen?**
   - Because [cause 4]

5. **Why did [cause 4] happen?**
   - Because [root cause]

### Root Cause Statement
*[One clear sentence identifying the root cause]*

**Example**:
> The root cause was [specific technical issue] which occurred because [underlying reason].

---

## 5. Contributing Factors

| Factor | Description | Severity |
|--------|-------------|----------|
| [Factor 1] | [Description] | High/Medium/Low |
| [Factor 2] | [Description] | High/Medium/Low |
| [Factor 3] | [Description] | High/Medium/Low |

---

## 6. Detection & Response Analysis

### Detection
| Question | Answer |
|----------|--------|
| How was incident detected? | Alert / User report / Monitoring |
| Time to detect (TTD) | X minutes |
| Were alerts effective? | Yes / No / Partially |
| What should have alerted but didn't? | [Description or N/A] |

### Response
| Question | Answer |
|----------|--------|
| Time to acknowledge (TTA) | X minutes |
| Time to mitigate (TTM) | X minutes |
| Time to resolve (TTR) | X minutes |
| Was runbook followed? | Yes / No / Partially |
| Was escalation appropriate? | Yes / No |

---

## 7. Resolution

### Immediate Fix
*[What was done to restore service]*

### Permanent Fix
*[What will prevent recurrence - may be in action items if not yet done]*

---

## 8. Action Items

### Prevention (Stop this from happening again)

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | [Action description] | @name | P0/P1/P2 | YYYY-MM-DD | Open |
| 2 | [Action description] | @name | P0/P1/P2 | YYYY-MM-DD | Open |

### Detection (Catch it faster next time)

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | [Alert improvement] | @name | P1/P2 | YYYY-MM-DD | Open |
| 2 | [Monitoring addition] | @name | P1/P2 | YYYY-MM-DD | Open |

### Response (Handle it better next time)

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | [Runbook update] | @name | P2 | YYYY-MM-DD | Open |
| 2 | [Training/documentation] | @name | P2 | YYYY-MM-DD | Open |

---

## 9. Lessons Learned

### What Went Well
- [Positive observation 1]
- [Positive observation 2]

### What Could Be Improved
- [Improvement area 1]
- [Improvement area 2]

### Surprises
- [Unexpected finding 1]
- [Unexpected finding 2]

---

## 10. RCA Review

### Review Meeting
- **Date**: YYYY-MM-DD
- **Attendees**: [Names]
- **Duration**: X minutes

### Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| RCA Author | | | ☐ |
| Engineering Lead | | | ☐ |
| Product Owner | | | ☐ |
| [Other stakeholder] | | | ☐ |

---

## Appendix

### Related Documents
- Incident ticket: [link]
- Relevant logs: [link]
- Related PRs: [link]

### Technical Details
*[Any additional technical information, diagrams, or data]*
