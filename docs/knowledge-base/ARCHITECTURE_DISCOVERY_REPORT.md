# Architecture Discovery Report

**Project:** `notes-backend` (Notes ERP-style API)  
**Analysis date:** 2026-05-24  
**Plan version:** 2.0 (expanded roadmap convergence)  
**Scope:** Full backend discovery for knowledge-base planning — no implementation changes  
**Codebase scale:** ~80 JS source/test files; single deployable Node.js service

---

## Executive Summary

The backend is a **layered Express REST API** with **PostgreSQL (Prisma)**, **Redis-backed RBAC caching**, **JWT session rotation**, **structured audit logging**, and **Vitest + Testcontainers** integration tests. A multi-phase **architecture recovery** (Phases 0–7) already produced migration-era documentation under `docs/migrations/` and partial architecture docs under `docs/architecture/`.

This report inventories **what exists today**, **what is canonical**, **what is drift or debt**, and **what remains undocumented** for a future internal knowledge base. It does **not** replace detailed system docs — it feeds the phased execution plan.

---

## 1. System Inventory (Discover & Categorize)

### 1.1 Layer Map

| Layer             | Location                                                                     | Count / Notes                                                                             |
| ----------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Entry & lifecycle | `src/index.js`, `src/app.js`                                                 | Bootstrap, probes, graceful shutdown                                                      |
| Routes            | `src/routes/v1/`                                                             | `auth`, `users`, `notes`, `docs` (dev only)                                               |
| Controllers       | `src/controllers/`                                                           | `auth`, `user`, `note`                                                                    |
| Services          | `src/services/`                                                              | 8 modules (auth, user, note, token, permission, authorization, audit, email)              |
| Repositories      | `src/repositories/`                                                          | `user`, `note`, `token`, `audit` + `runInTransaction`                                     |
| Serializers       | `src/serializers/`                                                           | `user`, `note`                                                                            |
| Validations (Zod) | `src/validations/`                                                           | `auth`, `user`, `note`, `role`, `custom`                                                  |
| Middleware        | `src/middlewares/`                                                           | `auth`, `validate`, `error`, `rateLimiter`, `response.interceptor`                        |
| Config            | `src/config/`                                                                | `config`, `prisma`, `redis`, `passport`, `als`, `logger`, `pinoHttp`, `metrics`, `tokens` |
| Workers           | `src/workers/`                                                               | `tokenCleanup.worker.js` only                                                             |
| Prisma            | `prisma/schema.prisma`, `prisma/seed.js`                                     | RBAC + core domain                                                                        |
| Tests             | `tests/integration/`, `tests/unit/`                                          | Auth, users, notes, audit, security, Redis degradation                                    |
| Infra docs        | `docs/migrations/`, `docs/architecture/`, `docs/ADR/`, `docs/observability/` | 33+ existing markdown artifacts                                                           |

### 1.2 Domain Modules (Documentation Units)

| Module ID | Business / Technical Scope            | Primary Code                                              |
| --------- | ------------------------------------- | --------------------------------------------------------- |
| **M01**   | HTTP request lifecycle & API envelope | `app.js`, `response.interceptor.js`, `error.js`           |
| **M02**   | Authentication & tokens               | `auth.*`, `token.service`, `passport`, `token.repository` |
| **M03**   | RBAC permissions & cache              | `permission.service`, `auth.js`, Redis keys `rbac:*`      |
| **M04**   | Scoped authorization (ABAC)           | `authorization.service`                                   |
| **M05**   | User domain                           | `user.*`, `user.repository`, `user.serializer`            |
| **M06**   | Note domain (core ERP entity)         | `note.*`, `note.repository`, `paginateCursor`             |
| **M07**   | Audit & compliance                    | `audit.service`, `audit.repository`, `AuditLog` model     |
| **M08**   | Data model & Prisma                   | `schema.prisma`, `prisma.js`, repositories                |
| **M09**   | Redis & resilience                    | `redis.js`, circuit breaker, LRU fallback                 |
| **M10**   | Workers & background jobs             | `tokenCleanup.worker`, `enableBackgroundWorkers`          |
| **M11**   | Observability & ops                   | ALS, Pino, metrics, `/live` `/ready` `/health`            |
| **M12**   | Validation & DTO contracts            | Zod validations, Swagger in routes                        |
| **M13**   | Testing strategy                      | Vitest, Testcontainers, fixtures                          |
| **M14**   | Role management (partial)             | `role.validation`, `assignRoleToUser` — **no routes**     |
| **M15**   | Architecture philosophy & boundaries  | Layer rules, drift prevention — **undocumented**          |
| **M16**   | Canonical multi-flow orchestration    | Auth, authz, mutation, refresh — **fragmented**           |
| **M17**   | API contract layer                    | Envelope, errors, versioning — **partial**                |
| **M18**   | Business rule registry                | Rules in code only — **no central doc**                   |
| **M19**   | Email / external integrations         | `email.service` — **minimal**                             |
| **M20**   | Future ERP module scaffold            | N/A — **planned in KB only**                              |

