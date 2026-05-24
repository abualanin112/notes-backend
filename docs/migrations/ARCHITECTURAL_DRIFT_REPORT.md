# Architectural Drift Report

_This document tracks deviations, duplicate systems, and inconsistent contracts._

## Current Status (Phase 7 Convergence)

**ALL MAJOR DRIFT HAS BEEN ELIMINATED.**

### 1. Authentication & Authorization

- **Resolved**: `auth.js` middleware now correctly and exclusively expects `action:resource:scope` parameters (e.g., `create:users:any`).
- **Resolved**: Legacy `src/config/roles.js` has been completely deleted. The Prisma DB is the singular source of truth for RBAC.
- **Resolved**: Validation schemas (`user.validation.js`, `role.validation.js`) have been aligned with the dynamic RBAC implementation.

### 2. Infrastructure & Testing

- **Resolved**: Redis dependencies are fully configured and resilient with graceful memory fallbacks.
- **Resolved**: Vitest integration and Testcontainers ensure deterministic environments matching production logic exactly.

### 3. Data Model

- **Deferred (Managed Debt)**: The `LegacyRole` enum on the `User` model exists alongside `user_roles`. It is explicitly marked as `@deprecated` and mapped for safe removal in a future migration window, isolated from runtime impact.

_As of Phase 7, the architecture is strictly canonical. This report serves as a baseline for future audits._
