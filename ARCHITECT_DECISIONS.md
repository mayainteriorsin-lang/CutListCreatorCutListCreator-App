# Architect Decisions

## 2026-01-20 - /home TypeScript Gate Strategy

- Decision: Option 1 - Scoped gate for /home only.
- Reason: Global tsc failures are pre-existing and unrelated to /home stabilization.
- Risk Accepted: Global TypeScript debt remains visible; /home is verified independently.
- Follow-up Window: Next engineering cycle to triage and plan a global fix sprint.
- Status: /home remains stabilized and unblocked for Phase-2 entry.

## 2026-01-20 - home.tsx Stabilization Gate

- Decision: Apply the /home reference pattern to home.tsx via application/homePage.
- Risks Removed: UI persistence access, UI JSON parsing, storage key exposure.
- Gate Strategy: Scoped TypeScript gate `check:homePage` with `client/tsconfig.homePage.json` (application/homePage only).
- Scope Note: home.tsx UI compile remains blocked by pre-existing TypeScript errors in shared dependencies.
- Reference: Follows /home application/home/* stabilization pattern.