---

## 2. Canonical Flows (Source of Truth)

### 2.1 Request Lifecycle (Document First in KB)

```
Client
  → /live | /ready | /health (bypass v1 stack)
  → pinoHttp (reqId)
  → ALS store { reqId, logger }
  → helmet → json/urlencoded → xss → compression → cors
  → /v1 apiLimiter
  → passport.initialize
  → /v1/{auth|users|notes} route
       → auth(permissions?) → validate(Zod) → controller (catchAsync)
       → res.locals { payload, serializer, statusCode }
  → serializeResponse (canonical { success, data, meta? })
  → 404 → errorConverter → errorHandler
```

**Canonical success envelope:** `{ success: true, data: ... }` via `serializeResponse`.

### 2.2 Authentication Flow

1. Register / login → `user.service` / `auth.service` → JWT pair via `token.service`.
2. Access token: stateless JWT (`passport` `jwtStrategy`).
3. Refresh: transactional rotation in `auth.service.refreshAuth` — blacklist old, detect reuse, revoke family.
4. Tokens stored **hashed** (SHA-256) in `tokens` table with `familyId`, `ip`, `userAgent`.

### 2.3 Authorization Flow (Two Gates)

Documented in `notes-backend/docs/migrations/AUTHORIZATION_FLOW.md`:

1. **Middleware gate** (`auth.js`): AND-check of `action:resource:scope` against cached permission set.
2. **Ownership gate** (`authorization.service`): resolves `:own` vs `:any` using resource owner ID.

**Intended pattern (users):** Route requires minimum `:own` permission → controller calls `assertCanReadUser` / `assertCanManageUser` for cross-user access.

**Actual pattern (notes):** Route requires `:own` only → controller enforces `ownerId === req.user.id` with **404** (not `authorization.service`). See §4 Drift.

### 2.4 Mutation + Audit Flow

Transactional pattern in services:

```
runInTransaction(tx =>
  repository.mutate(..., tx)
  → auditService.logEvent({ event, entityType, entityId, action, metadata }, tx)
)
```

Audit reads `actorId` / `reqId` from ALS. Failures **throw** and roll back the transaction.

### 2.5 RBAC Resolution Flow

```
getUserPermissions(userId)
  → cacheGet rbac:permissions:v{version}:user:{userId}
  → miss: UserRole → Role → RolePermission → Permission
  → cacheSet (TTL 300s)
matchesPermission(granted, required) // exact, *:*, :any ⊃ :own
```

Global version bump (`bumpGlobalPermissionCacheVersion`) invalidates all RBAC cache keys.

### 2.6 Infrastructure Bootstrap & Shutdown

**Bootstrap (`index.js`):** metrics → DB ping → Redis → HTTP listen → optional workers.  
**Shutdown (reverse):** HTTP close → cron stop → `activeWorkers` await (5s) → Redis disconnect → Prisma disconnect (3s timeout).

---

## 3. Prisma Data Model Summary

