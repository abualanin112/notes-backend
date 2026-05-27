# Phase 5 — Audit Module Extraction

> **Risk Level**: CRITICAL  
> **Estimated Duration**: 5–7 days  
> **Branch**: `refactor/phase-5-audit-extraction`  
> **Prerequisite**: Phase 4 complete (tag `checkpoint/phase-4-complete`)

---

## Goal

Extract the Audit subsystem into `src/modules/audit/`. This is the **most dangerous phase** because `auditService.logEvent()` is called synchronously INSIDE every business transaction across IAM and Notes. Breaking this coupling without losing audit guarantees requires surgical precision.

## Why This Is the Most Dangerous Phase

Current state: Every mutating service call looks like this:

```javascript
return runInTransaction(async (tx) => {
  const note = await noteRepository.create(data, tx);
  await auditService.logEvent({ ... }, tx);  // <-- SAME transaction
  return note;
});
```

The `tx` parameter is a raw Prisma interactive transaction client. If we extract `auditService` into a separate module, we must either:

1. **Continue passing `tx` across the module boundary** (temporary — violates isolation but preserves correctness), OR
2. **Decouple to an event-driven Outbox** (permanent — correct but complex).

**Decision**: Phase 5 uses **Option 1 (temporary tx pass-through)** to maintain transactional consistency. Phase 7 will resolve this with the Outbox pattern.

## Scope — Files Moved

| Current Path                           | Target Path                                          |
| -------------------------------------- | ---------------------------------------------------- |
| `src/services/audit.service.js`        | `src/modules/audit/services/audit.service.js`        |
| `src/repositories/audit.repository.js` | `src/modules/audit/repositories/audit.repository.js` |

### Public Contract — `src/modules/audit/index.js`

```javascript
const auditService = require('./services/audit.service');

module.exports = {
  /**
   * Log an audit event within an optional transaction context.
   * @param {Object} payload - Canonical audit event payload
   * @param {Object} [tx] - Optional Prisma transaction client (temporary — will be removed in Phase 7)
   */
  logEvent: auditService.logEvent,

  // Exposed for unit testing only
  sanitizeMetadata: auditService.sanitizeMetadata,
};
```

### Re-Export Adapters

| Old Path                               | Points To                                        |
| -------------------------------------- | ------------------------------------------------ |
| `src/services/audit.service.js`        | `../modules/audit`                               |
| `src/repositories/audit.repository.js` | `../modules/audit/repositories/audit.repository` |

### Consumer Updates (via adapters — no direct changes needed)

All existing callers of `auditService.logEvent(payload, tx)`:

- `src/modules/iam/services/auth.service.js` — login, logout, refresh audit
- `src/modules/iam/services/user.service.js` — user CRUD audit
- `src/modules/iam/services/authorization.service.js` — escalation audit
- `src/modules/notes/services/note.service.js` — note CRUD audit

These continue to work via re-export adapters. No changes needed.

## Forbidden Changes

- **DO NOT** remove the `tx` parameter from `logEvent()` — transactional consistency is mandatory.
- **DO NOT** introduce an event bus in this phase (deferred to Phase 7).
- **DO NOT** modify the `sanitizeMetadata` logic.
- **DO NOT** modify test expectations about audit log existence after mutations.

## Risk Level

**CRITICAL** — Audit log persistence is a compliance requirement. If `logEvent` fails silently, we lose the audit trail. If it throws, it rolls back the business transaction.

## Required Green Tests

| Suite                                | Must Pass | Why Critical                                        |
| ------------------------------------ | --------- | --------------------------------------------------- |
| `tests/integration/audit.test.js`    | ✅        | Validates audit logs are created for all operations |
| `tests/integration/auth.test.js`     | ✅        | Auth flows emit audit events                        |
| `tests/integration/note.test.js`     | ✅        | Note mutations emit audit events                    |
| `tests/integration/user.test.js`     | ✅        | User mutations emit audit events                    |
| `tests/integration/security.test.js` | ✅        | Escalation attempts are audited                     |
| All unit tests                       | ✅        | Full regression                                     |

## Required Regression Tests

- Verify that after a `Note.create` inside a transaction, the corresponding `AuditLog` row exists.
- Verify that if `auditRepository.create` throws, the Note is NOT created (transaction rolls back).
- Verify `sanitizeMetadata` still strips `password`, `token`, `authorization` fields.

## Rollback Strategy

```bash
git checkout checkpoint/phase-4-complete
```

## Exit Criteria

1. ✅ `src/modules/audit/` contains audit service and repository.
2. ✅ `logEvent(payload, tx)` signature is preserved.
3. ✅ All audit-emitting services still call `logEvent` successfully through adapter chain.
4. ✅ `audit.test.js` passes unchanged.
5. ✅ Full `npm test` passes.
6. ✅ Tag `checkpoint/phase-5-complete`.

## Expected Refactor Pattern

- **Module Extraction**: Move + Adapter.
- **Temporary Coupling Accepted**: `tx` pass-through is a documented technical debt, resolved in Phase 7.

## Operational Risks

| Risk                                                                                                                                              | Likelihood   | Impact                                   | Mitigation                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `audit.service.js` reads from `asyncLocalStorage` for `actorId` and `reqId` — ALS must be available                                               | **HIGH**     | Missing actorId in audit logs            | ALS was moved to Shared Kernel in Phase 1. Verify import path resolves.         |
| `auditRepository.create` re-export adapter chain is 3 levels deep                                                                                 | Medium       | Subtle import resolution failure         | Run `node -e "require('./src/repositories/audit.repository')"` to verify chain  |
| Audit failure propagation: the service re-throws errors (`throw error` on line 82) — if the adapter breaks this, transactions become inconsistent | **CRITICAL** | Silent audit loss or uncaught exceptions | Verify error propagation by intentionally triggering an audit failure in a test |
