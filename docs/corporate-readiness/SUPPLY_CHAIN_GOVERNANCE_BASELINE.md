# Supply Chain Governance Baseline

## Document Version: 1.0
## Assessment Date: 2026-02-03

---

## 1. Purpose

Establish a baseline for software supply chain security governance, including dependency management, vulnerability tracking, and provenance verification.

---

## 2. Supply Chain Security Checklist

### 2.1 SLSA Framework Alignment

| SLSA Level | Requirement | Status |
|------------|-------------|--------|
| **Level 1** | Build process documented | ✅ IMPLEMENTED |
| **Level 1** | Provenance generated | ⚠️ PARTIAL |
| **Level 2** | Version control for build | ✅ IMPLEMENTED |
| **Level 2** | Hosted build service | ✅ IMPLEMENTED |
| **Level 3** | Hardened build platform | ⚠️ GAP |
| **Level 4** | Two-party review | ⚠️ PARTIAL |

### 2.2 Supply Chain Security Controls

| Control | Status | Evidence |
|---------|--------|----------|
| Dependencies locked | ✅ IMPLEMENTED | package-lock.json |
| Dependency scanning | ✅ IMPLEMENTED | npm audit |
| Build reproducibility | ⚠️ PARTIAL | npm ci used |
| Code signing | ⚠️ GAP | Not implemented |
| SBOM generation | ⚠️ GAP | Not implemented |
| Provenance attestation | ⚠️ GAP | Not implemented |

---

## 3. Dependency Inventory

### 3.1 Dependency Statistics

| Category | Count |
|----------|-------|
| Direct dependencies | ~45 |
| Dev dependencies | ~25 |
| Total (including transitive) | ~800+ |
| With known vulnerabilities | 17 |

### 3.2 Critical Dependencies

| Package | Purpose | Version | Risk |
|---------|---------|---------|------|
| express | Web framework | ^4.x | Low |
| drizzle-orm | Database ORM | ^0.x | Medium |
| react | UI framework | ^18.x | Low |
| jsonwebtoken | JWT handling | ^9.x | Low |
| bcrypt | Password hashing | ^5.x | Low |
| helmet | Security headers | ^7.x | Low |

### 3.3 High-Risk Dependencies

| Package | Issue | Severity | Fix Available |
|---------|-------|----------|---------------|
| xlsx | Prototype pollution, ReDoS | Critical | No |
| react-router-dom | XSS via redirects | High | Yes |
| jspdf | PDF injection | High | Yes (v4.x) |
| @google-cloud/storage | XML parser vuln | High | Yes |
| fast-xml-parser | XXE vulnerability | High | Transitive |

---

## 4. Vulnerability Management

### 4.1 Current Vulnerability Summary

```
npm audit (2026-02-03)

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Review required |
| High | 9 | Remediation planned |
| Moderate | 6 | Acceptable |
| Low | 0 | - |
| Total | 17 | - |
```

### 4.2 Vulnerability Triage

| Package | Severity | Decision | Justification |
|---------|----------|----------|---------------|
| esbuild (via drizzle-kit) | Critical | Accept | Dev-only, not in prod |
| xlsx | Critical | Accept with mitigation | No fix, input validation added |
| react-router-dom | High | Remediate | Fix available, scheduled |
| jspdf | High | Remediate | Upgrade to v4.x |
| @google-cloud/storage | High | Remediate | Upgrade available |

### 4.3 Vulnerability SLAs

| Severity | Remediation SLA | Escalation |
|----------|-----------------|------------|
| Critical | 7 days | Engineering Lead |
| High | 14 days | Engineering Lead |
| Moderate | 30 days | Team Lead |
| Low | 90 days | Backlog |

---

## 5. Dependency Update Governance

### 5.1 Update Cadence

| Update Type | Frequency | Approval |
|-------------|-----------|----------|
| Security patches | Immediate | Engineering Lead |
| Minor versions | Weekly | Team Lead |
| Major versions | Monthly | ARB review |
| Dev dependencies | Monthly | Team Lead |

### 5.2 Update Process

```markdown
## Dependency Update Process

### Weekly Review (Monday)
1. Run `npm audit`
2. Check for new security advisories
3. Review dependabot alerts (if configured)
4. Prioritize updates by severity

### Update Steps
1. Create branch: `deps/[package]-[version]`
2. Update package: `npm update [package]`
3. Run tests: `npm test -- --run`
4. Run type check: `npm run check`
5. Manual smoke test
6. Create PR with changelog link
7. Review and merge

### Emergency Updates
1. Security advisory received
2. Assess exploitability
3. Create hotfix branch
4. Apply update
5. Expedited review
6. Deploy immediately
```

### 5.3 Evidence: Dependency Lock

**File**: `package-lock.json`
**Purpose**: Ensure reproducible builds with exact dependency versions

```
✓ package-lock.json present in repository
✓ lockfileVersion: 3 (npm v9+)
✓ All dependencies have exact versions
✓ Integrity hashes present
```

---

## 6. Software Bill of Materials (SBOM)

### 6.1 Current Status: GAP

**SBOM generation is not currently implemented.**