| Model                                              | Purpose                   | Notable constraints                                                            |
| -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `Role`, `Permission`, `RolePermission`, `UserRole` | Dynamic RBAC              | `level` hierarchy; `isSystem` on roles                                         |
| `User`                                             | Identity                  | `LegacyRole` enum **@deprecated**; password globally omitted via Prisma `omit` |
| `Note`                                             | Core business entity      | `onDelete: Restrict` on owner; composite indexes for list queries              |
| `Token`                                            | Sessions / reset / verify | Hashed token; `familyId`; cascade on user delete                               |
| `AuditLog`                                         | Compliance                | **No FK** to users/notes — survives entity deletion                            |

**Seed (`prisma/seed.js`):** Bootstraps `*:*:*`, `super_admin` role, links legacy `admin` user. Seed uses **plaintext password** for default admin — operational risk for production docs.

---

## 4. Architectural Drift & Managed Debt

### 4.1 Resolved (per `ARCHITECTURAL_DRIFT_REPORT.md`)

- Legacy `roles.js` removed; DB-driven RBAC is canonical.
- Redis circuit breaker and memory fallback in place.
- Auth middleware uses `action:resource:scope` exclusively.

### 4.2 Active Drift (Requires KB + Optional Code Follow-up)

| ID      | Issue                                | Evidence                                                                                        | Risk                                                                           |
| ------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **D01** | Notes bypass `authorization.service` | `assertCanManageNote` exported but **never called**; controllers use hardcoded `ownerId` checks | Users with `*:notes:any` cannot moderate notes; docs claim centralized helpers |
| **D02** | Dual authorization styles            | Users: service assertions; Notes: controller IDOR-style 404                                     | Inconsistent ERP extension pattern                                             |
| **D03** | RBAC API incomplete                  | `role.validation.js`, `assignRoleToUser` exist; **no `role.route.js`**                          | Role assignment only via tests/seed                                            |
| **D04** | `LegacyRole` on `User`               | Schema + `user.repository` filter + Swagger enum                                                | Migration debt; query filter may not match `UserRole`                          |
| **D05** | Repository boundary leaks            | `permission.service`, `authorization.service` call `prisma` directly                            | Document as **exceptions** or refactor later                                   |
| **D06** | Swagger vs runtime                   | User create still documents `role: [user, admin]`                                               | API docs mislead integrators                                                   |
| **D07** | Note list pagination mismatch        | Route Swagger describes offset `page`; repository supports **cursor** (`paginateCursor`)        | Client contract confusion                                                      |
| **D08** | `getUsers` filter `role`             | Validation allows `role` string; likely filters deprecated column                               | Admin reporting inaccuracy                                                     |

### 4.3 Duplicated Logic

| Concern               | Locations                                                                | Recommendation for KB                                           |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Ownership enforcement | `note.controller` (inline) vs `authorization.service` (unused for notes) | Single doc: "Ownership enforcement patterns" with decision tree |
| Transaction entry     | `runInTransaction` vs `prisma.$transaction` in `assignRoleToUser`        | Document canonical `runInTransaction` wrapper                   |
| Password hashing      | `user.service`, `auth.service`                                           | Document "hash before persist" invariant                        |
| Permission check      | `auth.js` middleware vs `permissionService.hasPermission` in services    | Document when to use each layer                                 |

### 4.4 Undocumented Business Rules (Discovered in Code)

1. **Refresh token reuse:** Blacklisted token + reuse → delete entire `familyId`; 2s grace for concurrent refresh.
2. **User deletion:** Must delete all notes first (`noteRepository.deleteManyByOwnerId`) because DB `Restrict` on notes.
3. **Note read IDOR policy:** Return 404 (not 403) when note exists but not owned — anti-enumeration.
4. **Escalation prevention:** Cannot assign role with `level` > actor's `getMaxRoleLevel`.
5. **Audit metadata:** Depth 3, array max 50, string max 2000, forbidden keys redacted.
6. **Health probe:** `DEGRADED` cache still returns HTTP 200 — orchestrator must not kill pod on Redis loss alone.
7. **Worker lock:** `SETNX` on `worker:lock:tokenCleanup`; skipped duplicate runs when Redis up; duplicate possible when degraded.
8. **Deprecated `role` body field:** Stripped in `user.controller.createUser` with warning log.

---

