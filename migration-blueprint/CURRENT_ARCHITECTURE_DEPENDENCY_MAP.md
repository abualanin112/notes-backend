# Current Architecture Dependency Map

## 1. System Overview

The current system is structured as a layered monolith (`src/controllers`, `src/services`, `src/repositories`, `src/routes`, `src/middlewares`). This technical partitioning obscures domain boundaries and naturally encourages coupling.

## 2. Dependency Graph Analysis

### 2.1 The Prisma Bottleneck

`src/config/prisma.js` is the center of the data universe. All repositories import it directly. Worse, `src/index.js`, `src/app.js` (for health checks), and `src/services/authorization.service.js` access it directly, bypassing the repository layer.

- **Risk**: Direct Prisma usage outside repositories makes it impossible to swap data stores, trace queries, or enforce module boundaries.

### 2.2 Auth & Authorization Coupling

`src/services/authorization.service.js` is tightly coupled with `src/services/permission.service.js`, `src/services/audit.service.js`, and `src/config/prisma.js`.

- **Flow**: `auth.js` middleware -> `permission.service.js`.
- **Coupling**: The domain logic for `Note` ownership (`assertCanManageNote`) and `User` (`assertCanManageUser`) is hardcoded in the generic `authorization.service.js`. This is a massive domain leak.

### 2.3 Audit Service Pervasiveness

`audit.service.js` is imported by almost every domain service (`note.service.js`, `user.service.js`, `auth.service.js`, `authorization.service.js`).

- **Coupling**: Currently, audit logs are tightly integrated into the transactions of other services.

## 3. High-Risk Zones

1. **Transaction Propagation**: `runInTransaction` in `src/repositories/index.js` uses Prisma's interactive transactions. This is passed around, meaning an outer service dictates the transaction lifecycle of an inner service, causing implicit temporal coupling.
2. **Controller-Service Coupling**: `note.controller.js` directly interacts with `noteService` and `serializers`.

## 4. Diagram: Current Dependency Flow

[Router] -> [Auth Middleware (depends on PermissionService)] -> [Controller]
[Controller] -> [Service]
[Service] -> [Repository (needs Transaction)]
[Service] -> [AuditService (needs Transaction)]
[Service] -> [AuthorizationService (domain specific checks)]
