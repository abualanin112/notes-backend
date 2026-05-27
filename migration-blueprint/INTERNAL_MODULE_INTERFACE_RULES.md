# Internal Module Interface Rules

## 1. The Interface Contract

Modules are strictly prohibited from importing files deep within another module.
All cross-module communication must happen through the exported contract defined in the module's `index.js` (or a dedicated `contract.js`).

### Example Violation:

```javascript
// BAD: NoteService digging into IAM module internals
const { userRepository } = require('../../iam/repositories/user.repository');
```

### Example Conformity:

```javascript
// GOOD: Calling the explicit public API of the IAM module
const { iamService } = require('../../iam');
```

## 2. Data Transfer Objects (DTOs)

When a module returns data to another module, it MUST return POJOs (Plain Old JavaScript Objects).
Returning Prisma instances is strictly forbidden as it leaks database structure and allows lazy-loading relations across boundaries.

## 3. Synchronous vs Asynchronous Communication

- **Synchronous**: Acceptable for read queries (e.g., `NotesModule` asking `IAMModule` if a user has a permission).
- **Asynchronous / Orchestrated**: Required for distributed writes across boundaries.

## 4. Enforcement Strategy

We will introduce ESLint boundary rules (e.g., `eslint-plugin-boundaries` or custom rules) that statically prevent imports matching `src/modules/*/**` from outside the module, forcing all imports to resolve to `src/modules/*/index.js`.
