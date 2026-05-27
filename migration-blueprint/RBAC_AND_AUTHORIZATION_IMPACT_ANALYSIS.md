# RBAC and Authorization Impact Analysis

## 1. Current RBAC Architecture

The current RBAC system is highly advanced, utilizing database-driven dynamic roles, permissions, and scopes (`action:resource:scope`).

- **Middleware (`auth.js`)**: Resolves JWT and enforces minimum baseline permissions.
- **Service (`authorization.service.js`)**: Executes deep ownership resolution (`assertScopedPermission`).
- **Database**: Uses `Role`, `Permission`, `RolePermission`, `UserRole` tables.

## 2. Migration Impact

Moving to a modular monolith requires decentralizing the `authorization.service.js`.

### 2.1 Ownership Evaluation

Currently, `authorization.service.js` contains `assertCanManageNote` and `assertCanReadUser`.
**Impact**: This violates modularity. The `Auth` module should only know about Permissions (Strings), not `Notes`.
**Migration**:

- `AuthModule` exports a generic `hasPermission(userId, action, resource, scope)` contract.
- `NotesModule` implements `NotesPolicy` which queries the `AuthModule` contract and applies Note-specific ownership rules.

### 2.2 Scope Assertions

The logic handling `own` vs `any` scopes is currently centralized.
**Impact**: We must extract this into a Shared Kernel utility or Policy base class that modules can extend.

### 2.3 Escalation Prevention

`assertCanAssignRole` prevents users from assigning roles higher than their own level.
**Impact**: This must be preserved strictly inside the `IAM/Auth` module. It is a critical security invariant that must not be exposed or bypassable by other modules.

## 3. Regression Prevention

Any change to RBAC resolution poses a severe security risk.

- We must execute the `SECURITY_REGRESSION_MATRIX` against both the old monolithic authorization service and the new modular policy enforcement points.
- The `integration/security.test.js` must pass 100% at every single commit during the refactor.
