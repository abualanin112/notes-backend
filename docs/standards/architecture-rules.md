# Architecture Rules

This project is a Pragmatic Node.js Modular Monolith.

## Core Philosophy

- Pragmatic architecture over pure theory.
- Flat module structures.
- Explicit, low-nesting boundaries.
- Maintainable and simple code.
- Avoid enterprise Java-style ceremony and fake microservice abstractions.

## 1. Project Layout

```txt
src/
├── modules/           # Business domains (e.g. iam, notes)
├── infrastructure/    # Concrete tech implementations (prisma, redis)
├── middleware/        # Global Express middlewares
├── shared/            # Stateless pure utilities and constants
└── index.js           # Entrypoint
```

## 2. Modules

Modules encapsulate a business domain.

- Prefer flat structures within the module (`src/modules/notes/note.service.js`).
- Do not unnecessarily nest (`src/modules/notes/services/note.service.js`).
- Modules communicate **ONLY** via exported services. Do not cross-import controllers, repositories, or internal tools across modules.

## 3. Infrastructure Boundaries

Infrastructure concerns (Prisma, Redis, Mailers, Queues) belong strictly in `src/infrastructure/`.

- Do NOT place infrastructure in `shared/`.
- Infrastructure components should be simple flat files (`prisma.js`, `redis.js`) rather than deeply nested folders unless absolutely required.

## 4. Shared Layer

`src/shared/` is exclusively for **stateless utilities**.

- Shared layer filenames MUST use `PascalCase.js` (e.g., `ApiError.js`, `CatchAsync.js`).
- Shared layer files MUST export pure functional named exports (e.g. `export { pick }`). No pseudo-OOP namespaces.
- Generic helpers (`Pick.js`, `Paginate.js`)
- Constants (`Tokens.js`)

> [!CAUTION]
> Do NOT place business logic, infrastructure systems, or SDK wrappers inside `shared/`.

## 5. Centralized Routing

All routes must be aggregated centrally in `src/modules/router.js`.

- `app.js` mounts ONLY the centralized router.
- Do NOT mount module routes individually inside `app.js`.

## 6. Controllers vs. Services

- **Controllers**: Orchestrate the request/response flow. Call services. Do tiny transport-level transformations.
- **Services**: Own the core business logic.
- Avoid extracting trivial controller logic into services if there is no underlying business logic.