## 5. Architectural Hotspots (Document First)

### 5.1 Highest Complexity / Risk

| Priority | System                                       | Why                                              |
| -------- | -------------------------------------------- | ------------------------------------------------ |
| P0       | `auth.service.refreshAuth` + `token.service` | Security-critical; transactions; reuse detection |
| P0       | `permission.service` + `auth.js`             | Every protected route; cache coherency           |
| P0       | `authorization.service`                      | Escalation prevention; audit on denial           |
| P1       | `audit.service` + transactional coupling     | Rollback semantics; PII sanitization             |
| P1       | `redis.js` circuit breaker                   | RBAC correctness under degradation               |
| P1       | `prisma.js` proxy + slow query extension     | Test vs prod behavior                            |
| P2       | `note.controller` ownership vs RBAC          | Active drift D01                                 |
| P2       | `user.service.deleteUserById`                | Multi-entity transactional cascade               |
| P3       | `tokenCleanup.worker`                        | Distributed lock + shutdown interaction          |

### 5.2 RBAC-Sensitive Operations

- All routes in `user.route.js`, `note.route.js`, `auth.route.js` (send-verification requires auth).
- `assignRoleToUser` (service-only today).
- Permission cache invalidation after role assignment.

### 5.3 Audit-Sensitive Operations

| Event taxonomy (sample)                       | Trigger               |
| --------------------------------------------- | --------------------- |
| `auth.login`, `auth.logout`, `auth.refresh.*` | Auth service          |
| `authz.escalation.attempted`                  | authorization.service |
| `authz.role.assigned`                         | assignRoleToUser      |
| `users.created/updated/deleted`               | user.service          |
| `notes.created/updated/deleted`               | note.service          |

---

## 6. Existing Documentation Landscape

### 6.1 Reuse (Do Not Regenerate Blindly)

| Path                                                  | Status             | KB action                                |
| ----------------------------------------------------- | ------------------ | ---------------------------------------- |
| `notes-backend/docs/migrations/AUTHORIZATION_FLOW.md` | Canonical          | Link + verify against code (notes drift) |
| `notes-backend/docs/migrations/SYSTEM_STATE.md`       | Canonical snapshot | Merge into KB index; mark date           |
| `notes-backend/docs/architecture/security.md`         | Strong             | Cross-link from auth module              |
| `notes-backend/docs/architecture/testing.md`          | Partial            | Expand in Phase 6                        |
| `notes-backend/docs/migrations/*_RULES.md`            | Ops governance     | Consolidate under infrastructure module  |
| `notes-backend/docs/ADR/*`                            | Stable decisions   | Reference from roadmap                   |
| Swagger in route files                                | Often stale        | Regenerate or annotate drift D06/D07     |

### 6.2 Gaps (No Dedicated Doc Yet)

- End-to-end request lifecycle diagram (single page).
- Permission catalog (seeded vs route-required matrix).
- Repository contract & Prisma proxy testing hooks.
- ERP extension guide (adding resource `bookings`, etc.).
- Event taxonomy registry (full list from grep).
- Role HTTP API (future) vs current service-only API.

---

## 7. Test Coverage Map

| Area              | Integration                 | Unit                 |
| ----------------- | --------------------------- | -------------------- |
| Auth flows        | `auth.test.js`              | —                    |
| Users             | `user.test.js`              | serializers          |
| Notes             | `note.test.js`              | serializers          |
| Audit             | `audit.test.js`             | —                    |
| RBAC escalation   | `security.test.js`          | —                    |
| Redis degradation | `redis-degradation.test.js` | `redis.test.js`      |
| Repositories      | —                           | `repository.test.js` |
| Pagination        | —                           | `paginate*.test.js`  |
| Error middleware  | —                           | `error.test.js`      |

**Gap:** No integration tests for notes admin (`:any` scope) because controllers do not implement it.

---

## 8. Recommendations for Documentation Order (v2)

Superseded by `DOCUMENTATION_EXECUTION_ORDER.md`. Summary:

