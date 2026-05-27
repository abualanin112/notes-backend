# Phase 9 — Final Convergence & Cleanup

> **Risk Level**: LOW  
> **Estimated Duration**: 2–3 days  
> **Branch**: `refactor/phase-9-final-convergence`  
> **Prerequisite**: Phase 8 complete (tag `checkpoint/phase-8-complete`)

---

## Goal

Remove ALL temporary re-export adapters, stale barrel exports, dead code, and compatibility shims. Verify the architecture has:

- ONE canonical RBAC flow
- ONE canonical audit pipeline
- ONE canonical Prisma ownership model
- ONE canonical transaction propagation model
- ZERO duplicate abstractions
- ZERO stale adapters
- ZERO temporary compatibility layers

## Scope — Deletions

### Re-Export Adapters to Delete

| Adapter Path                              | Original Target                                        | Status         |
| ----------------------------------------- | ------------------------------------------------------ | -------------- |
| `src/utils/ApiError.js`                   | `src/shared/kernel/ApiError.js`                        | DELETE adapter |
| `src/utils/catchAsync.js`                 | `src/shared/kernel/catchAsync.js`                      | DELETE adapter |
| `src/utils/pick.js`                       | `src/shared/kernel/pick.js`                            | DELETE adapter |
| `src/utils/paginate.js`                   | `src/shared/kernel/paginate.js`                        | DELETE adapter |
| `src/utils/paginateCursor.js`             | `src/shared/kernel/paginateCursor.js`                  | DELETE adapter |
| `src/utils/password.js`                   | `src/shared/kernel/password.js`                        | DELETE adapter |
| `src/config/als.js`                       | `src/shared/kernel/als.js`                             | DELETE adapter |
| `src/config/logger.js`                    | `src/shared/kernel/logger.js`                          | DELETE adapter |
| `src/config/config.js`                    | `src/shared/kernel/config.js`                          | DELETE adapter |
| `src/config/tokens.js`                    | `src/shared/kernel/tokens.js`                          | DELETE adapter |
| `src/config/metrics.js`                   | `src/shared/kernel/metrics.js`                         | DELETE adapter |
| `src/config/pinoHttp.js`                  | `src/shared/kernel/pinoHttp.js`                        | DELETE adapter |
| `src/config/prisma.js`                    | `src/shared/infrastructure/database/prisma.js`         | DELETE adapter |
| `src/config/redis.js`                     | `src/shared/infrastructure/cache/redis.js`             | DELETE adapter |
| `src/middlewares/error.js`                | `src/shared/kernel/middleware/error.js`                | DELETE adapter |
| `src/middlewares/rateLimiter.js`          | `src/shared/kernel/middleware/rateLimiter.js`          | DELETE adapter |
| `src/middlewares/validate.js`             | `src/shared/kernel/middleware/validate.js`             | DELETE adapter |
| `src/middlewares/response.interceptor.js` | `src/shared/kernel/middleware/response.interceptor.js` | DELETE adapter |
| `src/middlewares/auth.js`                 | `src/modules/iam/middleware/auth.js`                   | DELETE adapter |
| `src/services/index.js`                   | (barrel)                                               | DELETE         |
| `src/controllers/index.js`                | (barrel)                                               | DELETE         |
| `src/repositories/index.js`               | (barrel)                                               | DELETE         |
| `src/validations/index.js`                | (barrel)                                               | DELETE         |

### Import Path Updates

ALL remaining imports that use old paths must be updated to their canonical module paths. This includes test files:

| Test File                            | Old Import                           | New Import                                            |
| ------------------------------------ | ------------------------------------ | ----------------------------------------------------- |
| `tests/fixtures/user.fixture.js`     | `require('../../src/config/prisma')` | `require('../../src/shared/infrastructure/database')` |
| `tests/fixtures/note.fixture.js`     | `require('../../src/config/prisma')` | `require('../../src/shared/infrastructure/database')` |
| `tests/integration/security.test.js` | `require('../../src/config/prisma')` | `require('../../src/shared/infrastructure/database')` |
| `tests/integration/security.test.js` | `require('../../src/config/redis')`  | `require('../../src/shared/infrastructure/cache')`    |
| `tests/utils/setupTestDB.js`         | `require('../../src/config/prisma')` | `require('../../src/shared/infrastructure/database')` |

