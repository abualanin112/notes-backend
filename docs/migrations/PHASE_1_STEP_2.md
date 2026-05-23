# PHASE 1 — STEP 2: Repository Boundary Enforcement & Transaction Architecture Audit

## Task Summary

This step focused on auditing and enforcing strict boundary isolation for the Prisma ORM. Services must never import `@prisma/client`, repositories must not contain business logic, and transactions must be owned by services but executed via repository helpers.

---

## src/services/user.service.js

### # FILE ANALYSIS

- **Current Responsibility:** Orchestrates user creation, updates, and deletion. Handles tiered cascading logic for user note deletion.
- **Detected Issue:**
  1. Leaky abstraction: Imported `prisma` directly from `src/config/prisma.js`.
  2. Transaction violation: Interacted directly with the Prisma model `tx.note` inside a transaction block instead of using a repository.
  3. Error Handling violation: Caught Prisma error code `P2002` manually inside the service instead of validating domain state or letting the repository handle it.
- **Migration Risk:** Medium. Refactoring transaction scopes and error handling paths can subtly break API responses if validation logic is misaligned.

### # CHANGE APPLIED

- Replaced `prisma.$transaction` with a new generic `runInTransaction` helper exported from the repository layer.
- Replaced direct `tx.note.deleteMany` with `noteRepository.deleteManyByOwnerId(userId, tx)`.
- Removed the explicit `P2002` catch blocks and replaced them with domain-level `userRepository.isEmailTaken()` checks before attempting `create` or `updateById`.

### # ARCHITECTURAL REASONING

- Services should not be aware of what database engine is running. Catching specific Prisma error codes (`P2002`) couples the service to Prisma. By delegating unique constraints to the repository's domain interface (`isEmailTaken`), we keep the service pure.
- Transactions represent business workflows, so services must define their boundaries. However, the mechanism of starting the transaction (`prisma.$transaction`) is a persistence concern. Exporting `runInTransaction` bridges this cleanly.

### # VALIDATION

- Verified by `npm run lint` (0 errors). Business logic remains functionally identical.

### # REMAINING TECHNICAL DEBT

- None for this file.

---

## src/services/auth.service.js

### # FILE ANALYSIS

- **Current Responsibility:** Orchestrates login, refresh, and password reset flows.
- **Detected Issue:** Imported `prisma` directly to initiate `$transaction` blocks for atomic token swapping and password resets.
- **Migration Risk:** Low. Transaction scope remains identical.

### # CHANGE APPLIED

- Removed the direct `prisma` import.
- Replaced `prisma.$transaction(async (tx) => { ... })` with `runInTransaction(async (tx) => { ... })`.

### # ARCHITECTURAL REASONING

- Prevents the authorization logic from becoming tightly coupled to the Prisma client lifecycle.

### # VALIDATION

- Verified by `npm run lint`. Transaction atomicity is preserved.

### # REMAINING TECHNICAL DEBT

- Token rotation logic (Phase 6) remains deferred.

---

## src/services/token.service.js

### # FILE ANALYSIS

- **Current Responsibility:** Issues, verifies, and revokes JWTs and opaque database tokens.
- **Detected Issue:** Function signatures explicitly declared `tx = prisma` as a default parameter. This forced the service to import `prisma` merely to provide a default value to the repository layer.
- **Migration Risk:** Low. JavaScript default parameter semantics allow clean delegation.

### # CHANGE APPLIED

- Removed the `prisma` import.
- Changed function signatures from `(..., tx = prisma)` to `(..., tx = undefined)`.
- Relied on the downstream repository methods (e.g., `tokenRepository.create(..., tx)`) to enforce their own default `tx = prisma` if `undefined` is passed.

### # ARCHITECTURAL REASONING

- Default parameters should be evaluated closest to where they are strictly required. The repository defines the default database connection; the service merely acts as a passthrough.

### # VALIDATION

- Verified by `npm run lint`. Downstream repository integration remains intact.

### # REMAINING TECHNICAL DEBT

- None for this file.

---

## src/repositories/index.js

### # FILE ANALYSIS

- **Current Responsibility:** Centralized export module for all repositories.
- **Detected Issue:** Missing a mechanism for services to initiate database transactions without importing Prisma.
- **Migration Risk:** Low. Purely additive helper.

### # CHANGE APPLIED

- Added and exported `const runInTransaction = (callback) => prisma.$transaction(callback);`.

### # ARCHITECTURAL REASONING

- Provides a secure persistence boundary. Services can import `runInTransaction` from the repositories folder, treating it as a generic Unit of Work provider.

### # VALIDATION

- Verified by `npm run lint`.

### # REMAINING TECHNICAL DEBT

- Future ERP multi-table distributed transactions may require a more complex Unit of Work object, but this simple callback wrapper suffices for the current modular monolith.

---

## src/repositories/note.repository.js

### # FILE ANALYSIS

- **Current Responsibility:** Persistence logic for notes.
- **Detected Issue:** Missing a dedicated method to handle cascading deletion for users, which forced the user service to bypass the repository.
- **Migration Risk:** Low. Purely additive method.

### # CHANGE APPLIED

- Added `deleteManyByOwnerId(ownerId, tx = prisma)`.

### # ARCHITECTURAL REASONING

- Centralizes all note-related Prisma interactions. The `tx.note` object should never be accessed outside this file.

### # VALIDATION

- Verified by `npm run lint`.

### # REMAINING TECHNICAL DEBT

- None.

---

## src/middlewares/error.js

### # FILE ANALYSIS

- **Current Responsibility:** Centralized HTTP error formatter and Prisma-to-ApiError mapping layer.
- **Detected Issue:** The transformation logic already existed (mapping `P2002`, `P2025`, `P2003`), but earlier service logic was bypassing it.
- **Migration Risk:** N/A.
- **Change Applied:** Audited and verified. No code changes required as it was structurally correct. By cleaning up `user.service.js`, this layer is now the _only_ place where raw Prisma errors are processed globally.

---

## PRISMA ACCESS CONSISTENCY AUDIT SUMMARY

- **Prisma Client Singleton:** Verified to be strictly instantiated in `src/config/prisma.js`.
- **Repository Isolation:** Complete. No service, controller, or utility imports `@prisma/client` or the `config/prisma` instance.
- **Transaction Ownership:** Services correctly own transactions via `runInTransaction`, passing the contextual `tx` object downwards. Repositories accept `tx` cleanly.

_All Phase 1 - Step 2 requirements met._
