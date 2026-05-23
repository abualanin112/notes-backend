# System State

_This document tracks the official architecture, canonical flows, active systems, and current source-of-truth implementations._

## Phase 6 Convergence Status

**Infrastructure Governance and Operational Safety - COMPLETED**

- Circuit Breaker added for Redis.
- Lifecycle Hooks added for graceful shutdown.
- Event Loop lag monitoring and Slow Query Telemetry implemented.
- Cache fallback configured to strict `lru-cache`.
- Workers safely governed via SETNX singletons and Promise.race timeout wraps.

## Canonical Architecture

- **Framework**: Node.js / Express.js REST API
- **Persistence**: PostgreSQL via Prisma ORM
- **Authorization Model**: Single-Tenant Database-Driven RBAC (`permissions` and `user_roles`)
- **Observability**: Pino structured logging with AsyncLocalStorage (ALS) propagation for `reqId` and `userId`. Explicit `AuditLog` table for deterministic event tracking.
- **Testing**: Vitest + Testcontainers integration testing.

## Active Systems & Source of Truth

### 1. Authentication Lifecycle

- **Implementation**: `src/services/auth.service.js`
- **Flow**: JWT-based (access and refresh tokens). Passport JWT strategy (`src/config/passport.js`) validates tokens.
- **Token Security**: Tokens are hashed before DB insertion (`src/services/token.service.js`). Refresh tokens use family-based rotation to detect reuse.

### 2. Authorization & RBAC

- **Implementation**: `src/services/authorization.service.js` (Ownership/ABAC logic) & `src/middlewares/auth.js` (Pure permission gate).
- **Flow**:
  1. `auth.js` queries `permission.service.js` for the user's cached RBAC graph.
  2. Resolves permissions in `action:resource:scope` format (e.g., `create:users:any`).
  3. Controller delegates to `authorization.service.js` to assert ownership via `:own` scope checks.

### 3. Database Repositories

- **Implementation**: Data access is isolated in `src/repositories/`. Services must not invoke Prisma directly, except for transactions (`runInTransaction`).
- **Prisma Schema**: `prisma/schema.prisma` acts as the definitive source of truth for the data model.

### 4. Background Workers

- **Implementation**: Node-cron based workers in `src/workers/`.
- **Active**: `tokenCleanup.worker.js` (runs daily to reap expired tokens).

### 5. Middleware Stack

- **Flow**: Request -> pinoHttp (logging) -> helmet/cors (security) -> rateLimiter -> Express parsers -> auth (Passport) -> validate (Zod) -> Controller.
