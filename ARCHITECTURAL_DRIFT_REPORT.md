# Architectural Drift Report

*This document tracks deviations, duplicate systems, and inconsistent contracts.*

## 1. Authentication & Authorization Drift
- **Routing vs RBAC Mismatch (HIGH)**: `user.route.js` still mounts routes with legacy permission arrays (`auth('manageUsers')`), but `auth.js` middleware now strictly checks `action:resource:scope`. This creates an unresolvable authorization state.
- **Duplicate RBAC Systems**: `src/config/roles.js` exists alongside the DB-driven model in Prisma. The codebase technically contains two sources of truth for roles.
- **Validation Drift**: `user.validation.js` checks `z.enum(['user', 'admin'])`, conflicting with the dynamic roles defined via Prisma. `role.validation.js` was created for the new system but isn't routed yet.

## 2. Infrastructure & Test Drift
- **Missing Dependency (CRITICAL)**: `redis` module is missing in package.json, which completely breaks `permission.service.js` and causes fatal crashes in all tests that mount `auth.js`.
- **Database Transaction Misalignment**: `auth.service.js` line 73 attempts to pass a transaction (`tx`) to `userRepository.findById(..., tx)`. If the repository does not support transactions on reads, this will fail under load or during token rotation.

## 3. Data Model Drift
- **Legacy Enums**: The `LegacyRole` enum on the `User` model exists alongside the `user_roles` relation. Dual writes/reads are not implemented, making the legacy enum a potential data loss vector if mistakenly trusted.

*(All identified drift will be systematically resolved through the Phased Recovery Plan)*
