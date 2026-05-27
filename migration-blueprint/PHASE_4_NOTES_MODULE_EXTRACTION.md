# Phase 4 — Notes Module Extraction

> **Risk Level**: MEDIUM  
> **Estimated Duration**: 3–4 days  
> **Branch**: `refactor/phase-4-notes-extraction`  
> **Prerequisite**: Phase 3 complete (tag `checkpoint/phase-3-complete`)

---

## Goal

Extract the Notes domain into `src/modules/notes/`. This module owns all Note CRUD operations, the note serializer, note-specific ownership assertions, and note validations. It depends on the IAM module for authentication and authorization primitives.

## Scope — Files Moved

| Current Path                          | Target Path                                         |
| ------------------------------------- | --------------------------------------------------- |
| `src/services/note.service.js`        | `src/modules/notes/services/note.service.js`        |
| `src/repositories/note.repository.js` | `src/modules/notes/repositories/note.repository.js` |
| `src/controllers/note.controller.js`  | `src/modules/notes/controllers/note.controller.js`  |
| `src/routes/v1/note.route.js`         | `src/modules/notes/routes/note.route.js`            |
| `src/serializers/note.serializer.js`  | `src/modules/notes/serializers/note.serializer.js`  |
| `src/validations/note.validation.js`  | `src/modules/notes/validations/note.validation.js`  |

### Critical Extraction — Ownership Logic

Move `assertCanManageNote` OUT of `src/modules/iam/services/authorization.service.js` and INTO a new Notes-local policy:

**Created**: `src/modules/notes/policies/note.policy.js`

```javascript
const { permissionService } = require('../../iam');

const assertCanManageNote = async (actor, noteOwnerId) => {
  const isOwnResource = actor.id === noteOwnerId;
  const requiredScope = isOwnResource ? 'own' : 'any';
  const permission = `update:notes:${requiredScope}`;

  if (await permissionService.hasPermission(actor.id, permission)) {
    return true;
  }
  // ... existing denial logic
};

module.exports = { assertCanManageNote };
```

### Cross-Module Contract — Note Cascade Deletion

**Created**: Add to `src/modules/notes/index.js`:

```javascript
module.exports = {
  // ... existing exports
  deleteNotesForUser: async (userId, tx) => {
    return noteRepository.deleteManyByOwnerId(userId, tx);
  },
};
```

**Updated**: `src/modules/iam/services/user.service.js`:

```javascript
// Replace: const { noteRepository } = require('../repositories');
// With: const { deleteNotesForUser } = require('../../notes');
await deleteNotesForUser(userId, tx);
```

### Public Contract — `src/modules/notes/index.js`

```javascript
const noteService = require('./services/note.service');
const noteRouter = require('./routes/note.route');
const noteRepository = require('./repositories/note.repository');
const { serializeNote } = require('./serializers/note.serializer');

module.exports = {
  noteService,
  noteRouter,
  serializeNote,
  deleteNotesForUser: noteRepository.deleteManyByOwnerId,
};
```

## Forbidden Changes

- **DO NOT** modify the RBAC permission resolution logic.
- **DO NOT** modify the Prisma schema.
- **DO NOT** change Note serializer output shape.
- **DO NOT** modify `security.test.js`.

## Risk Level

**MEDIUM** — The Notes module has fewer dependencies than IAM. The primary risk is the `assertCanManageNote` migration and the `deleteNotesForUser` cross-module contract.

## Required Green Tests

| Suite                                            | Must Pass | Why Critical                                             |
| ------------------------------------------------ | --------- | -------------------------------------------------------- |
| `tests/integration/note.test.js`                 | ✅        | All Note CRUD: create, read, update, delete, pagination  |
| `tests/integration/user.test.js`                 | ✅        | User deletion cascades to notes via `deleteNotesForUser` |
| `tests/integration/security.test.js`             | ✅        | Validates note ownership isolation                       |
| `tests/unit/serializers/note.serializer.test.js` | ✅        | Serializer output shape unchanged                        |
| All other suites                                 | ✅        | Full regression                                          |

## Rollback Strategy

```bash
git checkout checkpoint/phase-3-complete
```

## Exit Criteria

1. ✅ `src/modules/notes/` contains all Note-related files.
2. ✅ `assertCanManageNote` lives in `src/modules/notes/policies/note.policy.js`.
3. ✅ `user.service.js` calls `deleteNotesForUser` from the Notes module contract, NOT from `noteRepository` directly.
4. ✅ `note.route.js` imports `auth` middleware from `../../iam` module contract.
5. ✅ Full `npm test` passes.
6. ✅ Tag `checkpoint/phase-4-complete`.

## Expected Refactor Pattern

- **Module Extraction**: Move + Adapter.
- **Policy Extraction**: Ownership logic moves from generic auth service to domain-specific policy.
- **Cross-Module Contract**: `deleteNotesForUser` formalizes the cascade interface.

## Operational Risks

| Risk                                                                                                                   | Likelihood | Impact                    | Mitigation                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `note.controller.js` ownership check (`note.ownerId !== req.user.id`) is duplicated with the new policy                | Medium     | Inconsistent enforcement  | Keep controller checks as-is (defense in depth). The policy is for service-level enforcement. |
| `note.route.js` uses `auth('create:notes:own')` which resolves through IAM — path must resolve through module boundary | **HIGH**   | Routes fail → 500         | Verify `auth` middleware import resolves through `../../iam` or the re-export adapter         |
| `note.repository.js` includes `cleanNoteIncludes` which `select`s User fields — cross-module Prisma leakage            | Medium     | Violates strict isolation | **Acceptable for now** — Prisma schema is unified. Flag for Phase 7 transaction convergence.  |
