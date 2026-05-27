# Phase 0 — Preparation & Baseline Lock

> **Risk Level**: LOW  
> **Estimated Duration**: 1–2 days  
> **Branch**: `refactor/phase-0-preparation`

---

## Goal

Freeze the architectural baseline, create a known-good snapshot, establish migration tooling, and scaffold the target directory structure WITHOUT moving any logic.

## Scope — Files Created or Modified

### Created (Empty Scaffolds)

- `src/shared/kernel/` — empty directory
- `src/shared/testing/` — empty directory
- `src/modules/iam/` — empty directory
- `src/modules/notes/` — empty directory
- `src/modules/audit/` — empty directory

### Modified

- `.eslintrc.json` — add `eslint-plugin-boundaries` or custom rule stubs for future enforcement
- `package.json` — add `eslint-plugin-boundaries` dev dependency

### Read-Only Audit

- Every file in `src/` — dependency graph generation
- Every file in `tests/` — fixture inventory

## Forbidden Changes

- **DO NOT** move any existing source file.
- **DO NOT** modify any business logic, service, controller, repository, or middleware.
- **DO NOT** modify any test file.
- **DO NOT** modify `prisma/schema.prisma`.
- **DO NOT** change any import paths in production code.

## Risk Level

**LOW** — This phase only creates empty directories, adds a dev dependency, and generates documentation.

## Required Green Tests

| Suite             | File                                                         | Must Pass |
| ----------------- | ------------------------------------------------------------ | --------- |
| All Integration   | `tests/integration/*.test.js`                                | ✅        |
| All Unit          | `tests/unit/**/*.test.js`                                    | ✅        |
| Security          | `tests/integration/security.test.js`                         | ✅        |
| Redis Degradation | `tests/integration/infrastructure/redis-degradation.test.js` | ✅        |

## Required Regression Tests

- Full `npm test` — baseline green snapshot.

## Rollback Strategy

```bash
git checkout main
git branch -D refactor/phase-0-preparation
```

No data migration. No schema changes. Pure revert.

## Exit Criteria

1. ✅ All tests pass on the `refactor/phase-0-preparation` branch.
2. ✅ Empty module directories exist under `src/modules/` and `src/shared/`.
3. ✅ A git tag `baseline/pre-modular-monolith` is created on `main` at the exact commit before any migration work.
4. ✅ `eslint-plugin-boundaries` is installed (rules disabled — enforcement deferred to Phase 6).
5. ✅ A dependency graph document is generated mapping every `require()` call in `src/`.

## Expected Refactor Pattern

- **Scaffold-first**: Create the target directory skeleton without moving code.
- **Snapshot-then-branch**: Tag the baseline before any structural changes begin.

## Operational Risks

| Risk                                                     | Likelihood | Mitigation                                              |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| Dev dependency install breaks lockfile                   | Low        | Run `npm ci` after install to verify lockfile integrity |
| Empty directories not committed (git ignores empty dirs) | Medium     | Add `.gitkeep` files to each empty directory            |

## Detailed Steps

### Step 0.1 — Create Baseline Tag

```bash
git tag baseline/pre-modular-monolith
git push origin baseline/pre-modular-monolith
```

### Step 0.2 — Create Phase Branch

```bash
git checkout -b refactor/phase-0-preparation
```

### Step 0.3 — Scaffold Target Directories

```
src/
  shared/
    kernel/.gitkeep
    testing/.gitkeep
  modules/
    iam/.gitkeep
    notes/.gitkeep
    audit/.gitkeep
```

### Step 0.4 — Install Boundary Linting

```bash
npm install --save-dev eslint-plugin-boundaries
```

Add a disabled rule placeholder in `.eslintrc.json`:

```json
{
  "plugins": ["boundaries"],
  "settings": {
    "boundaries/elements": []
  },
  "rules": {
    "boundaries/element-types": "off"
  }
}
```

### Step 0.5 — Run Full Test Suite

```bash
npm test
```

All tests MUST pass. If any test fails, this phase CANNOT proceed.

### Step 0.6 — Generate Dependency Inventory

Run a `grep` or `madge` analysis to produce a complete `require()` dependency map of `src/`. Store the output in `migration-blueprint/DEPENDENCY_INVENTORY_PHASE_0.md`.

### Step 0.7 — Tag Phase Completion

```bash
git tag checkpoint/phase-0-complete
```
