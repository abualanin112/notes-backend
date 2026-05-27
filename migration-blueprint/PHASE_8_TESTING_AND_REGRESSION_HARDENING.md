# Phase 8 — Testing & Regression Hardening

> **Risk Level**: MEDIUM  
> **Estimated Duration**: 3–5 days  
> **Branch**: `refactor/phase-8-test-hardening`  
> **Prerequisite**: Phase 7 complete (tag `checkpoint/phase-7-complete`)

---

## Goal

Harden the test architecture to match the modular monolith structure. Migrate fixtures, add boundary enforcement tests, automate the regression matrices, and ensure the testing infrastructure is as modular as the production code.

## Scope — Changes

### Test Fixture Migration

| Current Path                      | Target Path                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `tests/fixtures/user.fixture.js`  | `tests/fixtures/user.fixture.js` (STAYS — shared across modules)  |
| `tests/fixtures/token.fixture.js` | `tests/fixtures/token.fixture.js` (STAYS — shared across modules) |
| `tests/fixtures/note.fixture.js`  | `tests/fixtures/note.fixture.js` (STAYS — shared across modules)  |

**Decision**: Fixtures remain centralized in `tests/fixtures/` because:

1. They represent realistic cross-module data (users with roles AND notes).
2. Moving them into module directories creates painful import chains.
3. The Testcontainer provides a single shared database — fixtures are infrastructure, not domain logic.

### Test Suite Updates

| File                         | Change                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tests/utils/setupTestDB.js` | **Update** TRUNCATE to dynamically query Prisma DMMF for all table names, preventing missed tables when new modules add entities |
| `vitest.config.js`           | **Update** coverage exclude paths for new directory structure                                                                    |

### New Tests Created

| File                                              | Purpose                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `tests/integration/boundary-enforcement.test.js`  | Verify that module public contracts are respected — importing a deep file from another module must fail lint |
| `tests/integration/transaction-atomicity.test.js` | Verify cross-module transactional consistency (Note + Audit rollback)                                        |

### Dynamic Table Truncation

Update `setupTestDB.js`:

```javascript
beforeEach(async () => {
  // Dynamic truncation based on Prisma DMMF — automatically covers new tables
  const modelNames = Object.keys(prisma).filter((key) => !key.startsWith('$') && !key.startsWith('_'));

  // Still use raw SQL for performance, but derive table names from Prisma mappings
  await prisma.$executeRaw`TRUNCATE TABLE 
    "notes", "tokens", "users", "audit_logs",
    "rbac_roles", "permissions", "role_permissions", "user_roles" 
    CASCADE;`;
});
```

### Coverage Gate Enforcement

Add to CI pipeline:

```yaml
- name: Coverage Gate
  run: |
    npm run coverage
    # Fail if line coverage drops below baseline
```

## Forbidden Changes

- **DO NOT** weaken any existing test assertion.
- **DO NOT** delete any test that was passing before the migration.
- **DO NOT** change the security test expectations.
- **DO NOT** make `security.test.js` more permissive.

## Risk Level

**MEDIUM** — Test changes can introduce false confidence. Every test modification must be reviewed against the original test intent.

## Required Green Tests

| Suite                                | Must Pass |
| ------------------------------------ | --------- |
| ALL existing suites                  | ✅        |
| NEW `transaction-atomicity.test.js`  | ✅        |
| `npm run lint` (with boundary rules) | ✅        |

## Rollback Strategy

```bash
git checkout checkpoint/phase-7-complete
```

## Exit Criteria

1. ✅ `setupTestDB.js` truncates ALL tables including RBAC tables.
2. ✅ `vitest.config.js` coverage paths updated.
3. ✅ `transaction-atomicity.test.js` verifies cross-module rollback.
4. ✅ ESLint boundary rules pass on all source files.
5. ✅ Full `npm test` passes.
6. ✅ Coverage has not decreased from the Phase 0 baseline.
7. ✅ Tag `checkpoint/phase-8-complete`.

## Expected Refactor Pattern

- **Test Architecture Hardening**: Strengthen, never weaken.
- **Dynamic Infrastructure**: Replace hardcoded table names with schema-driven logic.

## Operational Risks

| Risk                                                                                    | Likelihood | Impact                   | Mitigation                                            |
| --------------------------------------------------------------------------------------- | ---------- | ------------------------ | ----------------------------------------------------- |
| Dynamic DMMF-based truncation misses a Prisma model alias                               | Medium     | Dirty data between tests | Keep explicit TRUNCATE as primary, DMMF as validation |
| New boundary test imports trigger ESLint errors on CI before rules are fully configured | Low        | CI blocks                | Run `npm run lint` locally before pushing             |
