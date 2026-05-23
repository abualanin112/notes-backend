# Architecture Recovery Blueprint

## A. CURRENT SYSTEM STATE
### Official Architecture
The intended architecture is a production-grade, single-tenant Notes API built on Node.js/Express, Prisma (PostgreSQL), and Docker. The application uses a repository-service-controller pattern. Observability is handled via Pino and an Audit Log table.

### Canonical Flows
- **Authentication**: JWT-based (access and refresh tokens). Handled by `auth.service.js` and Passport JWT strategy.
- **Authorization**: Database-Driven RBAC via `permissions` and `user_roles`. Handled by `auth.js` middleware (as a pure gate) and `authorization.service.js` (for ownership/ABAC checks).
- **Persistence**: Prisma ORM, leveraging single global Testcontainer for integration testing.

### Active Systems
- `auth.js` (middleware) uses `permission.service.js` for DB/Redis-backed permission checks.
- Redis caching wrapper (`src/config/redis.js`) implemented for RBAC cache, though currently failing due to missing dependency.
- Global integration testing setup via Vitest and Testcontainers (`tests/utils/globalSetup.js`).

---

## B. ARCHITECTURAL DRIFT REPORT
1. **Duplicate Systems**:
   - `src/config/roles.js` (Legacy array-based RBAC) is still present and exported.
   - `LegacyRole` enum on `User` model exists alongside `user_roles` relation.
2. **Stale Flows & Dangerous Coupling**:
   - Routes (`user.route.js`) still invoke `auth('manageUsers')` instead of the canonical `action:resource:scope` format (e.g. `auth('create:users:any')`).
   - `auth.service.js` line 73: `userRepository.findById(refreshTokenDoc.userId, tx)` tries to pass a transaction `tx` to `findById`, which may not be supported correctly depending on the repository implementation.
3. **Inconsistent Contracts**:
   - `role.validation.js` was created but is not wired into `index.js` routes.
   - `src/validations/user.validation.js` still contains logic for checking `'manageUsers'` and `'getUsers'`.
4. **Dead Abstractions**:
   - `redis` dependency is missing from `package.json`, causing fatal crashes in any file that imports `src/config/redis.js` (e.g., all integration tests).

---

## C. PHASED RECOVERY PLAN

### Phase 0 — System Mapping & Freeze
- **Goal**: Establish a safe baseline.
- **Scope**: Finalize inventory, verify missing dependencies, freeze feature dev.
- **Forbidden Changes**: No code deletion, no schema changes.
- **Exit Criteria**: All architectural drift documented. `redis` dependency explicitly triaged (install or remove).

### Phase 1 — Auth/Authz Stabilization
- **Goal**: Converge on the canonical Database-Driven RBAC.
- **Scope**: Update all route definitions (`user.route.js`, `note.route.js`) to use `action:resource:scope`. Update `user.validation.js` to remove legacy roles.
- **Forbidden Changes**: Do not change Prisma schema yet.
- **Test Requirements**: All auth middleware tests must pass locally.
- **Git Checkpoint**: `git commit -m "phase-1: auth/authz stabilization completed"`
- **Exit Criteria**: No legacy string permissions (`'manageUsers'`) exist in routes.

### Phase 2 — Test Recovery
- **Goal**: Restore the Vitest integration suite.
- **Scope**: Resolve the `redis` module missing error. Verify Testcontainers startup. Analyze and fix broken assertions from the RBAC shift.
- **Forbidden Changes**: Do not bypass tests; do not mock the database in integration tests.
- **Test Requirements**: `npm run test` must exit 0.
- **Git Checkpoint**: `git commit -m "phase-2: test recovery completed"`
- **Exit Criteria**: 100% pass rate on integration and unit tests.

### Phase 3 — Duplicate Removal (Safe Deletion)
- **Goal**: Remove stale legacy code.
- **Scope**: Delete `src/config/roles.js`. Remove legacy role validations. Clean up unused imports.
- **Forbidden Changes**: Do not delete DB columns yet.
- **Test Requirements**: Re-run tests to ensure no regressions.
- **Git Checkpoint**: `git commit -m "phase-3: duplicate code removal completed"`
- **Exit Criteria**: No references to `roleRights` or old roles array exist in the codebase.

### Phase 4 — DTO/API Cleanup
- **Goal**: Ensure consistent serialization and validation.
- **Scope**: Audit `serializers/` and `validations/`. Wire up the new `role.route.js` (if applicable) and `role.validation.js`.
- **Forbidden Changes**: No breaking changes to external API responses.
- **Test Requirements**: Integration tests must confirm API contracts.
- **Git Checkpoint**: `git commit -m "phase-4: DTO and API cleanup completed"`
- **Exit Criteria**: All inputs validated via Zod, outputs via serializers.

### Phase 5 — Worker & Infra Stabilization
- **Goal**: Ensure background tasks and caching are safe.
- **Scope**: Validate Redis fallback behavior. Check `tokenCleanup.worker.js` for correct transaction boundaries.
- **Forbidden Changes**: No structural infra redesign.
- **Git Checkpoint**: `git commit -m "phase-5: worker and infra stabilization completed"`
- **Exit Criteria**: Caching does not crash without Redis; workers execute gracefully.

### Phase 6 — Final Architecture Convergence
- **Goal**: Finalize database schema migration.
- **Scope**: Safely drop or finalize the deprecation of `LegacyRole` enum if confirmed. Run final security sweep.
- **Forbidden Changes**: No data loss.
- **Git Checkpoint**: `git commit -m "phase-6: final architecture convergence completed"`
- **Exit Criteria**: Clean, stable, production-grade backend architecture.
