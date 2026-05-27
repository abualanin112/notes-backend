# Phase 1 — Shared Kernel Extraction

> **Risk Level**: LOW  
> **Estimated Duration**: 2–3 days  
> **Branch**: `refactor/phase-1-shared-kernel`  
> **Prerequisite**: Phase 0 complete (tag `checkpoint/phase-0-complete`)

---

## Goal

Move all non-domain, infrastructure-agnostic utilities into `src/shared/kernel/`. This establishes the foundational dependency layer that all future modules will import from, replacing scattered relative `../config/` and `../utils/` paths.

## Scope — Files Moved

| Current Path                              | Target Path                                            |
| ----------------------------------------- | ------------------------------------------------------ |
| `src/utils/ApiError.js`                   | `src/shared/kernel/ApiError.js`                        |
| `src/utils/catchAsync.js`                 | `src/shared/kernel/catchAsync.js`                      |
| `src/utils/pick.js`                       | `src/shared/kernel/pick.js`                            |
| `src/utils/paginate.js`                   | `src/shared/kernel/paginate.js`                        |
| `src/utils/paginateCursor.js`             | `src/shared/kernel/paginateCursor.js`                  |
| `src/utils/password.js`                   | `src/shared/kernel/password.js`                        |
| `src/config/als.js`                       | `src/shared/kernel/als.js`                             |
| `src/config/logger.js`                    | `src/shared/kernel/logger.js`                          |
| `src/config/config.js`                    | `src/shared/kernel/config.js`                          |
| `src/config/tokens.js`                    | `src/shared/kernel/tokens.js`                          |
| `src/config/metrics.js`                   | `src/shared/kernel/metrics.js`                         |
| `src/config/pinoHttp.js`                  | `src/shared/kernel/pinoHttp.js`                        |
| `src/middlewares/error.js`                | `src/shared/kernel/middleware/error.js`                |
| `src/middlewares/rateLimiter.js`          | `src/shared/kernel/middleware/rateLimiter.js`          |
| `src/middlewares/validate.js`             | `src/shared/kernel/middleware/validate.js`             |
| `src/middlewares/response.interceptor.js` | `src/shared/kernel/middleware/response.interceptor.js` |

### Re-Export Adapters Created

For EVERY moved file, create a **temporary re-export adapter** at the old path:

```javascript
// src/utils/ApiError.js (adapter — to be removed in Phase 9)
module.exports = require('../shared/kernel/ApiError');
```

This ensures ALL existing `require()` calls continue to resolve without changing consumer code. The Strangler Fig pattern in action.

### Barrel Export Created

`src/shared/kernel/index.js`:

```javascript
module.exports = {
  ApiError: require('./ApiError'),
  catchAsync: require('./catchAsync'),
  pick: require('./pick'),
  paginate: require('./paginate'),
  paginateCursor: require('./paginateCursor'),
  password: require('./password'),
  als: require('./als'),
  logger: require('./logger'),
  config: require('./config'),
  tokens: require('./tokens'),
  metrics: require('./metrics'),
  pinoHttp: require('./pinoHttp'),
};
```

## Forbidden Changes

- **DO NOT** modify any service, controller, or repository business logic.
- **DO NOT** modify the Prisma schema.
- **DO NOT** modify any test file (adapters ensure tests continue to work).
- **DO NOT** move `config/prisma.js` or `config/redis.js` (these are infrastructure, handled in Phase 2).
- **DO NOT** move `config/passport.js` (this is IAM-specific, handled in Phase 3).

## Risk Level

**LOW** — Pure file reorganisation with re-export adapters guaranteeing zero breaking changes.

## Required Green Tests

| Suite                                                        | Must Pass |
| ------------------------------------------------------------ | --------- |
| `tests/integration/auth.test.js`                             | ✅        |
| `tests/integration/note.test.js`                             | ✅        |
| `tests/integration/user.test.js`                             | ✅        |
| `tests/integration/audit.test.js`                            | ✅        |
| `tests/integration/security.test.js`                         | ✅        |
| `tests/integration/docs.test.js`                             | ✅        |
| `tests/integration/infrastructure/redis-degradation.test.js` | ✅        |
| `tests/unit/**/*.test.js`                                    | ✅        |

## Required Regression Tests

- Full `npm test`.
- `tests/unit/utils/password.test.js` — validates password hashing still works from the new path.
- `tests/unit/utils/paginate.test.js` — validates pagination still works.

## Rollback Strategy

```bash
git revert --no-commit HEAD~N  # where N = commits in this phase
# OR
git checkout checkpoint/phase-0-complete
```

No data changes. No schema changes. Rollback is a pure code revert.

## Exit Criteria

1. ✅ `src/shared/kernel/` contains all listed utility files.
2. ✅ All old paths contain re-export adapters.
3. ✅ `src/shared/kernel/index.js` barrel export exists.
4. ✅ `npm test` passes with zero failures.
5. ✅ No file in `src/shared/kernel/` imports from `src/modules/`, `src/services/`, `src/controllers/`, or `src/repositories/`.
6. ✅ Tag `checkpoint/phase-1-complete` created.

## Expected Refactor Pattern

- **Move + Adapter**: Move the real file, leave a re-export stub at the old path.
- **Barrel Export**: Provide a single-import surface for the Shared Kernel.

## Operational Risks

| Risk                                           | Likelihood | Impact                     | Mitigation                                                                                                                   |
| ---------------------------------------------- | ---------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Circular dependency via re-exports             | Low        | Tests crash on boot        | Run `node -e "require('./src/shared/kernel')"` after each move to verify no circular imports                                 |
| `dotenv` path resolution breaks in `config.js` | Medium     | App fails to start         | The `path.join(__dirname, '../../.env')` becomes `path.join(__dirname, '../../../.env')`. Update the path in the moved file. |
| Vitest coverage exclusion paths break          | Low        | Coverage report inaccurate | Update `vitest.config.js` coverage `exclude` array to reflect new paths                                                      |
