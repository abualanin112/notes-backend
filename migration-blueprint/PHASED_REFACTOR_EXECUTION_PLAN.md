# Phased Refactor Execution Plan

## Phase 0: Prerequisite Tooling

- Implement boundary linting rules (`eslint-plugin-boundaries`).
- Add continuous integration steps to block regressions in the `SECURITY_REGRESSION_MATRIX`.

## Phase 1: Shared Kernel Extraction

- **Goal**: Consolidate global state and utilities.
- **Actions**:
  1. Move `config/`, `utils/`, `middlewares/error.js` to `src/shared/kernel`.
  2. Refactor all imports across the codebase to point to the new Shared Kernel.
  3. _Validation_: All tests must pass. No domain logic should exist in the Kernel.

## Phase 2: Observability Decoupling (Audit)

- **Goal**: Break the synchronous transaction coupling between business domains and Audit.
- **Actions**:
  1. Create `src/modules/audit`.
  2. Implement an in-memory Event Bus.
  3. Refactor `AuditService` to subscribe to events rather than exposing `logEvent(tx)` synchronously.
  4. Move Audit models and repositories into the Audit module.

## Phase 3: Core Domain Extraction (Notes)

- **Goal**: Isolate the Notes domain.
- **Actions**:
  1. Create `src/modules/notes`.
  2. Move `note.route.js`, `note.controller.js`, `note.service.js`, `note.repository.js` into the module.
  3. Export a strict public API from `src/modules/notes/index.js`.
  4. Ensure `note.service.js` fetches authorization data by calling the old IAM service temporarily.

## Phase 4: Security & IAM Isolation

- **Goal**: Finalize the IAM boundary.
- **Actions**:
  1. Create `src/modules/iam`.
  2. Consolidate `Auth`, `User`, `Role`, `Permission`, `Token` logic.
  3. Expose a `PolicyEngine` or `hasPermission` contract.
  4. Remove generic entity knowledge from IAM. Move `assertCanManageNote` into the Notes module.

## Phase 5: Routing & App Shell Assembly

- **Goal**: Decentralize routing.
- **Actions**:
  1. Replace `src/routes/v1/index.js` with module-level routers.
  2. Assemble routers in `src/app.js` using module exports.
