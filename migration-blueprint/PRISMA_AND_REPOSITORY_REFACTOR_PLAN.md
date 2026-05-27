# Prisma and Repository Refactor Plan

## 1. Current State

A single global Prisma client is exported from `src/config/prisma.js`. Repositories (`note.repository.js`, `user.repository.js`) wrap Prisma calls but are often bypassed by services directly accessing the `tx` client.

## 2. Modular Data Access Target

In a Modular Monolith, modules must not share database clients if it allows cross-boundary table access.

### 2.1 Schema Boundaries

While we maintain a single physical PostgreSQL database (and thus a single `schema.prisma`), we will logically partition the schema using Prisma features or strict conventions:

- IAM Models (`User`, `Role`, `Token`, `Permission`)
- Domain Models (`Note`)
- Operational Models (`AuditLog`)

### 2.2 Repository Hardening

1. **Remove Prisma Export**: `src/config/prisma.js` will no longer export the client globally. It will only be accessible to a `DatabaseProvider` in the Shared Kernel.
2. **Module-Scoped Repositories**: Each module instantiates its repositories with a strictly scoped interface that can ONLY query its assigned models.
   - _Example_: `NotesRepository` cannot call `prisma.user.findUnique()`.

### 2.3 Eliminating Prisma Leakage

- **DTOs**: Repositories must return plain JavaScript objects (DTOs), not Prisma entity objects. This prevents lazy-loading leaks.
- **Transactions**: Instead of passing `tx` (the Prisma interactive transaction client) across modules, the Orchestrator will use a Unit of Work abstraction.

## 3. Migration Steps

1. Audit all direct `require('../../config/prisma')` imports in `src/services/*`.
2. Refactor services to route ALL data access through their respective repositories.
3. Introduce a Unit of Work interface to encapsulate transactions without exposing the Prisma API.
