# Test Architecture Preservation Plan

## 1. The Mandate

**Testing integrity dominates architectural elegance.** The migration is considered FAILED if integration tests become brittle, deterministic test isolation is lost, or RBAC regressions appear.

## 2. Current Testing Architecture

- **Vitest**: Test runner.
- **Testcontainers**: A single global PostgreSQL Testcontainer is spawned in `tests/utils/globalSetup.js` for the entire test run.
- **Data Isolation**: `tests/utils/setupTestDB.js` reconnects Prisma proxies and TRUNCATES all tables before each test.
- **Coverage**: Comprehensive unit and integration suites spanning `auth`, `notes`, `audit`, and `security`.

## 3. Preservation Strategy During Migration

### 3.1 Unbroken Test Isolation

The `TRUNCATE TABLE ... CASCADE` logic in `setupTestDB.js` relies on hardcoded table names. As we modularize the Prisma schema or extract bounded contexts, we must update this truncate logic dynamically based on Prisma's DMMF (Data Model Meta Format) to guarantee no table is left dirty between tests.

### 3.2 Fixture Modularity

Currently, fixtures (`note.fixture.js`, `user.fixture.js`) directly use the global Prisma client.
**Strategy**:

- Fixtures must be migrated to use the Module's explicit public API or Repository Layer, preventing tests from bypassing module boundaries.
- For integration tests simulating API calls (Supertest), the fixtures can remain at the HTTP layer, which naturally respects boundaries.

### 3.3 Testcontainers Continuity

The global container setup in `globalSetup.js` is excellent for performance. It MUST be preserved.

- **Rule**: Do not transition to per-file testcontainers, as it will drastically increase test execution time and introduce timeout brittleness.
- Keep the `DATABASE_URL` injection mechanism intact.

### 3.4 Gradual Migration of Suites

Tests will be migrated from `tests/integration/*` to `src/modules/{module}/tests/integration/*` in lockstep with the code migration.

- The monolithic test suite will run alongside the modular test suite until the monolith is entirely dismantled.
