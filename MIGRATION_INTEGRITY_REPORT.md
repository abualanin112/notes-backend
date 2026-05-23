# Migration Integrity Report

## Overview
This document evaluates the database schema and migration history for stability, consistency, and leftover technical debt following the Phase 1–6 architectural convergences. The objective is to identify transitional artifacts (e.g., legacy RBAC columns) and categorize their removal safety.

---

## 🟢 SAFE TO REMOVE

*Currently, no immediate database structures fall into this category. All safely removable structures (like `roles.js` abstractions) were already cleaned up from the codebase.*

**Non-DB Elements Safe to Remove:**
- Scripts used purely for migration transition (e.g., `migrate-tests.js` if all migrations are finalized and committed).
- Any remaining deprecated npm packages if not utilized by the new `pino` logger or vitest stack.

---

## 🟡 DEFERRED (DO NOT DROP YET)

These items are technical debt from the RBAC migration. They are deferred because dropping them in production requires a multi-phase schema deployment and potential downtime/rollback risk if any legacy application version remains active.

1. **`LegacyRole` Enum**
   - **Reason**: Retained to ensure legacy user creation flows or old data does not break the Prisma client until we explicitly issue a `DROP TYPE` migration.
   - **Action Plan**: Schedule a future migration specifically to drop this enum once 100% of the User rows have been confirmed migrated to the `UserRole` mapping table.

2. **`User.role` Column**
   - **Reason**: Marked `@deprecated`. It acts as a fallback for the system.
   - **Action Plan**: Defer removal to a future "Cleanup Phase" sprint.

---

## 🔴 ROLLBACK-CRITICAL (MUST RETAIN)

These structures are essential for the system's operational integrity and rollback capabilities.

1. **`AuditLog` Isolation**
   - The `AuditLog` table strictly avoids Prisma foreign key constraints (`@relation`). This guarantees that audit trails survive the hard deletion of parent entities. **Do not add relations here.**

2. **`UserRole` and `RolePermission` Cascades**
   - The `onDelete: Cascade` behavior is critical to prevent orphaned RBAC records when a `Role` or `User` is deleted. Ensure no future migrations restrict this.

3. **Database Migration History**
   - Do not squash the Prisma migration history from the previous RBAC and Token phases. The sequence of migrations acts as the primary rollback mechanism.
