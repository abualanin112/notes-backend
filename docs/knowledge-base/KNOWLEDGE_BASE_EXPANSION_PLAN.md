# Knowledge Base Expansion Plan

**Version:** 2.0 (Enterprise convergence)  
**Date:** 2026-05-24  
**Status:** Master plan — **no detailed KB articles generated yet**

---

## 1. Purpose

This document records the **gap analysis** between the initial Phase 0 roadmap (v1) and an **enterprise-grade** internal engineering knowledge base. It defines what was missing, what was added, and how v1 folder names map to v2 **canonical article IDs**.

**Companion artifacts (project root):**

| Artifact                           | Role                                        |
| ---------------------------------- | ------------------------------------------- |
| `KNOWLEDGE_BASE_ROADMAP.md`        | Target hierarchy + phase index              |
| `DOCUMENTATION_PHASES.md`          | Executable phases (v2, 10 execution phases) |
| `DOCUMENTATION_EXECUTION_ORDER.md` | Session-by-session AI execution sequence    |
| `SYSTEM_DEPENDENCY_GRAPH.md`       | Expanded dependency + reading order         |
| `ARCHITECTURE_DISCOVERY_REPORT.md` | Inventory + drift + new module IDs          |
| `HIGH_RISK_SYSTEMS_REPORT.md`      | Prioritized documentation targets           |
| `ERP_DOMAIN_MODELING_PLAN.md`      | Domain + future module modeling guide plan  |

---

## 2. Gap Analysis (v1 → v2)

### 2.1 Missing Systems (Now in Scope)

| Gap                                 | v1 state                             | v2 resolution                                        |
| ----------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Architecture philosophy             | Implicit in README only              | `ARCHITECTURE_PHILOSOPHY.md`                         |
| Canonical flows (single doc)        | Scattered in discovery §2            | `CANONICAL_SYSTEM_FLOWS.md`                          |
| API boundary contracts              | Partial (`api-response-envelope`)    | `API_BOUNDARIES.md`                                  |
| Validation as a system              | Single `validation-zod-dtos`         | `VALIDATION_SYSTEM.md`                               |
| Serialization as a system           | Single `serializers.md`              | `SERIALIZATION_SYSTEM.md`                            |
| Domain modeling (ERP)               | Only Prisma overview                 | `DOMAIN_MODELING.md` + `ERP_DOMAIN_MODELING_PLAN.md` |
| Database architecture               | Split across repos/schema            | `DATABASE_ARCHITECTURE.md`                           |
| Transactional consistency           | Short `transactions.md`              | `TRANSACTIONAL_CONSISTENCY.md`                       |
| Unified security model              | Split auth + security.md link        | `SECURITY_MODEL.md`                                  |
| Auth / RBAC as first-class articles | Multiple small files                 | `AUTH_SYSTEM.md`, `RBAC_SYSTEM.md`                   |
| Redis + caching unified             | `permission-cache` + `redis-circuit` | `REDIS_AND_CACHING.md`                               |
| Workers + cron unified              | `background-workers.md` only         | `WORKERS_AND_CRON.md`                                |
| Audit + observability unified       | Split audit / ALS / metrics          | `AUDIT_AND_OBSERVABILITY.md`                         |
| Business rules registry             | Inline in discovery                  | `BUSINESS_RULES.md`                                  |
| ERP business guide                  | Partial domain folders               | `ERP_BUSINESS_LOGIC_GUIDE.md`                        |
| Future module expansion             | Checklist only                       | `FUTURE_MODULE_ARCHITECTURE.md`                      |
| Final convergence                   | `CONVERGENCE.md` (planned)           | `FINAL_ENGINEERING_SUMMARY.md`                       |

### 2.2 Missing Phases (v1 → v2)

| v1                                 | v2 change                                                          |
| ---------------------------------- | ------------------------------------------------------------------ |
| 7 execution phases (1–7)           | **10 execution phases (1–10)** + Phase 0 planning                  |
| Phase 1 = 4 small foundation files | Phase 1 = philosophy + lifecycle + canonical flows (3 anchor docs) |
| Auth + RBAC merged in Phase 2      | **Split:** Phase 3 Auth, Phase 4 RBAC + Security                   |
| Data in Phase 3                    | **Expanded:** Phase 5 Domain + DB + Transactions                   |
| Cross-cutting in Phase 4           | **Split:** Phase 2 API/validation/serialization                    |
| Infrastructure Phase 5             | Phase 7 (infra) + Phase 6 (audit/observability)                    |
| Domains Phase 6                    | Phase 8 (business rules + ERP)                                     |
| Testing Phase 7                    | Phase 9 testing + Phase 10 convergence                             |