### Empty Directories Removed

Delete all now-empty legacy directories:

- `src/utils/` (if empty)
- `src/config/` (only `passport.js` should have moved to IAM; verify empty)
- `src/middlewares/` (if empty)
- `src/controllers/` (if empty)
- `src/services/` (if empty)
- `src/repositories/` (if empty)
- `src/routes/v1/` (only `docs.route.js` may remain)
- `src/serializers/` (if empty)
- `src/workers/` (if empty)

## Forbidden Changes

- **DO NOT** change any business logic.
- **DO NOT** change any test assertions.
- **DO NOT** change the Prisma schema.

## Risk Level

**LOW** — All behavioural changes were made in Phases 1–8. This phase only removes dead code and updates import paths.

## Required Green Tests

| Suite          | Must Pass                          |
| -------------- | ---------------------------------- |
| ALL suites     | ✅                                 |
| `npm run lint` | ✅ (boundary rules fully enforced) |

## Verification Checklist

1. ✅ `grep -r "require.*\.\./config/" src/` returns ZERO results.
2. ✅ `grep -r "require.*\.\./utils/" src/` returns ZERO results.
3. ✅ `grep -r "require.*\.\./middlewares/" src/` returns ZERO results (outside shared kernel).
4. ✅ `grep -r "require.*\.\./services/" src/` returns ZERO results (outside modules).
5. ✅ `grep -r "require.*\.\./repositories/" src/` returns ZERO results (outside modules).
6. ✅ `grep -r "require.*\.\./controllers/" src/` returns ZERO results (outside modules).
7. ✅ No re-export adapter files remain in `src/`.
8. ✅ Full `npm test` passes.
9. ✅ `npm run lint` passes with boundary rules.
10. ✅ Coverage baseline maintained or improved.

## Final Directory Structure

```
src/
  app.js                           (App Shell — mounts module routers)
  index.js                         (Bootstrap & shutdown)
  shared/
    kernel/
      als.js
      ApiError.js
      catchAsync.js
      config.js
      logger.js
      metrics.js
      paginate.js
      paginateCursor.js
      password.js
      pick.js
      pinoHttp.js
      tokens.js
      middleware/
        error.js
        rateLimiter.js
        response.interceptor.js
        validate.js
      index.js
    infrastructure/
      database/
        prisma.js
        transactionContext.js
        index.js
      cache/
        redis.js
        index.js
      index.js
    testing/
      (shared test utilities)
  modules/
    iam/
      config/
        passport.js
      controllers/
        auth.controller.js
        user.controller.js
      middleware/
        auth.js
      repositories/
        user.repository.js
        token.repository.js
      routes/
        auth.route.js
        user.route.js
      serializers/
        user.serializer.js
      services/
        auth.service.js
        authorization.service.js
        email.service.js
        permission.service.js
        token.service.js
        user.service.js
      validations/
        auth.validation.js
        custom.validation.js
        role.validation.js
        user.validation.js
      workers/
        tokenCleanup.worker.js
      index.js
    notes/
      controllers/
        note.controller.js
      policies/
        note.policy.js
      repositories/
        note.repository.js
      routes/
        note.route.js
      serializers/
        note.serializer.js
      services/
        note.service.js
      validations/
        note.validation.js
      index.js
    audit/
      repositories/
        audit.repository.js
      services/
        audit.service.js
      index.js
  docs/
    swaggerDef.js
    components.yml
  routes/
    v1/
      docs.route.js               (remains — development-only)
```

## Exit Criteria

1. ✅ Zero re-export adapters in `src/`.
2. ✅ Zero stale barrel exports.
3. ✅ Final directory structure matches the blueprint above.
4. ✅ Full `npm test` passes.
5. ✅ `npm run lint` passes with all boundary rules enforced.
6. ✅ Tag `release/modular-monolith-v1.0`.

## Rollback Strategy

```bash
git checkout checkpoint/phase-8-complete
```