1. **Philosophy → Lifecycle → Canonical flows** (Phase 1)
2. **API boundaries → Validation → Serialization** (Phase 2)
3. **AUTH_SYSTEM** (Phase 3)
4. **RBAC + SECURITY_MODEL + route matrix** (Phase 4)
5. **Domain → Database → Transactions** (Phase 5)
6. **Audit & observability** (Phase 6)
7. **Redis → Workers → Infrastructure** (Phase 7)
8. **Business rules → ERP guide** (Phase 8)
9. **Testing** (Phase 9)
10. **Future modules → Final summary** (Phase 10)

---

## 9. Metrics for Plan Success (v2)

- **21 primary KB articles** exist under `notes-backend/docs/knowledge-base/` (see `KNOWLEDGE_BASE_ROADMAP.md`)
- Every route traced in `ROUTE_PERMISSION_MATRIX.md`
- **≥15** business rules in `BUSINESS_RULES.md` with `BR-*` IDs
- Drift D01–D08 in `FINAL_ENGINEERING_SUMMARY.md`
- `CANONICAL_SYSTEM_FLOWS.md` covers ≥6 flows
- No duplicate migration prose — link + supersede headers only

---

## 10. Roadmap v2 Expansion Summary

### 10.1 Gaps Closed in Master Plan (Not in Code)

| Former gap                            | v2 artifact                                       |
| ------------------------------------- | ------------------------------------------------- |
| No architecture philosophy doc        | `ARCHITECTURE_PHILOSOPHY.md`                      |
| Flows only in discovery report        | `CANONICAL_SYSTEM_FLOWS.md`                       |
| Weak validation/serialization split   | `VALIDATION_SYSTEM.md`, `SERIALIZATION_SYSTEM.md` |
| No unified security model article     | `SECURITY_MODEL.md`                               |
| Infra split across many migration MDs | `INFRASTRUCTURE_AND_RESILIENCE.md` (consolidated) |
| No ERP extension playbook             | `FUTURE_MODULE_ARCHITECTURE.md`                   |
| No business rule registry             | `BUSINESS_RULES.md`                               |

### 10.2 Undocumented Infrastructure Flows (Now Scheduled)

| Flow                                    | Phase                 |
| --------------------------------------- | --------------------- |
| Event loop lag → warn                   | 6 / 7                 |
| Slow query → metrics + warn             | 5                     |
| RBAC `bumpGlobalPermissionCacheVersion` | 7                     |
| Worker `activeWorkers` shutdown await   | 7                     |
| `global.isShuttingDown` probe behavior  | 7                     |
| Email send (verification/reset)         | 2 (external boundary) |

### 10.3 Undocumented Security Boundaries (Now Scheduled)

| Boundary                           | Article                               |
| ---------------------------------- | ------------------------------------- |
| Middleware vs service authz        | `RBAC_SYSTEM`, `SECURITY_MODEL`       |
| 404 vs 403 on notes                | `SECURITY_MODEL`, `ownership-vs-rbac` |
| Rate limits (auth vs refresh)      | `SECURITY_MODEL`                      |
| Prisma password omit vs serializer | `SERIALIZATION_SYSTEM`                |

---

## 11. Planning Artifact Index (Project Root)

| File                               | Role                     |
| ---------------------------------- | ------------------------ |
| `KNOWLEDGE_BASE_ROADMAP.md`        | v2 hierarchy + phases    |
| `DOCUMENTATION_PHASES.md`          | Phases 0–10 specs        |
| `DOCUMENTATION_EXECUTION_ORDER.md` | AI + human session order |
| `SYSTEM_DEPENDENCY_GRAPH.md`       | Expanded graphs          |
| `KNOWLEDGE_BASE_EXPANSION_PLAN.md` | v1→v2 gap analysis       |
| `HIGH_RISK_SYSTEMS_REPORT.md`      | P0/P1 prioritization     |
| `ERP_DOMAIN_MODELING_PLAN.md`      | Domain + future modules  |
| `ARCHITECTURE_DISCOVERY_REPORT.md` | This file                |

---

_Execute Session 1a: `ARCHITECTURE_PHILOSOPHY.md` per `DOCUMENTATION_EXECUTION_ORDER.md`_
