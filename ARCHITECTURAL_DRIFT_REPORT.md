# Architectural Drift Report

*This document tracks deviations, duplicate systems, and inconsistent contracts.*

## Identified Drift
1. **Routing vs RBAC Mismatch**: Routes use legacy permissions (e.g. `'manageUsers'`), but `auth.js` middleware uses `action:resource:scope`.
2. **Missing Dependency**: `redis` module is missing in package.json, breaking `permission.service.js` and all integration tests.
3. **Duplicate RBAC**: `src/config/roles.js` exists alongside the DB-driven model in Prisma.
4. **Validation Mismatch**: `user.validation.js` validates old array-based roles, while `role.validation.js` was created for the new system but isn't routed.

*(To be expanded during Phase 0 & Phase 1)*
