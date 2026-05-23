# Contributing to Notes Backend

Welcome to the Notes Backend repository! This project serves not just as a Notes application, but as a blueprint for an Enterprise ERP-ready backend.

To ensure the codebase remains maintainable, scalable, and secure, all contributors must strictly adhere to the following architectural guidelines.

## 1. Architectural Boundaries

### Thin Controllers, Fat Services

Controllers are strictly responsible for:

- Parsing incoming HTTP requests (params, body, queries).
- Invoking `authorizationService` helpers to check permissions.
- Invoking business logic `services`.
- Formatting the HTTP response (including serialization) and returning status codes.

**Rule:** Controllers must NEVER contain business logic. Services must NEVER receive `req` or `res` objects.

### Repositories Never Authorize

Repositories are strictly a data access abstraction layer over Prisma.

- They execute raw data mutations and queries.
- They must NEVER enforce RBAC rules, check ownership for security purposes, or contain business validation.
- All authorization decisions must be made in the `authorizationService` BEFORE the repository is invoked.

### Explicit Response Boundaries (Serializers)

Prisma entities must never be dumped directly into `res.send()`.
**Rule:** Every response object must pass through an explicit serializer (e.g., `serializeUser()`, `serializeNote()`) to prevent accidental leakage of internal IDs, password hashes, or soft-delete flags.

## 2. Observability & Logging

### Operational vs. Audit Logs

We utilize two distinct logging pipelines:

1. **Operational Logs (`logger.info`, `logger.error`)**:
   - Used for diagnostics, performance monitoring, and debugging.
   - Example: `system.db.connected`, `auth.login.failed`.
   - Never log sensitive fields (passwords, tokens, cookies).
2. **Audit Logs (`auditService.logEvent`)**:
   - Used for strict accountability and legal compliance.
   - Tells us "Who did what, to which entity, and when?".
   - Example: Logging when a user deletes a note or resets a password.

**Rule:** All logs must use the formal event taxonomy: `domain.entity.action` (e.g., `notes.note.created`). Do not use ad-hoc string concatenation (`logger.info("User " + id + " updated")`).

## 3. Local Development Environment

To start developing locally, we use Docker Compose to guarantee environment parity.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local database and backend:
   ```bash
   npm run docker:dev
   ```
3. Run the test suite:
   ```bash
   npm run test
   ```
   _(Note: You must have Docker running locally, as the test suite uses Testcontainers to spin up ephemeral PostgreSQL instances)._

## 4. Commit Conventions

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
All commits must be prefixed appropriately (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Our `husky` and `commitlint` setup will automatically reject improperly formatted commit messages.
