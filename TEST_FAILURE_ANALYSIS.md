# Test Failure Analysis

_This document categorizes and analyzes test failures to prevent regressions and stabilize the CI pipeline._

## Current Failures (Phase 2)

- **Error**: `Error: Cannot find module 'redis'` (RESOLVED)
  - **Affected Suites**: All integration suites and `auth.middleware.test.js`.
  - **Resolution Path**: Installed `redis` package in `package.json` and `npm install` executed.

- **Error**: Integration tests failing with `403 Forbidden` despite logging in as admin/user (RESOLVED)
  - **Root Cause**: `setupTestDB.js` truncates `users` which cascades to `user_roles`. `tests/fixtures/user.fixture.js` inserted legacy string roles but failed to inject the new `UserRole`, `Role`, and `Permission` mappings required by `permission.service.js`.
  - **Resolution Path**: Updated `user.fixture.js` to seed the database with DB-driven RBAC records using `prisma.$transaction` and `upsert` for `super_admin` and `standard_user` roles.

- **Error**: `auth.middleware.test.js` timing out (RESOLVED)
  - **Root Cause**: Vitest mock syntax for `passport` and `permission.service.js` conflicted with Express's CommonJS requires inside the middleware, causing asynchronous handlers to swallow undefined functions and hang the promise executor.
  - **Resolution Path**: Flattened the module exports in `vi.mock` definitions to ensure proper interoperability between ES modules (Vitest) and CJS (`auth.js`).

_(To be expanded during Phase 2 Test Recovery)_
