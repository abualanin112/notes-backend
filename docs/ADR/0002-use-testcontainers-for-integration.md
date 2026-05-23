# 2. Use Testcontainers for PostgreSQL Integration Testing

Date: 2026-05-22

## Status

Accepted

## Context

During Phase 0-4, the test suite suffered from brittle setups. The testing strategy historically relied on either:

1. An in-memory SQLite database mocking PostgreSQL APIs.
2. A shared local PostgreSQL database instance that required manual resets and suffered from cross-test data pollution.

SQLite cannot accurately mock advanced PostgreSQL capabilities introduced in Phase 4 (e.g., `pg_trgm` indexes, cursors, transaction isolation levels). A shared local DB prevents reliable parallel test execution in CI/CD pipelines.

## Decision

We will utilize the `testcontainers` npm package to programmatically spin up isolated, ephemeral PostgreSQL Docker containers for every integration test suite.
Each suite runs its own database, pushes migrations via the Prisma API programmatic bridge, and seeds isolated factory data.

## Consequences

- **Positive**: 100% parity with production database behaviors (indexes, JSONB, native constraints).
- **Positive**: Zero test flakiness due to data pollution from other tests.
- **Positive**: Effortless CI execution since `docker` is the only external dependency.
- **Negative**: Slower initial test startup time (approx. 2-5 seconds) as Docker daemon pulls and starts the PostgreSQL image.
- **Negative**: Requires developers to have Docker Engine running locally to execute the `test` command.