### 2.3 Weak Dependency Mapping (Fixed in v2)

- Added **business-rule dependency layer** (rules → domains → API)
- Added **serialization dependency** on API boundaries (envelope before serializers)
- Added **transaction dependency** on audit (audit throw = rollback)
- Added **worker dependency** on Redis + shutdown docs
- Added **security model** as convergence of auth + RBAC + threat flows
- Added **recommended reading order** for humans vs **generation order** for AI

### 2.4 Undocumented Operational Behavior (Now Scheduled)

| Behavior                           | Target doc                              |
| ---------------------------------- | --------------------------------------- |
| Probe semantics (DEGRADED vs DOWN) | `INFRASTRUCTURE_AND_RESILIENCE.md`      |
| Shutdown worker await (5s)         | `INFRASTRUCTURE_AND_RESILIENCE.md`      |
| Event loop lag monitoring          | `AUDIT_AND_OBSERVABILITY.md`            |
| Slow query telemetry               | `DATABASE_ARCHITECTURE.md`              |
| RBAC cache version bump            | `REDIS_AND_CACHING.md`                  |
| Token cleanup SETNX lock           | `WORKERS_AND_CRON.md`                   |
| Email service (SMTP) failure mode  | `API_BOUNDARIES.md` (external boundary) |

---

## 3. Canonical Article Registry (v2)

All articles live under `notes-backend/docs/knowledge-base/`. Names are **SCREAMING_SNAKE** for top-level system articles; domain supplements use subfolders.

### 3.1 Core Architecture (`00-core/`)

| Article                      | Replaces / merges v1                              |
| ---------------------------- | ------------------------------------------------- |
| `REQUEST_LIFECYCLE.md`       | `request-lifecycle.md`                            |
| `CANONICAL_SYSTEM_FLOWS.md`  | New (auth, authz, mutation, refresh, delete-user) |
| `ARCHITECTURE_PHILOSOPHY.md` | New (layering, boundaries, drift prevention)      |

### 3.2 API & Contracts (`01-api/`)

| Article                   | Replaces / merges v1                                     |
| ------------------------- | -------------------------------------------------------- |
| `API_BOUNDARIES.md`       | `api-response-envelope.md` + error contract + versioning |
| `VALIDATION_SYSTEM.md`    | `validation-zod-dtos.md`                                 |
| `SERIALIZATION_SYSTEM.md` | `serializers.md`                                         |

### 3.3 Security (`02-security/`)

| Article             | Replaces / merges v1                                 |
| ------------------- | ---------------------------------------------------- |
| `AUTH_SYSTEM.md`    | `01-auth/*` consolidated                             |
| `RBAC_SYSTEM.md`    | `02-rbac/*` consolidated                             |
| `SECURITY_MODEL.md` | Links `docs/architecture/security.md` + threat model |

### 3.4 Data (`03-data/`)

| Article                        | Replaces / merges v1                     |
| ------------------------------ | ---------------------------------------- |
| `DOMAIN_MODELING.md`           | ERP entities, ownership, aggregates      |
| `DATABASE_ARCHITECTURE.md`     | `prisma-schema` + indexes + proxy        |
| `TRANSACTIONAL_CONSISTENCY.md` | `transactions.md` + audit rollback rules |

### 3.5 Operations (`04-operations/`)

| Article                            | Replaces / merges v1                   |
| ---------------------------------- | -------------------------------------- |
| `REDIS_AND_CACHING.md`             | redis + RBAC cache                     |
| `WORKERS_AND_CRON.md`              | `background-workers.md`                |
| `INFRASTRUCTURE_AND_RESILIENCE.md` | bootstrap, probes, shutdown            |
| `AUDIT_AND_OBSERVABILITY.md`       | audit + ALS + metrics + logging policy |

### 3.6 Engineering (`05-engineering/`)

| Article                         | Replaces / merges v1       |
| ------------------------------- | -------------------------- |
| `TESTING_ARCHITECTURE.md`       | `08-testing/*`             |
| `BUSINESS_RULES.md`             | Rule registry BR-001…      |
| `ERP_BUSINESS_LOGIC_GUIDE.md`   | `06-domains/*` + workflows |
| `FUTURE_MODULE_ARCHITECTURE.md` | `09-erp-guidance/*`        |
| `FINAL_ENGINEERING_SUMMARY.md`  | `CONVERGENCE.md` + index   |

### 3.7 Supporting Artifacts (Not full articles)

