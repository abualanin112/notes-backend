# Prisma Infrastructure

## Overview

Prisma is our primary ORM and database access layer for PostgreSQL.

## Best Practices

1. **Never mock Prisma globally.** Use a real database for integration tests via Testcontainers.
2. **Transactions:** Use the shared `runInTransaction` utility located in `src/infrastructure/prisma.js` instead of raw `$transaction` calls to ensure AsyncLocalStorage context works properly with transactional queries.
3. **Connection Pooling:** Prisma connection pooling is managed via environment variables. Do not manually instantiate new Prisma clients in services. Always import the singleton from `src/infrastructure/prisma.js`.
4. **Select Projections:** Avoid `select: { ... }` scattering across the codebase. Centralize projections or use the `pick` utility to filter fields at the transport layer.
