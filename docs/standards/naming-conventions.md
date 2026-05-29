# Naming Conventions

This project enforces strict naming conventions to maintain a consistent flat Modular Monolith architecture.

## Core Rule

Use `feature.type.js`.

> [!IMPORTANT]
> Never use generic descriptor filenames like `routes.js`, `validation.js`, or `schema.js`. Never use camelCase `authService.js` or PascalCase `AuthService.js` for filenames.

### 1. Services

**Use:** `feature.service.js` (e.g. `auth.service.js`)
**Avoid:** `authService.js`, `AuthService.js`

### 2. Repositories

**Use:** `feature.repository.js` (e.g. `user.repository.js`)

### 3. Controllers

**Use:** `feature.controller.js` (e.g. `auth.controller.js`)

### 4. Routes

**Use:** `feature.route.js` (e.g. `user.route.js`)
**Avoid:** `routes.js`, `feature.routes.js`

### 5. Validators

**Use:** `feature.validator.js` (e.g. `auth.validator.js`)
**Avoid:** `validation.js`, `schema.js`

### 6. Serializers

**Use:** `feature.serializer.js` (e.g. `user.serializer.js`)
**Avoid:** `transformer.js`, `mapper.js`, `presenter.js`

### 7. Middleware

**Use:** `name.middleware.js` (e.g. `error.middleware.js`, `auth.middleware.js`, `validate.middleware.js`)

### 8. Workers

**Use:** `kebab-case.worker.js` (e.g. `token-cleanup.worker.js`)
**Avoid:** `tokenCleanup.worker.js`

### 9. Infrastructure

**Use:** Simple runtime-oriented names without suffixes.
**Good:** `prisma.js`, `redis.js`, `logger.js`, `mailer.js`
**Avoid:** `redis.service.js`, `prisma.client.js`

### 10. Tests

**Use:** `*.test.js` exclusively.
**Good:** `auth.service.test.js`, `auth.integration.test.js`, `auth.e2e.test.js`
**Avoid:** `*.spec.js`

### 11. Shared Layer Utilities

**Use:** `PascalCase.js` exclusively.
**Good:** `ApiError.js`, `CatchAsync.js`, `Tokens.js`, `CustomValidator.js`
**Avoid:** `apiError.js`, `api-error.js`
