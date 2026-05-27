# Cross-Module Transaction Analysis

## 1. The Current State

Currently, transactions are managed via `runInTransaction` located in `src/repositories/index.js`.
Services like `note.service.js` call `runInTransaction`, do their business logic (e.g., `noteRepository.create`), and then call `auditService.logEvent` passing the active transaction object `tx`.

### Risks of the Current Model:

- **Leaky Abstractions**: The Prisma transaction client (`tx`) is leaked across service boundaries. `note.service.js` shares its database transaction context directly with `auditService.js`.
- **Contention**: Long-running cross-service operations hold locks on unrelated tables.
- **Module Violation**: In a true modular monolith, modules should not share a single interactive database transaction if they are logically separated, as this breaks database isolation goals.

## 2. Identified Shared Transaction Scopes

1. **Business Action + Audit**: Every `CREATE`, `UPDATE`, `DELETE` operation in the system wraps the core database mutation and the `AuditLog` insertion in a single transaction.
2. **Role Assignment**: `assignRoleToUser` creates a `UserRole` and logs to Audit in one transaction.

## 3. Target State & Orchestration Strategy

To maintain transactional consistency without leaking Prisma clients across boundaries, we must adopt:

### 3.1 Unit of Work / Orchestrator Pattern

Instead of passing `tx` around:

- Use **Sagas** or **Domain Events**.
- **Preferred for Monoliths**: Use a **Transactional Outbox**. The `NoteService` writes the Note and an Outbox event in its own transaction. The `AuditModule` listens to the Outbox (or an event bus) and processes the audit log independently.

### 3.2 Interim Step (Safe Refactor)

If synchronous auditing is strictly required, wrap the cross-module call in an Orchestrator Service, but define a strict `TransactionContext` interface rather than passing raw Prisma clients, or use `AsyncLocalStorage` to implicitly propagate the transaction boundary without polluting method signatures.

## 4. Hazards & Contention Zones

- **Token Cleanup Worker**: Deletes tokens in bulk. If this locks rows while a user is attempting to refresh, it could cause contention.
- **Nested Transactions**: Prisma does not support true nested transactions. If a service calls another service that also calls `runInTransaction`, Prisma will fail. We must audit all nested service calls.
