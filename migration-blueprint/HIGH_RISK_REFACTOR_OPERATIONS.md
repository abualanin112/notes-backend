# High-Risk Refactor Operations

## 1. Transaction Decoupling

**Risk**: Data inconsistency. When decoupling `AuditService` from the core database transaction, a database failure in `NoteService` could result in an orphaned Audit log, or vice versa.
**Mitigation**: Implement the Transactional Outbox pattern. The `Note` mutation and the `OutboxEvent` mutation occur in the same local transaction.

## 2. Moving Authorization Logic

**Risk**: Security vulnerabilities. Moving `assertCanManageNote` out of the central `authorization.service.js` and into `NotesModule` could lead to dropped assertions if not wired correctly in the routes.
**Mitigation**: Run the `integration/security.test.js` strictly. Enforce coverage gates ensuring all endpoints still evaluate ownership.

## 3. Dynamic Router Assembly

**Risk**: Route overlap or missing middleware. When moving from a monolithic `v1/index.js` to modular routers, the application of global middleware (`auth.js`) might be accidentally omitted.
**Mitigation**: Integration tests must explicitly check for 401/403 on protected routes.

## 4. Prisma Proxy Disconnection

**Risk**: Dropped connections or schema mismatch during the migration of Repositories to Module-Scoped Database Providers.
**Mitigation**: Keep the global `prisma` proxy intact during the transition, slowly migrating one repository at a time to inject the proxy explicitly, rather than importing it globally.
