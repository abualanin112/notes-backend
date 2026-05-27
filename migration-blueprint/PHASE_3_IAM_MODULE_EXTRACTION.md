# Phase 3 — IAM Module Extraction

> **Risk Level**: HIGH  
> **Estimated Duration**: 5–7 days  
> **Branch**: `refactor/phase-3-iam-extraction`  
> **Prerequisite**: Phase 2 complete (tag `checkpoint/phase-2-complete`)

---

## Goal

Extract the Identity & Access Management (IAM) bounded context into `src/modules/iam/`. This module will own authentication, authorization, users, tokens, roles, permissions, and the token cleanup worker. It will expose a strict public contract that other modules consume.

## Scope — Files Moved

| Current Path                            | Target Path                                         |
| --------------------------------------- | --------------------------------------------------- |
| `src/services/auth.service.js`          | `src/modules/iam/services/auth.service.js`          |
| `src/services/user.service.js`          | `src/modules/iam/services/user.service.js`          |
| `src/services/token.service.js`         | `src/modules/iam/services/token.service.js`         |
| `src/services/permission.service.js`    | `src/modules/iam/services/permission.service.js`    |
| `src/services/authorization.service.js` | `src/modules/iam/services/authorization.service.js` |
| `src/services/email.service.js`         | `src/modules/iam/services/email.service.js`         |
| `src/repositories/user.repository.js`   | `src/modules/iam/repositories/user.repository.js`   |
| `src/repositories/token.repository.js`  | `src/modules/iam/repositories/token.repository.js`  |
| `src/controllers/auth.controller.js`    | `src/modules/iam/controllers/auth.controller.js`    |
| `src/controllers/user.controller.js`    | `src/modules/iam/controllers/user.controller.js`    |
| `src/routes/v1/auth.route.js`           | `src/modules/iam/routes/auth.route.js`              |
| `src/routes/v1/user.route.js`           | `src/modules/iam/routes/user.route.js`              |
| `src/validations/auth.validation.js`    | `src/modules/iam/validations/auth.validation.js`    |
| `src/validations/user.validation.js`    | `src/modules/iam/validations/user.validation.js`    |
| `src/validations/role.validation.js`    | `src/modules/iam/validations/role.validation.js`    |
| `src/validations/custom.validation.js`  | `src/modules/iam/validations/custom.validation.js`  |
| `src/serializers/user.serializer.js`    | `src/modules/iam/serializers/user.serializer.js`    |
| `src/middlewares/auth.js`               | `src/modules/iam/middleware/auth.js`                |
| `src/config/passport.js`                | `src/modules/iam/config/passport.js`                |
| `src/workers/tokenCleanup.worker.js`    | `src/modules/iam/workers/tokenCleanup.worker.js`    |

### Re-Export Adapters Created at ALL Old Paths

Every old path gets a re-export stub pointing to the new module location.

### Public Contract — `src/modules/iam/index.js`

```javascript
// IAM Module Public Contract
// NO OTHER MODULE may import below this boundary.

const authService = require('./services/auth.service');
const userService = require('./services/user.service');
const tokenService = require('./services/token.service');
const permissionService = require('./services/permission.service');
const authorizationService = require('./services/authorization.service');
const authMiddleware = require('./middleware/auth');
const authRouter = require('./routes/auth.route');
const userRouter = require('./routes/user.route');
const { serializeUser } = require('./serializers/user.serializer');

module.exports = {
  // Services
  authService,
  userService,
  tokenService,
  permissionService,
  authorizationService,

  // Middleware
  authMiddleware,

  // Routers
  authRouter,
  userRouter,

  // Serializers
  serializeUser,

  // Worker
  startTokenCleanupJob: require('./workers/tokenCleanup.worker').startTokenCleanupJob,
};
```

## Forbidden Changes

