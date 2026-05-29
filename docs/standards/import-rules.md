# Import Rules

This project uses Node.js ESM. ESM strictness and modular boundaries are enforced via ESLint.

## 1. Strict ESM Imports

All local imports **MUST** include the `.js` extension.

**GOOD:**

```js
import { createUser } from './user.service.js';
```

**BAD:**

```js
import { createUser } from './user.service';
```

## 2. Named Exports Only

Always use named exports to ensure predictable imports, safer refactoring, and explicit APIs.

**Use:**

```js
export const ...
export function ...
export class ...
```

**Never use:**

```js
export default ...
```

## 3. The Barrel Pattern Rules

Every module exposes its public API through `index.js` acting as a barrel.

- **Cross-Module Communication**: Modules must import from sibling modules using the index barrel.
  ```js
  import { createUser } from '../users/index.js';
  ```
- **Internal Communication**: Inside the _same_ module, do **NOT** import through `index.js`. Use direct sibling imports to avoid circular dependencies.
  ```js
  // Inside the IAM module
  import { findUser } from './user.repository.js'; // GOOD
  import { findUser } from '../index.js'; // BAD
  ```

## 4. Prevent God Index Files

Module `index.js` files are public contracts. They must expose **ONLY**:

- Public services
- Public APIs
- Module registration helpers

> [!WARNING]
> Do NOT use `export *` excessively. Do NOT expose internal utilities, repositories, or validators unless intentionally making them public.

## 5. Circular Dependency Prevention

- Avoid cyclic module imports.
- Avoid barrel-to-barrel imports.
- Avoid infrastructure ↔ module cycles.
- Run `npx madge --circular src/` regularly to validate the DAG.
