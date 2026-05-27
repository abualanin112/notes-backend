# Module Boundary Blueprint

## 1. Core Principles

The system will be partitioned into strict Bounded Contexts. A module is defined by a distinct directory (e.g., `src/modules/iam`) containing its own routes, controllers, services, repositories, serializers, and explicit `index.js` which defines its public API.

## 2. Proposed Modules

### 2.1 IAM (Identity & Access Management) Module

- **Purpose**: Owns authentication, authorization, users, roles, and tokens.
- **Models**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Token`.
- **Public API**: `verifyToken`, `hasPermission`, `getUserById`, `revokeSessions`.

### 2.2 Notes Module

- **Purpose**: Core business domain for user-generated notes.
- **Models**: `Note`.
- **Public API**: Currently none required by other modules. Consumes `IAM` and `Audit`.

### 2.3 Audit Module

- **Purpose**: High-throughput, decoupled observability log.
- **Models**: `AuditLog`.
- **Public API**: `logEvent`, `queryLogs`.

### 2.4 Shared Kernel

- **Purpose**: Foundation utilities, logger, configuration, Prisma connection logic, error definitions.
- **Rules**: Must contain NO business logic or domain models.

## 3. Directory Structure Transformation

**From**: Layered (`src/controllers`, `src/services`)
**To**: Modular

```
src/
  modules/
    iam/
      iam.controller.js
      iam.service.js
      iam.repository.js
      iam.router.js
      index.js         <-- Exposes Public API
    notes/
    audit/
  shared/
    kernel/
      prisma.js
      logger.js
```