- **DO NOT** change any RBAC resolution logic (`matchesPermission`, `hasPermission`, scope escalation).
- **DO NOT** change the privilege escalation prevention logic (`assertCanAssignRole`).
- **DO NOT** change the token refresh rotation or reuse-detection logic.
- **DO NOT** modify the Prisma schema.
- **DO NOT** modify test files yet (adapters handle backward compatibility).
- **DO NOT** remove `assertCanManageNote` from `authorization.service.js` yet — the Notes module will absorb it in Phase 4.

## Risk Level

**HIGH** — The IAM module is the most depended-upon code in the system. Every authenticated request flows through `auth.js` middleware → `permission.service.js`. A broken import path here means total system failure.

## Required Green Tests

| Suite                                | Must Pass | Why Critical                                            |
| ------------------------------------ | --------- | ------------------------------------------------------- |
| `tests/integration/auth.test.js`     | ✅        | Core auth flows: login, register, refresh, logout       |
| `tests/integration/user.test.js`     | ✅        | User CRUD with ownership assertions                     |
| `tests/integration/security.test.js` | ✅        | **CRITICAL** — Escalation prevention, Redis degradation |
| `tests/integration/note.test.js`     | ✅        | Notes depend on IAM for auth middleware                 |
| `tests/integration/audit.test.js`    | ✅        | Audit depends on IAM for actorId                        |
| All unit tests                       | ✅        | Full regression                                         |

## Required Regression Tests

- `tests/integration/security.test.js` — escalation prevention MUST pass unchanged.
- Verify `auth.js` middleware correctly resolves `permissionService.getUserPermissions` through the module path chain.
- Verify `tokenCleanup.worker.js` still runs and acquires Redis lock.

## Rollback Strategy

```bash
git checkout checkpoint/phase-2-complete
```

All re-export adapters mean the old paths still work. Rollback is safe.

## Exit Criteria

1. ✅ `src/modules/iam/` contains all IAM-related files.
2. ✅ `src/modules/iam/index.js` exports the public contract.
3. ✅ All old paths contain re-export adapters.
4. ✅ `security.test.js` passes UNCHANGED.
5. ✅ Full `npm test` passes with zero failures.
6. ✅ Tag `checkpoint/phase-3-complete`.

## Expected Refactor Pattern

- **Module Extraction**: Group by bounded context, not technical layer.
- **Move + Adapter**: Strangler Fig — old paths re-export to new locations.
- **Interface Wrapping**: Public contract via `index.js` barrel.

## Operational Risks

| Risk                                                                                                                                | Likelihood   | Impact                                 | Mitigation                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permission.service.js` directly imports `prisma` — path may break after move                                                       | **HIGH**     | RBAC resolution fails → all auth fails | Update internal import to use infrastructure re-export adapter: `require('../../config/prisma')` still resolves via adapter                                             |
| `token.service.js` has circular dependency with `user.service.js` (`generateResetPasswordToken` calls `userService.getUserByEmail`) | **HIGH**     | Module crashes on `require()`          | Verify circular resolution. If needed, defer `userService` import using lazy `require()` inside the function body                                                       |
| `user.service.js` imports `noteRepository` for cascade deletion (`deleteUserById`) — cross-module leak                              | **CRITICAL** | Violates module boundary               | **Temporary adapter**: Keep the `noteRepository` import via re-export for now. In Phase 4, replace with a cross-module call to `NotesModule.deleteNotesForUser(userId)` |
| Redis cache invalidation in `permission.service.js` may reference stale cache keys                                                  | Low          | Stale RBAC data                        | Cache behaviour is unchanged — only file locations move                                                                                                                 |

## Critical Coupling to Resolve

### `user.service.js` → `noteRepository.deleteManyByOwnerId`

This is a **cross-module boundary violation** that cannot be resolved in this phase. The current implementation:

```javascript
// user.service.js line 132
await noteRepository.deleteManyByOwnerId(userId, tx);
```

**Interim solution**: The re-export adapter for `noteRepository` at the old path continues to resolve. This will be replaced by a proper cross-module contract in Phase 4.