### 6.2 Recommendation

| Action | Tool | Priority |
|--------|------|----------|
| Generate SBOM | npm sbom (npm v9+) | P2 |
| SBOM format | CycloneDX or SPDX | P2 |
| Storage | With release artifacts | P2 |
| Automation | CI/CD integration | P3 |

### 6.3 Implementation Plan

```bash
# Generate SBOM with npm (v9+)
npm sbom --sbom-format cyclonedx

# Or use syft for comprehensive SBOM
syft . -o cyclonedx-json > sbom.json
```

**Target Implementation**: Q2 2026

---

## 7. Build Provenance

### 7.1 Current Status

| Aspect | Status | Evidence |
|--------|--------|----------|
| Source control | ✅ | GitHub repository |
| Build triggered by | ✅ | GitHub Actions |
| Build logs | ✅ | GitHub Actions logs |
| Artifact signing | ⚠️ GAP | Not implemented |
| Provenance attestation | ⚠️ GAP | Not implemented |

### 7.2 Build Chain

```
Source Code (GitHub)
       ↓
GitHub Actions CI
       ↓
Build Artifacts
       ↓
Render Deployment
       ↓
Production
```

### 7.3 Provenance Enhancement Plan

| Enhancement | Priority | Target |
|-------------|----------|--------|
| GitHub OIDC for Render | P2 | Q2 2026 |
| Build provenance in CI | P3 | Q3 2026 |
| Artifact signing | P3 | Q3 2026 |

---

## 8. Third-Party Service Governance

### 8.1 Service Inventory

| Service | Purpose | Data Shared | Compliance |
|---------|---------|-------------|------------|
| GitHub | Source control | Code | SOC 2 |
| Render | Hosting | App + config | SOC 2 |
| Neon | Database | All data | SOC 2 |
| npm Registry | Packages | Metadata | - |

### 8.2 Service Risk Assessment

| Service | Criticality | Redundancy | Risk |
|---------|-------------|------------|------|
| GitHub | High | Git mirrors | Low |
| Render | High | Manual migration possible | Medium |
| Neon | Critical | PITR backup | Low |
| npm | High | Cached in lock file | Low |

---

## 9. Secure Development Practices

### 9.1 Code Security

| Practice | Status | Evidence |
|----------|--------|----------|
| Code review required | ✅ | GitHub branch protection |
| Security linting | ⚠️ PARTIAL | ESLint basic rules |
| Secret scanning | ⚠️ GAP | Not configured |
| SAST | ⚠️ GAP | Not configured |
| DAST | ⚠️ GAP | Not configured |

### 9.2 Recommended Additions

| Tool | Purpose | Priority |
|------|---------|----------|
| GitHub secret scanning | Prevent credential leaks | P1 |
| Snyk or Dependabot | Automated vuln alerts | P1 |
| CodeQL | Static analysis | P2 |
| Trivy | Container scanning | P3 |

---

## 10. Supply Chain Attack Vectors

### 10.1 Risk Assessment

| Attack Vector | Likelihood | Impact | Mitigation |
|---------------|------------|--------|------------|
| Compromised dependency | Medium | High | Lock file, audit |
| Typosquatting | Low | High | Lock file |
| Build hijacking | Low | Critical | GitHub security |
| Credential theft | Medium | Critical | Secrets management |

### 10.2 Mitigations in Place

| Mitigation | Status |
|------------|--------|
| package-lock.json | ✅ |
| npm audit in CI | ⚠️ PARTIAL |
| Branch protection | ✅ |
| MFA for GitHub | ✅ (assumed) |
| Secrets in env vars | ✅ |

---

## 11. Compliance Summary

### 11.1 Supply Chain Controls

| Control | Status | Gap |
|---------|--------|-----|
| Dependency inventory | ✅ PASS | - |
| Version locking | ✅ PASS | - |
| Vulnerability scanning | ✅ PASS | - |
| Update governance | ✅ PASS | - |
| SBOM generation | ⚠️ GAP | Not implemented |
| Artifact signing | ⚠️ GAP | Not implemented |
| Provenance attestation | ⚠️ GAP | Not implemented |

### 11.2 Remediation Priority

| Item | Priority | Owner | Target |
|------|----------|-------|--------|
| Fix react-router vulnerability | P0 | Frontend Lead | 2026-02-17 |
| Enable GitHub secret scanning | P1 | DevOps Lead | 2026-02-28 |
| Configure Dependabot | P1 | DevOps Lead | 2026-02-28 |
| Upgrade jspdf | P2 | Frontend Lead | 2026-03-15 |
| Implement SBOM | P2 | DevOps Lead | 2026-04-01 |
| Add artifact signing | P3 | DevOps Lead | 2026-06-01 |

---

## 12. Governance Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| npm audit | Weekly | DevOps |
| Dependency review | Weekly | Engineering |
| Vulnerability triage | Weekly | Security Lead |
| Major version review | Monthly | ARB |
| Supply chain audit | Quarterly | Security Lead |

---

## 13. Approval

| Role | Name | Date |
|------|------|------|
| Engineering Lead | __________ | __________ |
| Security Lead | __________ | __________ |
