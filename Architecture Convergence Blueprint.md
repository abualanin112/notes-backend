# Architecture Convergence Blueprint (Remaining Phases Only)

## 1. Current Status

The platform has already completed the critical stabilization and recovery stages:

### Completed Successfully

- Prisma migration stabilization
- Database-driven RBAC stabilization
- Vitest migration
- PostgreSQL Testcontainers stabilization
- Redis dependency recovery
- Pino observability migration
- AsyncLocalStorage foundation
- Audit infrastructure foundation
- Refresh token rotation hardening
- Worker lifecycle stabilization
- Integration test recovery
- Auth middleware stabilization
- Infrastructure boot recovery

### Current State

The backend is operational, tests are passing, and the architecture is stable enough to continue convergence work safely.

The remaining work now focuses on:

- eliminating architectural drift
- removing legacy remnants
- hardening boundaries
- converging toward one canonical architecture
- final production-grade consistency

---

# Phase 3 — Legacy Artifact Removal & Drift Elimination

## Goal

Safely eliminate obsolete systems, stale role remnants, duplicated authorization assumptions, and partially migrated legacy artifacts.

---

## Scope

Audit and remove:

- LegacyRole enum remnants
- old `roles.js`
- stale hardcoded role arrays
- duplicated ownership logic
- stale middleware bypasses
- partially migrated permission assumptions
- obsolete comments/docs
- stale Prisma assumptions
- dead RBAC code paths

---

## Required Tasks

### RBAC Cleanup

- Remove all references to legacy hardcoded roles
- Remove duplicated ownership checks
- Ensure all authorization flows pass through the canonical RBAC middleware

### Schema Cleanup

- Audit old role column usage
- Prepare safe Prisma migration to remove obsolete enum/columns
- Verify rollback safety before deletion

### Dead Code Audit

- Identify:
  - unused services
  - unused repositories
  - stale middleware
  - dead serializers
  - obsolete test utilities

### Documentation

Generate:

- SAFE_DELETION_PLAN.md
- MIGRATION_INTEGRITY_REPORT.md

---

## Forbidden Changes

DO NOT:

- redesign RBAC
- introduce ABAC
- introduce multi-tenancy
- rewrite auth architecture
- perform destructive cleanup without git checkpoint

---

## Git Checkpoint

Before Phase 3:

```bash id="p3j1ka"
git add .
git commit -m "checkpoint: before phase-3 legacy cleanup"
```

After completion:

```bash id="m9v2tx"
git add .
git commit -m "phase-3: legacy artifact cleanup completed"
```

---

## Exit Criteria

Phase 3 is complete ONLY when:

- no duplicated RBAC systems remain
- no stale role logic remains
- no hardcoded permissions remain
- schema matches actual RBAC architecture
- no stale ownership bypasses remain
- tests remain fully deterministic

---

# Phase 4 — DTO & API Boundary Hardening

## Goal

Enforce strict serialization discipline and eliminate raw Prisma leakage.

---

## Scope

Audit:

- DTOs
- response serializers
- nested relation exposure
- password leakage
- audit payload leakage
- Prisma entity exposure
- error response consistency

---

## Required Tasks

### Response Shaping

- Ensure all API responses use explicit serialization
- Eliminate raw Prisma entity exposure
- Normalize API contracts

### Sensitive Data Protection

- Ensure passwords/tokens never leak
- Verify nested relations cannot bypass serializers
- Verify audit metadata sanitization

### Error Contract Stabilization

- Standardize:
  - status
  - code
  - message
  - details

---

## Forbidden Changes

DO NOT:

- introduce GraphQL
- add DTO frameworks
- redesign controllers

---

## Required Deliverables

Generate:

- API_BOUNDARY_AUDIT.md
- DTO_SERIALIZATION_RULES.md

---

## Git Checkpoint

Before Phase 4:

```bash id="r4v8nx"
git add .
git commit -m "checkpoint: before phase-4 dto hardening"
```

After completion:

```bash id="q2m6yb"
git add .
git commit -m "phase-4: dto boundary hardening completed"
```

---

## Exit Criteria

Phase 4 is complete ONLY when:

- no raw Prisma leakage exists
- no password/token exposure exists
- all responses are explicitly shaped
- API contracts are deterministic
- nested relation exposure is impossible

---

# Phase 5 — Observability & Audit Hardening

## Goal

Guarantee deterministic, side-effect-free observability and audit behavior.

---

## Scope

Audit:

- Pino serializers
- ALS propagation
- reqId propagation
- audit events
- worker telemetry
- Redis telemetry
- security telemetry
- structured logging consistency

