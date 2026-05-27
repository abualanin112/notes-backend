# Phase 7 — Transaction Boundary Convergence

> **Risk Level**: CRITICAL  
> **Estimated Duration**: 5–7 days  
> **Branch**: `refactor/phase-7-transaction-convergence`  
> **Prerequisite**: Phase 6 complete (tag `checkpoint/phase-6-complete`)

---

## Goal

Eliminate the leakage of raw Prisma transaction clients (`tx`) across module boundaries. After this phase, each module owns its own transaction scope and cross-module consistency is managed through explicit orchestration patterns.

## The Problem Being Solved

Currently, `note.service.js` does:

```javascript
return runInTransaction(async (tx) => {
  const note = await noteRepository.create(data, tx);       // Notes module
  await auditService.logEvent({ ... }, tx);                  // Audit module — LEAK!
});
```

The `tx` object is a raw Prisma interactive transaction client. It can execute ANY Prisma model query. Passing it from Notes to Audit means Audit could theoretically call `tx.user.findMany()` — a catastrophic boundary violation.

## Scope — Architecture Change

### Option A: Transactional Outbox (Recommended for ERP readiness)

Each module writes its OWN audit entries into a local `outbox_events` table inside its own transaction. A background poller or in-process event dispatcher reads the outbox and calls `auditService.logEvent()` separately.

### Option B: AsyncLocalStorage Transaction Propagation (Simpler, acceptable for current scale)

Store the active `tx` in ALS so modules can opt-in to the ambient transaction without explicit parameter passing:

```javascript
// src/shared/infrastructure/database/transactionContext.js
const als = require('../../kernel/als');

const withTransaction = async (callback) => {
  const prisma = require('./prisma');
  return prisma.$transaction(async (tx) => {
    const store = als.getStore() || {};
    store.tx = tx;
    return callback(tx);
  });
};

const getTransactionClient = () => {
  const store = als.getStore();
  return store?.tx || require('./prisma');
};
```

**Decision**: Use **Option B** for Phase 7 as it preserves synchronous audit guarantees without a new table or background process. Document Option A as the target for future ERP workflows.

### Files Modified

| File                                                       | Change                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/shared/infrastructure/database/transactionContext.js` | **NEW** — ALS-based transaction propagation                                                             |
| `src/shared/infrastructure/database/index.js`              | Export `withTransaction`, `getTransactionClient`                                                        |
| `src/modules/notes/services/note.service.js`               | Replace `runInTransaction` with `withTransaction`; remove `tx` parameter from `auditService.logEvent()` |
| `src/modules/iam/services/user.service.js`                 | Same refactor                                                                                           |
| `src/modules/iam/services/auth.service.js`                 | Same refactor                                                                                           |
| `src/modules/iam/services/authorization.service.js`        | Same refactor                                                                                           |
| `src/modules/audit/services/audit.service.js`              | Replace `tx` parameter with `getTransactionClient()` fallback                                           |

### Audit Service Change

```javascript
// BEFORE
const logEvent = async (payload, tx) => {
  return await auditRepository.create(canonicalPayload, tx);
};

// AFTER
const logEvent = async (payload) => {
  const client = getTransactionClient(); // reads from ALS
  return await auditRepository.create(canonicalPayload, client);
};
```

## Forbidden Changes

- **DO NOT** change the transactional guarantee: if a Note creation fails, the audit log MUST NOT persist.
- **DO NOT** change the RBAC resolution logic.
- **DO NOT** introduce a separate database or schema.
- **DO NOT** remove transactional consistency for `refreshAuth` token rotation.

## Risk Level

**CRITICAL** — This is the highest-risk structural change. Any mistake here causes:

- Silent audit log loss (if tx isn't propagated)
- Orphaned audit entries (if tx scope is wrong)
- Deadlocks (if nested transactions occur)

## Required Green Tests

| Suite                                | Must Pass | Why Critical                                      |
| ------------------------------------ | --------- | ------------------------------------------------- |
| `tests/integration/audit.test.js`    | ✅        | Audit logs must still appear after mutations      |
| `tests/integration/auth.test.js`     | ✅        | Token rotation transaction must remain atomic     |
| `tests/integration/note.test.js`     | ✅        | Note CRUD + audit must be transactional           |
| `tests/integration/user.test.js`     | ✅        | User delete cascade + audit must be transactional |
| `tests/integration/security.test.js` | ✅        | Escalation audit must persist                     |
| All tests                            | ✅        | Full regression                                   |

## Required Regression Tests

**New transaction-specific regression tests to add:**

1. Create a Note, then verify an AuditLog row exists with the same `reqId`.
2. Force a `noteRepository.create` failure AFTER `auditService.logEvent` — verify NEITHER the Note NOR the AuditLog persists (transaction rollback).
3. Verify `refreshAuth` token rotation: old token is blacklisted, new token is created, audit log is written — all atomically.

## Rollback Strategy

```bash
git checkout checkpoint/phase-6-complete
```

The ALS-based transaction propagation can be completely reverted by restoring the explicit `tx` parameter.

## Exit Criteria

1. ✅ No module passes `tx` to another module's function.
2. ✅ `getTransactionClient()` reads the ambient transaction from ALS.
3. ✅ `auditService.logEvent()` no longer accepts a `tx` parameter.
4. ✅ All transactional consistency tests pass.
5. ✅ Full `npm test` passes.
6. ✅ Tag `checkpoint/phase-7-complete`.

## Operational Risks

| Risk                                                                                                                   | Likelihood | Impact                                                                                                      | Mitigation                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ALS store doesn't propagate into deeply nested async callbacks                                                         | Medium     | `getTransactionClient()` returns the global Prisma client instead of `tx`, breaking transactional atomicity | Test with a forced failure to verify rollback includes audit logs                                                              |
| Prisma interactive transactions have a default 5s timeout — if ALS propagation adds latency, transactions may time out | Low        | Random test failures                                                                                        | Monitor transaction durations; increase timeout if needed                                                                      |
| `tokenCleanup.worker.js` creates its own ALS context — if it calls audit, it must NOT use a stale tx                   | Medium     | Worker crashes                                                                                              | Worker sets its own ALS store; `getTransactionClient` returns global Prisma (correct — worker doesn't run in a web request tx) |
