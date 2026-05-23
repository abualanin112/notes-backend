# Testing Architecture & Discipline

This document defines the formal boundaries, anti-patterns, and lifecycle guarantees of the testing infrastructure. This repository is built as an enterprise-grade backend blueprint, and the testing suite heavily values **deterministic, real-world behavior** over mocked abstractions.

---

## 1. Testing Layer Boundaries

Tests are strictly categorized to prevent overlapping concerns and brittle execution.

### UNIT TESTS

- **Scope**: Isolated pure logic (e.g., parsers, token generators, password hashing).
- **Constraints**:
  - NO database access.
  - NO Prisma client imports.
  - NO network boundaries.

### INTEGRATION TESTS

- **Scope**: Repositories, Services, and Transactional behavior.
- **Constraints**:
  - Must execute against a real PostgreSQL Testcontainer.
  - Must use the real Prisma client.
  - Must verify transactional rollbacks and commit behavior.

### CONTRACT TESTS

- **Scope**: Controllers, Route handlers, API definitions.
- **Constraints**:
  - Focuses on validation boundaries, HTTP status codes, and JSON response guarantees.

### INFRASTRUCTURE TESTS

- **Scope**: Core framework mechanics and observability.
- **Constraints**:
  - Verifies AsyncLocalStorage (ALS) propagation across boundaries.
  - Verifies Audit persistence.
  - Verifies Schema Migration lifecycles (`npx prisma migrate deploy`).

---

## 2. The "No Mocking Prisma" Rule

**Persistence and repository behavior MUST be tested against real PostgreSQL behavior whenever possible.**

### Why?

Mocking Prisma or simulating transactions via Jest/Vitest spy functions hides catastrophic production bugs:

- **Constraint Failures**: Mocks do not throw Foreign Key violations.
- **Transaction Rollbacks**: Mocks cannot accurately simulate nested transaction rollbacks.
- **Query Explosion**: Mocks cannot catch N+1 relation leaks or missing includes.

_If a test touches a repository or database layer, it must run against the Testcontainer._

---

## 3. Test Data Discipline

Brittle tests are often caused by brittle data. Enforce the following:

- **No Shared Mutable State**: Tests run in parallel. Every test file is guaranteed an isolated truncate of the database before execution via `setupTestDB.js`.
- **Deterministic Builders**: Avoid massive factory frameworks. Use lightweight, reusable fixture objects (e.g., `tests/fixtures/user.fixture.js`).
- **Stable Identifiers**: Use valid `cuid2` generation strategies in fixtures rather than random strings to ensure Prisma validation does not fail dynamically.

---

## 4. Test Timeout & Stability Guidelines

- **Container Startup**: The PostgreSQL Testcontainer takes approximately 2-5 seconds to download/start locally. Vitest timeouts for the `globalSetup` hook are intentionally high (`60_000ms`) to accommodate CI environments.
- **Flaky Tests**: Tests must not rely on `setTimeout`. Time-based logic should utilize mocked clocks where appropriate.
- **Retries**: CI pipelines do not auto-retry. Infrastructure failures (like Docker failing to pull) must fail loudly. Silent test skipping creates false-green CI metrics.

---

## 5. Observability Verification Rules

- **No Snapshot Testing for Logs**: Massive JSON snapshot assertions are banned (`expect(payload).toMatchSnapshot()`). Structured logs must be behavior-tested by asserting specific required fields (e.g., `event`, `actorId`).
- **Redaction Guarantees**: Tests must explicitly verify that sensitive data (`password`, `token`) is converted to `[REDACTED]` prior to persistence, but avoid tightly coupling to the entire JSON shape.