---

## Required Tasks

### Logging Safety

- Verify logging never mutates request objects
- Verify serializers are pure
- Verify no side effects exist in observability paths

### ALS Validation

- Validate async propagation across:
  - middleware
  - services
  - repositories
  - workers
  - transactions

### Audit Standardization

- Standardize audit taxonomy
- Validate deterministic audit payloads
- Ensure audit events are transactionally safe

---

## Forbidden Changes

DO NOT:

- introduce distributed tracing systems
- add OpenTelemetry
- redesign logging architecture

---

## Required Deliverables

Generate:

- OBSERVABILITY_AUDIT.md
- AUDIT_EVENT_TAXONOMY.md

---

## Git Checkpoint

Before Phase 5:

```bash id="g5z1pk"
git add .
git commit -m "checkpoint: before phase-5 observability hardening"
```

After completion:

```bash id="n8w3rt"
git add .
git commit -m "phase-5: observability hardening completed"
```

---

## Exit Criteria

Phase 5 is complete ONLY when:

- observability is side-effect free
- ALS propagation is deterministic
- reqId propagation is stable
- audit events are deterministic
- no hidden logging coupling exists

---

# Phase 6 — Worker & Infrastructure Finalization

## Goal

Stabilize operational infrastructure and guarantee deterministic worker behavior.

---

## Scope

Audit:

- cron workers
- cleanup jobs
- graceful shutdown
- Redis fallback behavior
- worker gating
- test isolation
- batching behavior
- open handles

---

## Required Tasks

### Worker Stabilization

- Prevent overlapping jobs
- Validate worker shutdown lifecycle
- Ensure test-safe worker isolation

### Cleanup Hardening

- Validate batch deletion behavior
- Validate cleanup telemetry
- Validate retry safety

### Infrastructure Safety

- Ensure Redis failures degrade gracefully
- Ensure no duplicate schedulers exist

---

## Forbidden Changes

DO NOT:

- introduce Kafka
- introduce BullMQ clusters
- introduce distributed queues
- add microservices

---

## Required Deliverables

Generate:

- WORKER_LIFECYCLE_AUDIT.md
- INFRASTRUCTURE_STABILITY_REPORT.md

---

## Git Checkpoint

Before Phase 6:

```bash id="y6k4qm"
git add .
git commit -m "checkpoint: before phase-6 infrastructure finalization"
```

After completion:

```bash id="u1n7xb"
git add .
git commit -m "phase-6: infrastructure stabilization completed"
```

---

## Exit Criteria

Phase 6 is complete ONLY when:

- workers are deterministic
- no overlapping jobs exist
- graceful shutdown is stable
- Redis fallback is deterministic
- tests are isolated from infrastructure
- no hanging handles remain

---

# Phase 7 — Final Architecture Convergence

## Goal

Converge all systems into ONE clean, production-grade backend architecture.

---

## Scope

Final audit of:

- auth
- RBAC
- DTOs
- Prisma
- observability
- workers
- Redis
- audit
- migrations
- tests
- infrastructure boundaries

---

## Required Tasks

### Final Drift Elimination

- remove remaining duplicate systems
- remove stale abstractions
- verify canonical flows

### Final Documentation

Finalize:

- SYSTEM_STATE.md
- AUTHORIZATION_FLOW.md
- ARCHITECTURAL_DRIFT_REPORT.md
- MIGRATION_INTEGRITY_REPORT.md

### Final Validation

Run:

- full test suite
- lint
- migration validation
- worker lifecycle validation
- ALS validation

---

## Forbidden Changes

DO NOT:

- add features
- redesign architecture
- introduce new infrastructure systems

---

## Git Checkpoint

Before Phase 7:

```bash id="b7m2za"
git add .
git commit -m "checkpoint: before phase-7 final convergence"
```

After completion:

```bash id="h3q9xt"
git add .
git commit -m "phase-7: final architecture convergence completed"
```

---

## Exit Criteria

Phase 7 is complete ONLY when:

- exactly ONE canonical RBAC flow exists
- exactly ONE ownership strategy exists
- exactly ONE audit pipeline exists
- exactly ONE logging strategy exists
- zero stale role logic remains
- zero dead auth flows remain
- zero duplicate systems remain
- all tests are deterministic
- infrastructure is operationally stable
- architecture documentation matches reality

---

# Final Convergence Objective

The goal is NOT:
“make the backend work.”

The goal IS:
converge the backend into a clean, stable, production-grade architecture after large-scale AI-assisted modifications while preserving rollback safety, deterministic behavior, and long-term maintainability.
