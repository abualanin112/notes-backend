# Integration Test Stability Plan

## 1. Deterministic Execution

Integration tests are notoriously brittle if global state leaks.

- We must maintain the `TRUNCATE CASCADE` logic in `setupTestDB.js`.
- As module schema boundaries are defined, we will transition the hardcoded `TRUNCATE` query to read from the Prisma DMMF to dynamically truncate all tables, ensuring no new module tables are accidentally left dirty.

## 2. Managing Redis in Tests

The `redis-degradation.test.js` proves the system survives Redis failure.

- **Requirement**: This test must be isolated from tests that expect Redis to be functional.
- **Strategy**: Ensure the Vitest pool isolation (`pool: 'forks'`) is maintained so the environment variable mutations or network drops do not bleed into parallel test workers.

## 3. Asynchronous Workflow Testing

As we move from synchronous Audit logging to an Event Bus (Phase 2), tests verifying Audit Logs will become flaky if they don't await the asynchronous event processing.

- **Solution**: Implement a test utility `awaitEventBusIdle()` or poll the database with a short timeout to assert asynchronous side-effects, rather than assuming immediate consistency.
