# Phase 2 — Infrastructure Isolation

> **Risk Level**: MEDIUM  
> **Estimated Duration**: 3–4 days  
> **Branch**: `refactor/phase-2-infrastructure`  
> **Prerequisite**: Phase 1 complete (tag `checkpoint/phase-1-complete`)

---

## Goal

Wrap the Prisma database proxy, Redis cache, and background worker infrastructure behind abstract interfaces. After this phase, no domain module will directly `require('../config/prisma')` — they will receive a database interface through the Shared Kernel's infrastructure layer.

## Scope — Files Moved & Created

### Moved

| Current Path             | Target Path                                    |
| ------------------------ | ---------------------------------------------- |
| `src/config/prisma.js`   | `src/shared/infrastructure/database/prisma.js` |
| `src/config/redis.js`    | `src/shared/infrastructure/cache/redis.js`     |
| `src/config/passport.js` | (STAYS — moved in Phase 3 to IAM)              |

### Created

| Path                                          | Purpose                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/shared/infrastructure/database/index.js` | Exports `prisma`, `runInTransaction`                                                 |
| `src/shared/infrastructure/cache/index.js`    | Exports `cacheGet`, `cacheSet`, `cacheDel`, `cacheIncr`, `isDegraded`, `resetClient` |
| `src/shared/infrastructure/index.js`          | Barrel export for all infrastructure                                                 |

### Re-Export Adapters

| Old Path               | Adapter Points To                          |
| ---------------------- | ------------------------------------------ |
| `src/config/prisma.js` | `../shared/infrastructure/database/prisma` |
| `src/config/redis.js`  | `../shared/infrastructure/cache/redis`     |

### Refactored

| File                        | Change                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/repositories/index.js` | `runInTransaction` now imports from `src/shared/infrastructure/database` instead of directly calling `prisma.$transaction` |

## Forbidden Changes

- **DO NOT** modify any service business logic.
- **DO NOT** change the Prisma schema.
- **DO NOT** change the Redis circuit breaker behaviour.
- **DO NOT** change the Prisma proxy reconnection mechanism (`$reconnect`).
- **DO NOT** modify test files (adapters ensure backward compatibility).
- **DO NOT** move `tokenCleanup.worker.js` yet (moved in Phase 3 with IAM).

## Risk Level

**MEDIUM** — The Prisma proxy (`new Proxy({}, {...})`) is fragile. Moving it while maintaining the `$reconnect()` hook used by `setupTestDB.js` requires careful path verification.

## Required Green Tests

| Suite                                                        | Must Pass | Why Critical                                                       |
| ------------------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `tests/integration/auth.test.js`                             | ✅        | Uses `runInTransaction` extensively via `refreshAuth`              |
| `tests/integration/note.test.js`                             | ✅        | All CRUD operations use `runInTransaction`                         |
| `tests/integration/security.test.js`                         | ✅        | RBAC resolution touches Prisma directly in `permission.service.js` |
| `tests/integration/infrastructure/redis-degradation.test.js` | ✅        | Validates Redis fallback still works from new path                 |
| `tests/unit/config/redis.test.js`                            | ✅        | Unit tests for Redis cache operations                              |
| All other suites                                             | ✅        | Full regression                                                    |

## Required Regression Tests

- Full `npm test`.
- Manually verify `setupTestDB.js` still calls `prisma.$reconnect()` successfully through the re-export adapter.

## Rollback Strategy

```bash
git checkout checkpoint/phase-1-complete
```

No schema changes. Pure code structure revert.

## Exit Criteria

1. ✅ `src/shared/infrastructure/database/prisma.js` is the canonical Prisma proxy location.
2. ✅ `src/shared/infrastructure/cache/redis.js` is the canonical Redis location.
3. ✅ Re-export adapters exist at old paths (`src/config/prisma.js`, `src/config/redis.js`).
4. ✅ `runInTransaction` is exported from `src/shared/infrastructure/database/index.js`.
5. ✅ `npm test` passes with zero failures.
6. ✅ `setupTestDB.js` `$reconnect()` call works through the proxy chain.
7. ✅ Tag `checkpoint/phase-2-complete`.

## Expected Refactor Pattern

- **Dependency Inversion**: Domain code depends on abstract infrastructure interfaces, not concrete Prisma/Redis implementations.
- **Move + Adapter**: Same Strangler Fig approach as Phase 1.

## Operational Risks

| Risk                                                                                                                       | Likelihood | Impact                                    | Mitigation                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Prisma proxy `$reconnect()` breaks when the proxy object is re-exported through an adapter                                 | **HIGH**   | Testcontainers integration tests fail     | Test `$reconnect()` explicitly: `require('../../src/config/prisma').$reconnect()` must work through the adapter chain    |
| `dotenv` path in `config.js` already changed in Phase 1; infrastructure files that depend on `config` may have stale paths | Medium     | App fails on boot                         | Verify all moved files resolve `config` through the Shared Kernel barrel, not relative paths                             |
| `redis.test.js` imports `../../src/config/redis` directly                                                                  | Medium     | Unit test breaks                          | Verify the re-export adapter resolves correctly                                                                          |
| `permission.service.js` directly imports `prisma` and `redis`                                                              | **HIGH**   | If adapters fail, RBAC resolution crashes | Do NOT touch `permission.service.js` imports yet — it still uses old paths which resolve via adapters. Moved in Phase 3. |

## Detailed Steps

### Step 2.1 — Create Infrastructure Directory Structure

```
src/shared/infrastructure/
  database/
    prisma.js      (moved from src/config/prisma.js)
    index.js       (exports prisma + runInTransaction)
  cache/
    redis.js       (moved from src/config/redis.js)
    index.js       (exports cache operations)
  index.js         (barrel)
```

### Step 2.2 — Move Prisma Proxy

Move `src/config/prisma.js` → `src/shared/infrastructure/database/prisma.js`.
Update the internal `require('./config')` and `require('./logger')` to point to Shared Kernel paths.
Create re-export adapter at `src/config/prisma.js`.

### Step 2.3 — Move Redis Module

Move `src/config/redis.js` → `src/shared/infrastructure/cache/redis.js`.
Update internal imports. Create re-export adapter.

### Step 2.4 — Refactor `repositories/index.js`

Change `runInTransaction` to import from `src/shared/infrastructure/database`:

```javascript
const { runInTransaction } = require('../shared/infrastructure/database');
```

### Step 2.5 — Verify Test Infrastructure

```bash
npm test
```

Specifically watch for:

- `setupTestDB.js` — `prisma.$reconnect()` resolution
- `redis-degradation.test.js` — `redisConfig.resetClient()` resolution

### Step 2.6 — Tag

```bash
git tag checkpoint/phase-2-complete
```
