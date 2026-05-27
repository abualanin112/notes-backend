# Regression Prevention Strategy

## 1. Test Invariants

We define a set of invariants that must NEVER fail during the refactor:

1. **RBAC Invariant**: A user without `read:notes:any` cannot read another user's notes.
2. **Transaction Invariant**: If a `Note` creation fails, no `AuditLog` should exist.
3. **Data Leakage Invariant**: DTOs returned by the API must never contain sensitive internal IDs or password hashes.

## 2. Continuous Verification

- Run `npm run test` after every file move.
- Run `npm run coverage` at the end of each Phase to ensure boundary extractions didn't drop critical paths.

## 3. The Strangler Fig Pattern (Internal)

Instead of ripping out `authorization.service.js` immediately, we will:

1. Build the new `IAMModule.PolicyEngine`.
2. Route the old `authorization.service.js` to call the new `PolicyEngine` internally.
3. Gradually update controllers to use the new `PolicyEngine`.
4. Delete `authorization.service.js`.

This ensures the logic is duplicated and verified before the old wiring is destroyed.
