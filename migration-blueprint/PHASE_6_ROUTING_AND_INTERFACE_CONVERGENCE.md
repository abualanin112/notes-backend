# Phase 6 — Routing & Interface Convergence

> **Risk Level**: MEDIUM  
> **Estimated Duration**: 2–3 days  
> **Branch**: `refactor/phase-6-routing-convergence`  
> **Prerequisite**: Phase 5 complete (tag `checkpoint/phase-5-complete`)

---

## Goal

Dismantle the monolithic `src/routes/v1/index.js` router hub and convert `src/app.js` into a thin App Shell that mounts module-owned routers directly. Enable the ESLint boundary rules that were deferred since Phase 0.

## Scope — Files Modified

### Deleted

| Path                          | Reason                                                                   |
| ----------------------------- | ------------------------------------------------------------------------ |
| `src/routes/v1/index.js`      | Replaced by direct module router mounting in `app.js`                    |
| `src/routes/v1/auth.route.js` | Re-export adapter — replaced by `src/modules/iam/routes/auth.route.js`   |
| `src/routes/v1/user.route.js` | Re-export adapter — replaced by `src/modules/iam/routes/user.route.js`   |
| `src/routes/v1/note.route.js` | Re-export adapter — replaced by `src/modules/notes/routes/note.route.js` |
| `src/controllers/index.js`    | Re-export barrel — replaced by module-level imports                      |
| `src/services/index.js`       | Re-export barrel — replaced by module-level imports                      |
| `src/validations/index.js`    | Re-export barrel — replaced by module-level imports                      |
| `src/repositories/index.js`   | Re-export barrel — replaced by module-level imports                      |

### Modified — `src/app.js`

Replace the monolithic router mount:

```javascript
// BEFORE
const routes = require('./routes/v1');
app.use('/v1', routes);

// AFTER
const { authRouter, userRouter } = require('./modules/iam');
const { noteRouter } = require('./modules/notes');
const docsRoute = require('./routes/v1/docs.route');

app.use('/v1/auth', authRouter);
app.use('/v1/users', userRouter);
app.use('/v1/notes', noteRouter);
if (config.env === 'development') {
  app.use('/v1/docs', docsRoute);
}
```

### Modified — `src/index.js`

Update the worker import:

```javascript
// BEFORE
const { startTokenCleanupJob } = require('./workers/tokenCleanup.worker');

// AFTER
const { startTokenCleanupJob } = require('./modules/iam');
```

### Modified — `.eslintrc.json`

Enable boundary enforcement rules:

```json
{
  "settings": {
    "boundaries/elements": [
      { "type": "shared", "pattern": "src/shared/*" },
      { "type": "iam", "pattern": "src/modules/iam/*" },
      { "type": "notes", "pattern": "src/modules/notes/*" },
      { "type": "audit", "pattern": "src/modules/audit/*" }
    ]
  },
  "rules": {
    "boundaries/element-types": [
      "error",
      {
        "default": "disallow",
        "rules": [
          { "from": "shared", "allow": ["shared"] },
          { "from": "iam", "allow": ["shared", "iam"] },
          { "from": "notes", "allow": ["shared", "iam", "notes", "audit"] },
          { "from": "audit", "allow": ["shared", "audit"] }
        ]
      }
    ]
  }
}
```

## Forbidden Changes

- **DO NOT** change any service, repository, or business logic.
- **DO NOT** change the response envelope structure.
- **DO NOT** modify the Prisma schema.
- **DO NOT** change the order of middleware in the Express pipeline.

## Risk Level

**MEDIUM** — Route mounting order matters. Misplacing the `serializeResponse` middleware or the error handler will break the entire API response contract.

## Required Green Tests

| Suite                                | Must Pass | Why Critical                          |
| ------------------------------------ | --------- | ------------------------------------- |
| `tests/integration/auth.test.js`     | ✅        | Auth routes must mount at `/v1/auth`  |
| `tests/integration/user.test.js`     | ✅        | User routes must mount at `/v1/users` |
| `tests/integration/note.test.js`     | ✅        | Note routes must mount at `/v1/notes` |
| `tests/integration/docs.test.js`     | ✅        | Docs route conditional mounting       |
| `tests/integration/security.test.js` | ✅        | RBAC middleware still applied         |
| All other suites                     | ✅        | Full regression                       |

## Rollback Strategy

```bash
git checkout checkpoint/phase-5-complete
```

## Exit Criteria

1. ✅ `src/routes/v1/index.js` no longer exists.
2. ✅ `src/app.js` mounts routers directly from module contracts.
3. ✅ ESLint boundary rules are enabled and pass `npm run lint`.
4. ✅ No old re-export adapters remain for routes, controllers, services, or repositories barrels.
5. ✅ Full `npm test` passes.
6. ✅ Tag `checkpoint/phase-6-complete`.

## Expected Refactor Pattern

- **Interface Convergence**: Replace barrel re-exports with direct module imports.
- **App Shell Assembly**: `app.js` becomes a thin orchestrator.

## Operational Risks

| Risk                                                                                                                  | Likelihood | Impact                       | Mitigation                                                            |
| --------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------- | --------------------------------------------------------------------- |
| Rate limiter `app.use('/v1', apiLimiter)` no longer applies to all routes if mount paths change                       | Medium     | API rate limiting disabled   | Verify rate limiter is applied BEFORE module routers                  |
| `serializeResponse` middleware must be after all route handlers                                                       | Medium     | Empty responses              | Verify middleware ordering in `app.js`                                |
| `auth()` middleware in `note.route.js` imports from `../../middlewares/auth` — old path adapter may have been deleted | **HIGH**   | 500 error on all note routes | Update `note.route.js` import to `../../iam` or verify adapter exists |
