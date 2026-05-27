# High-Risk Phase Matrix

This matrix categorises every significant risk across all migration phases by likelihood, blast radius, detection difficulty, rollback complexity, and required safeguards.

---

## Risk Severity Legend

| Level       | Meaning                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| 🟢 LOW      | Unlikely to cause issues; trivially detectable and reversible                     |
| 🟡 MEDIUM   | Possible under certain conditions; detectable by tests; reversible with effort    |
| 🔴 HIGH     | Likely to cause issues if not handled carefully; hard to detect; complex rollback |
| ⚫ CRITICAL | Will cause data loss, security breach, or total system failure if mishandled      |

---

## 1. Prisma Transaction Propagation

| Dimension                  | Assessment                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**                  | 7 (Transaction Boundary Convergence)                                                                                                                                                                                                                                                                       |
| **Likelihood of Breakage** | 🔴 HIGH — ALS-based propagation relies on async context which can be lost in some edge cases                                                                                                                                                                                                               |
| **Blast Radius**           | ⚫ CRITICAL — Affects ALL write operations + audit logging across all modules                                                                                                                                                                                                                              |
| **Detection Difficulty**   | 🔴 HIGH — A broken ALS context silently falls back to the global Prisma client, making writes non-transactional without obvious errors                                                                                                                                                                     |
| **Rollback Complexity**    | 🟡 MEDIUM — Restore explicit `tx` parameter passing                                                                                                                                                                                                                                                        |
| **Required Safeguards**    | 1. Add a test that forces a repository failure AFTER `auditService.logEvent()` and verifies BOTH the entity AND audit log are rolled back. 2. Add ALS store assertions in `getTransactionClient()` logging. 3. Never use `setTimeout` or `setImmediate` inside transaction callbacks (breaks ALS context). |

## 2. Auth Middleware Extraction

| Dimension                  | Assessment                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**                  | 3 (IAM Module Extraction)                                                                                                                                   |
| **Likelihood of Breakage** | 🔴 HIGH — `auth.js` is imported by every protected route file                                                                                               |
| **Blast Radius**           | ⚫ CRITICAL — If auth middleware fails to resolve, ALL protected routes return 500                                                                          |
| **Detection Difficulty**   | 🟢 LOW — Integration tests immediately catch 500 errors                                                                                                     |
| **Rollback Complexity**    | 🟢 LOW — Re-export adapters ensure old paths work                                                                                                           |
| **Required Safeguards**    | 1. Verify re-export adapter at `src/middlewares/auth.js` before deleting it (Phase 6 only). 2. Run `tests/integration/security.test.js` after every commit. |

## 3. RBAC Permission Resolution Isolation

| Dimension                  | Assessment                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**                  | 3 (IAM Module Extraction)                                                                                                                |
| **Likelihood of Breakage** | 🟡 MEDIUM — `permission.service.js` directly imports `prisma` and `redis`                                                                |
| **Blast Radius**           | ⚫ CRITICAL — Broken permission resolution = broken auth for all users                                                                   |
| **Detection Difficulty**   | 🟢 LOW — Any permission failure shows as 403 in tests                                                                                    |
| **Rollback Complexity**    | 🟢 LOW — Re-export adapters                                                                                                              |
| **Required Safeguards**    | 1. Do NOT change `permission.service.js` internal logic. 2. Only move the file and create adapter. 3. Run security test after each move. |

## 4. Audit Service Decoupling

| Dimension                  | Assessment                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**                  | 5 (Audit Module Extraction) + 7 (Transaction Convergence)                                                                                                      |
| **Likelihood of Breakage** | 🔴 HIGH — Audit is transactionally coupled to every business mutation                                                                                          |
| **Blast Radius**           | 🔴 HIGH — Silent audit loss = compliance violation                                                                                                             |
| **Detection Difficulty**   | 🔴 HIGH — If `logEvent` silently succeeds outside the transaction, the audit log persists even when the business operation is rolled back (orphaned audit)     |
| **Rollback Complexity**    | 🟡 MEDIUM — Restore synchronous `tx` parameter                                                                                                                 |
| **Required Safeguards**    | 1. Dedicated transaction-atomicity regression test. 2. Never swallow `logEvent` exceptions. 3. Phase 5 preserves `tx` parameter; Phase 7 replaces it with ALS. |

## 5. AsyncLocalStorage Propagation

| Dimension                  | Assessment                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**                  | 1 (Shared Kernel) + 7 (Transaction Convergence)                                                                                                                   |
| **Likelihood of Breakage** | 🟡 MEDIUM — ALS is generally reliable in Node.js 18+, but can be lost across `Promise.race` or native addon boundaries                                            |
| **Blast Radius**           | 🔴 HIGH — Lost ALS = missing `userId` in audit logs, missing `reqId` in traces                                                                                    |
| **Detection Difficulty**   | 🟡 MEDIUM — Audit logs with `null` actorId indicate ALS loss, but may not cause test failures                                                                     |
| **Rollback Complexity**    | 🟢 LOW — ALS path is a simple file move                                                                                                                           |
| **Required Safeguards**    | 1. Assert `actorId !== null` in audit log integration tests for authenticated operations. 2. Verify `tokenCleanup.worker.js` creates its own ALS store (it does). |

## 6. Redis Degradation Handling

| Dimension                  | Assessment                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Phase**                  | 2 (Infrastructure Isolation)                                                                                    |
| **Likelihood of Breakage** | 🟢 LOW — Redis module is self-contained with circuit breaker                                                    |
| **Blast Radius**           | 🟡 MEDIUM — Broken degradation = permission cache failure = potential 500 errors                                |
| **Detection Difficulty**   | 🟢 LOW — `redis-degradation.test.js` explicitly tests this                                                      |
| **Rollback Complexity**    | 🟢 LOW — File move with adapter                                                                                 |
| **Required Safeguards**    | 1. `redis-degradation.test.js` must pass at every phase. 2. Verify `resetClient()` works through adapter chain. |

## 7. Worker Orchestration

| Dimension                  | Assessment                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Phase**                  | 3 (IAM Module Extraction)                                                                                                |
| **Likelihood of Breakage** | 🟢 LOW — Worker is a standalone cron job with minimal coupling                                                           |
| **Blast Radius**           | 🟢 LOW — Token cleanup is not user-facing                                                                                |
| **Detection Difficulty**   | 🟡 MEDIUM — Worker runs on schedule, not on demand                                                                       |
| **Rollback Complexity**    | 🟢 LOW — File move with adapter                                                                                          |
| **Required Safeguards**    | 1. Verify `startTokenCleanupJob` import resolves in `index.js` after move. 2. Verify Redis lock acquisition still works. |

## 8. Integration Fixture Migration

| Dimension                  | Assessment                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| **Phase**                  | 8 (Test Hardening)                                                                                  |
| **Likelihood of Breakage** | 🟡 MEDIUM — Fixtures directly use `prisma` for data seeding                                         |
| **Blast Radius**           | 🔴 HIGH — Broken fixtures = all integration tests fail                                              |
| **Detection Difficulty**   | 🟢 LOW — Tests fail immediately                                                                     |
| **Rollback Complexity**    | 🟢 LOW — Restore old fixture imports                                                                |
| **Required Safeguards**    | 1. Update fixture imports to use new Prisma path. 2. Run full test suite after each fixture change. |