| File                                     | Purpose                                           |
| ---------------------------------------- | ------------------------------------------------- |
| `02-security/ROUTE_PERMISSION_MATRIX.md` | Machine-checkable route table (extract from RBAC) |
| `06-domains/users/`                      | Optional deep-dive supplements                    |
| `06-domains/notes/`                      | Optional deep-dive supplements                    |
| `README.md`                              | KB entry point                                    |

**Total primary articles:** 21  
**Total with matrix + README:** 23

---

## 4. v1 → v2 Folder Migration

```
notes-backend/docs/knowledge-base/
├── README.md
├── 00-core/
│   ├── REQUEST_LIFECYCLE.md
│   ├── CANONICAL_SYSTEM_FLOWS.md
│   └── ARCHITECTURE_PHILOSOPHY.md
├── 01-api/
│   ├── API_BOUNDARIES.md
│   ├── VALIDATION_SYSTEM.md
│   └── SERIALIZATION_SYSTEM.md
├── 02-security/
│   ├── AUTH_SYSTEM.md
│   ├── RBAC_SYSTEM.md
│   ├── SECURITY_MODEL.md
│   └── ROUTE_PERMISSION_MATRIX.md
├── 03-data/
│   ├── DOMAIN_MODELING.md
│   ├── DATABASE_ARCHITECTURE.md
│   └── TRANSACTIONAL_CONSISTENCY.md
├── 04-operations/
│   ├── REDIS_AND_CACHING.md
│   ├── WORKERS_AND_CRON.md
│   ├── INFRASTRUCTURE_AND_RESILIENCE.md
│   └── AUDIT_AND_OBSERVABILITY.md
├── 05-engineering/
│   ├── TESTING_ARCHITECTURE.md
│   ├── BUSINESS_RULES.md
│   ├── ERP_BUSINESS_LOGIC_GUIDE.md
│   ├── FUTURE_MODULE_ARCHITECTURE.md
│   └── FINAL_ENGINEERING_SUMMARY.md
└── 06-domains/          # Optional supplements (Phase 8)
    ├── users/
    └── notes/
```

---

## 5. Context Budget Strategy

| Rule                                                                                                   | Rationale                             |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Max **1 primary article** per AI session when article is Large (AUTH, RBAC, SECURITY, CANONICAL_FLOWS) | Avoid partial/incorrect security docs |
| Max **2 primary articles** per session when Medium                                                     | Validation + Serialization            |
| Max **3** when Small                                                                                   | Philosophy + lifecycle pointers       |
| Always load **only** `ARCHITECTURE_DISCOVERY_REPORT.md` § drift + target article outline               | No full codebase re-discovery         |
| Append to `BUSINESS_RULES.md` incrementally in Phase 8                                                 | Avoid rewriting full rule doc         |

**Estimated sessions:** 14–16 (up from 12–13) due to consolidation articles being denser.

---

## 6. Convergence with Existing Repo Docs

| Existing path                                         | v2 KB treatment                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `notes-backend/docs/migrations/AUTHORIZATION_FLOW.md` | Cited in `CANONICAL_SYSTEM_FLOWS`; superseded by `RBAC_SYSTEM` for detail |
| `notes-backend/docs/architecture/security.md`         | Merged into `SECURITY_MODEL` with delta table                             |
| `notes-backend/docs/migrations/*_RULES.md`            | Summarized in `INFRASTRUCTURE_AND_RESILIENCE`; link for ops               |
| `notes-backend/docs/ADR/*`                            | Indexed in `FINAL_ENGINEERING_SUMMARY`                                    |
| Project root planning `*.md`                          | Remain **planning only**; not copied into KB                              |

---

## 7. Success Criteria (v2)

- [ ] All 21 primary articles listed in §3 exist with acceptance checklists passed
- [ ] `ROUTE_PERMISSION_MATRIX.md` covers 100% of `/v1` routes
- [ ] `BUSINESS_RULES.md` has ≥15 numbered rules with code pointers
- [ ] `CANONICAL_SYSTEM_FLOWS.md` has ≥6 sequence diagrams
- [ ] Drift D01–D08 in `FINAL_ENGINEERING_SUMMARY` with status
- [ ] Senior engineer onboarding path defined in `DOCUMENTATION_EXECUTION_ORDER.md` (Reading Track)

---

## 8. Next Action

Execute **Phase 1** per `DOCUMENTATION_EXECUTION_ORDER.md` — do not skip `ARCHITECTURE_PHILOSOPHY.md` (sets constraints for all later articles).
