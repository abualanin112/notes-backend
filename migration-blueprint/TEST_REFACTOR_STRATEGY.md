# Test Refactor Strategy

## 1. Moving the Tests

Tests will move alongside the code they verify.

**From:**

```
tests/
  integration/
    note.test.js
    auth.test.js
  unit/
    note.serializer.test.js
```

**To:**

```
src/
  modules/
    notes/
      tests/
        integration/note.test.js
        unit/note.serializer.test.js
```

## 2. Refactoring Fixtures

Fixtures currently reside in `tests/fixtures/`. As modules become isolated, fixtures must adapt.

- **Domain Fixtures**: `note.fixture.js` moves to `src/modules/notes/tests/fixtures/`.
- **Cross-Boundary Setup**: If an integration test in `Notes` needs a `User` to exist, it MUST call the `IAMModule` public API or use a generic HTTP API fixture to create the user, rather than using Prisma directly to inject rows into the `users` table.

## 3. Global Test Setup

`tests/utils/globalSetup.js` and `tests/utils/setupTestDB.js` will remain in a central `tests/` or `src/shared/testing/` directory, as they provide infrastructure (Testcontainers, Vitest config) applicable to all modules.
