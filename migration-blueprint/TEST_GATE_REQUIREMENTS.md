# Test Gate Requirements

> **Cardinal Rule**: No phase may proceed if any test gate fails.

---

## 1. Mandatory Test Suites

These suites MUST pass at every phase checkpoint. No exceptions. No skips. No `test.skip()`.

### Tier 1 — Security (BLOCKING)

| Suite                      | File                                                         | Invariant                                           |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| RBAC Escalation Prevention | `tests/integration/security.test.js`                         | A user with level 50 CANNOT assign a level 100 role |
| Redis Degradation          | `tests/integration/security.test.js`                         | Auth works with Redis down (returns 403, not 500)   |
| Infrastructure Degradation | `tests/integration/infrastructure/redis-degradation.test.js` | System degrades gracefully to memory cache          |

### Tier 2 — Integration (BLOCKING)

| Suite             | File                              | Invariant                                                      |
| ----------------- | --------------------------------- | -------------------------------------------------------------- |
| Auth Flows        | `tests/integration/auth.test.js`  | Login, register, refresh, logout, password reset, email verify |
| User CRUD         | `tests/integration/user.test.js`  | Create, read, update, delete with ownership checks             |
| Note CRUD         | `tests/integration/note.test.js`  | Create, read, update, delete with owner isolation              |
| Audit Persistence | `tests/integration/audit.test.js` | Audit logs created for all mutations                           |
| API Documentation | `tests/integration/docs.test.js`  | Swagger docs accessible in dev                                 |

### Tier 3 — Unit (BLOCKING)

| Suite             | File                                         | Invariant                     |
| ----------------- | -------------------------------------------- | ----------------------------- |
| Redis Cache       | `tests/unit/config/redis.test.js`            | Cache get/set/del operations  |
| Error Middleware  | `tests/unit/middlewares/error.test.js`       | Error conversion and handling |
| Repositories      | `tests/unit/repositories/repository.test.js` | Repository layer operations   |
| Serializers       | `tests/unit/serializers/*.test.js`           | DTO output shape              |
| Pagination        | `tests/unit/utils/paginate.test.js`          | Offset pagination             |
| Cursor Pagination | `tests/unit/utils/paginateCursor.test.js`    | Cursor pagination             |
| Password          | `tests/unit/utils/password.test.js`          | Hash + compare                |

## 2. Phase-Specific Gate Criteria

### Phase 0 Gate

- `npm test` — all green
- Baseline coverage recorded

### Phase 1 Gate

- `npm test` — all green
- `node -e "require('./src/shared/kernel')"` — no circular import errors

### Phase 2 Gate

- `npm test` — all green
- `node -e "require('./src/config/prisma').$reconnect"` — Prisma proxy adapter works

### Phase 3 Gate

- `npm test` — all green
- `security.test.js` — UNCHANGED source, UNCHANGED results
- `auth.test.js` — all flows pass
- `node -e "require('./src/modules/iam').permissionService"` — IAM contract resolves

### Phase 4 Gate

- `npm test` — all green
- `note.test.js` — all CRUD operations pass
- `user.test.js` — user delete cascades to notes

### Phase 5 Gate

- `npm test` — all green
- `audit.test.js` — UNCHANGED
- Verify: after a Note create, the AuditLog row exists

### Phase 6 Gate

- `npm test` — all green
- `npm run lint` — boundary rules pass
- Verify: `GET /v1/auth/...`, `GET /v1/users/...`, `GET /v1/notes/...` all resolve

### Phase 7 Gate

- `npm test` — all green
- **NEW** `transaction-atomicity.test.js` — cross-module rollback verified
- Verify: forced failure after audit write rolls back BOTH entity and audit

### Phase 8 Gate

- `npm test` — all green
- Coverage ≥ Phase 0 baseline
- All RBAC tables truncated between tests

### Phase 9 Gate

- `npm test` — all green
- `npm run lint` — all green
- `grep` verification — zero stale imports
- Coverage ≥ Phase 0 baseline

## 3. Coverage Requirements

| Metric            | Minimum                                 | Policy                 |
| ----------------- | --------------------------------------- | ---------------------- |
| Line Coverage     | Must not decrease from Phase 0 baseline | BLOCKING               |
| Branch Coverage   | Must not decrease from Phase 0 baseline | WARNING (non-blocking) |
| Function Coverage | Must not decrease from Phase 0 baseline | BLOCKING               |

## 4. Invariant Regression Matrix

These invariants are the NON-NEGOTIABLE correctness guarantees:

| ID     | Invariant                                                        | Test Coverage                              |
| ------ | ---------------------------------------------------------------- | ------------------------------------------ |
| INV-01 | A user without `read:notes:any` cannot read another user's notes | `note.test.js`                             |
| INV-02 | A user cannot assign a role with a higher privilege level        | `security.test.js`                         |
| INV-03 | Token reuse triggers family revocation                           | `auth.test.js`                             |
| INV-04 | If a Note creation fails, no AuditLog exists                     | `transaction-atomicity.test.js` (Phase 7+) |
| INV-05 | User serializer NEVER includes password                          | `user.serializer.test.js`                  |
| INV-06 | Note serializer output shape is stable                           | `note.serializer.test.js`                  |
| INV-07 | System returns 403 (not 500) when Redis is down                  | `security.test.js`                         |
| INV-08 | Deleted user's notes are also deleted                            | `user.test.js`                             |
| INV-09 | Audit metadata strips forbidden keys (password, token)           | Unit test in audit module                  |
| INV-10 | `actorId` in audit logs is non-null for authenticated operations | `audit.test.js`                            |
