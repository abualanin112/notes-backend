# Code Review Requirements

---

## 1. Mandatory Review Checkpoints

Every phase PR MUST be reviewed before merge. No self-merges during the migration.

| Phase   | Minimum Reviewers | Required Expertise                                 |
| ------- | ----------------- | -------------------------------------------------- |
| Phase 0 | 1                 | Any senior developer                               |
| Phase 1 | 1                 | Any senior developer                               |
| Phase 2 | 2                 | 1× Backend Lead + 1× DevOps (infrastructure paths) |
| Phase 3 | 2                 | 1× Security Lead + 1× Backend Lead                 |
| Phase 4 | 1                 | Backend developer familiar with Notes domain       |
| Phase 5 | 2                 | 1× Backend Lead + 1× Compliance (audit integrity)  |
| Phase 6 | 1                 | Backend developer                                  |
| Phase 7 | 2                 | 1× Backend Lead + 1× Database specialist           |
| Phase 8 | 1                 | QA lead or test architecture owner                 |
| Phase 9 | 2                 | 1× Backend Lead + 1× Architecture owner            |

## 2. Forbidden Patterns — Automatic PR Rejection

Any PR containing these patterns MUST be rejected without further review:

| Pattern                                                    | Why Forbidden                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `require('../../modules/iam/services/permission.service')` | Deep module import — violates boundary rules. Must use `require('../../modules/iam')` |
| `tx.user.findMany()` outside IAM module                    | Cross-module Prisma table access                                                      |
| `tx.note.create()` outside Notes module                    | Cross-module Prisma table access                                                      |
| `delete user.password` in controllers                      | Password stripping must happen in serializer only                                     |
| `test.skip()` added to existing tests                      | Weakening test coverage                                                               |
| `// eslint-disable boundaries/element-types`               | Bypassing boundary enforcement                                                        |
| Hardcoded `role: 'admin'` or `role: 'user'`                | Legacy role enum usage — must use RBAC tables                                         |
| `global.*` mutations in domain services                    | Global mutable state                                                                  |
| `process.env.*` reads outside `config.js`                  | Environment access must go through Shared Kernel config                               |

## 3. Invariant Validation Checklist (Per PR)

Reviewers MUST verify:

- [ ] All imports resolve through module public contracts (`index.js`) or Shared Kernel
- [ ] No new `require('../config/prisma')` direct imports in domain code
- [ ] No new direct Prisma model access across module boundaries
- [ ] `auditService.logEvent()` is called for all new mutations
- [ ] Serializers strip sensitive fields (password, internal IDs)
- [ ] Transaction scope is owned by the module performing the mutation
- [ ] No `test.skip()` or `test.todo()` added to existing tests
- [ ] Coverage has not decreased

## 4. Transaction-Boundary Review Rules

For any PR that modifies transaction logic:

- [ ] Verify that `runInTransaction` (or `withTransaction`) is called by the module that owns the primary entity
- [ ] Verify that `getTransactionClient()` is used instead of explicit `tx` parameter (Phase 7+)
- [ ] Verify that if `auditService.logEvent()` throws, the business operation is also rolled back
- [ ] Verify that no `await` occurs AFTER the transaction block that depends on data created inside it

## 5. RBAC Review Rules

For any PR that touches RBAC logic:

- [ ] Verify that `assertScopedPermission` logic is unchanged (or the change is intentional and security-reviewed)
- [ ] Verify that scope escalation (`:any` covers `:own`) still works
- [ ] Verify that `assertCanAssignRole` level comparison is preserved
- [ ] Verify that `security.test.js` is not modified to be more permissive

## 6. Serializer-Boundary Review Rules

For any PR that modifies serializers or response output:

- [ ] Verify that the serializer uses explicit whitelist mapping (not spread operator on Prisma objects)
- [ ] Verify that `password` is never included in the serialized output
- [ ] Verify that `role` (legacy enum) is not exposed
- [ ] Verify that `note.serializer.test.js` and `user.serializer.test.js` pass unchanged
