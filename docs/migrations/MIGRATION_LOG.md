# Migration Log: Mongoose to Prisma Migration

This log tracks the step-by-step migration progress of `notes-backend` from Mongoose/MongoDB to Prisma/PostgreSQL.

---

## Step 1: Database Schema & Configuration

### 1. Files Created/Modified

- **`[NEW] prisma/schema.prisma`**: The core Prisma schema containing database datasource, generator configurations, and models.
- **`[MODIFY] .env`**: Added the `DATABASE_URL` PostgreSQL connection string alongside the legacy `MONGODB_URL`.
- **`[MODIFY] .gitignore`**: Excluded `src/generated` from Git tracking (auto-generated Zod validation schemas).

### 2. Code Changes Details

- **Datasource Configuration**: Set up PostgreSQL connection with explicit environment variable mapping.
- **Generator Setup**:
  - `prisma-client-js` with `fullTextSearchPostgres` preview feature.
  - `zod-prisma-types` to automatically generate base Zod schemas from database definitions.
- **ORM Version Decision**: Used **Prisma 6.19.3** to preserve standard schema connection architecture in a pure Node.js CommonJS environment, avoiding excessive TS-adapter boilerplate of Prisma 7.
- **Models Implemented**:
  - `User`: Mapped `id` to CUID2 (`@default(cuid())`), `role` to enum, and added snake_case DB mapping (`@map`).
  - `Token`: Mapped `id` to CUID2, linked to `User` via cascade-on-delete (`onDelete: Cascade`), and indexed for high-volume session queries.
  - `Note`: Mapped `id` to CUID2, implemented PostgreSQL scalar string list for `tags` (`String[]`), linked to `User` via RESTRICT (`onDelete: Restrict`) to prevent accidental data cascades, and added composite querying indexes.

### 3. Key Instructions & Breaking Changes

- **CUID2 IDs**: All IDs are now 25-character time-sorted CUID2 strings (e.g., `clh3am0g40000qwer1234abcd`) instead of 24-character hexadecimal MongoDB ObjectIds.
- **Schema Autogeneration**: Running `npx prisma generate` creates all Zod base models under `src/generated/zod/index.ts`. Do not edit these files manually.

---

## Step 2: Custom Validation & Repository Layer Infrastructure

### 1. Files Created/Modified

- **`[MODIFY] src/validations/custom.validation.js`**: Updated validation regex of `objectId` helper to match CUID2 strings.
- **`[MODIFY] src/config/config.js`**: Added validation logic for `DATABASE_URL` under Zod environment validation and exported it.
- **`[NEW] src/config/prisma.js`**: Initialized and configured the global Prisma Client singleton.
- **`[NEW] src/utils/paginate.js`**: Created a generic offset pagination utility matching the exact output shape of the old Mongoose pagination plugin.
- **`[NEW] src/repositories/user.repository.js`**: Implemented User data-access methods.
- **`[NEW] src/repositories/token.repository.js`**: Implemented Token data-access methods.
- **`[NEW] src/repositories/note.repository.js`**: Implemented Note data-access methods (supporting CUID2 translation and case-insensitive OR filtering).
- **`[NEW] src/repositories/index.js`**: Exporter mapping all repositories to a central interface.
- **`[NEW] tests/unit/utils/paginate.test.js`**: Added comprehensive unit tests for the generic pagination utility.
- **`[NEW] tests/unit/repositories/repository.test.js`**: Added unit tests validating the repositories to database mappings.

### 2. Code Changes Details

- **CUID2 Validation**: Instead of breaking existing schemas, `objectId` helper is updated to validate 25-character CUID2 lowercase alphanumeric formats (`/^[a-z][a-z0-9]{24}$/`).
- **Connection Management (Singleton)**: Designed `prisma.js` to reuse single PrismaClient instance with explicit Winston logging hooks in development and standard connection parameterization.
- **Security Boundary (Global Omit)**: Enabled native global `omit: { user: { password: true } }` on the Prisma client. All queries on the user model will automatically exclude the hashed password, preventing leakages. Auth logic can explicitly override this with `{ includePassword: true }`.
- **Relational Pagination**:
  - Implemented dynamic sort parsing for `sortBy=field:desc,field2:asc`.
  - Implemented recursive dot-notation translator to convert Mongoose-style populates (e.g. `owner.notes`) into nested Prisma `include` clauses (e.g. `{ owner: { include: { notes: true } } }`).
- **Injectable Transactions**: Every repository method receives an optional `tx` transactional database delegate, facilitating complex multi-model mutations wrapped inside a single atomic transaction context.

### 3. Key Instructions & Breaking Changes

- **Backwards Compatibility**: The `objectId` validation utility was deliberately not renamed, preserving exact schema code in all validation files (`user.validation.js`, `note.validation.js`).
- **Secure Password Fetching**: In `userRepository`, standard lookups will _never_ return the password hash. Only use `userRepository.findByEmail(email, { includePassword: true })` inside authentication handlers.

---

## Step 3: Services Layer Refactoring

### 1. Files Created/Modified

- **`[NEW] src/utils/password.js`**: Created standalone bcrypt password hashing and comparison utility.
- **`[MODIFY] src/services/user.service.js`**: Refactored to use `userRepository` and the standalone `password` utility, completely removing active-record dependencies.
- **`[MODIFY] src/services/token.service.js`**: Refactored to use `tokenRepository`, with transaction support propagated through method signatures.
- **`[MODIFY] src/services/auth.service.js`**: Implemented robust `prisma.$transaction` context for all multi-step workflows.
- **`[MODIFY] src/services/note.service.js`**: Shifted query logics, pagination, and deletions to `noteRepository` (incorporating CUID2 mappings).
- **`[NEW] tests/unit/utils/password.test.js`**: Unit test suite validating standalone bcrypt hashing and verifications.

### 2. Code Changes Details

- **Active-Record Elimination**: Removed all `user.save()`, `user.remove()`, `note.save()`, and `note.deleteOne()` invocations. Logic flows are now entirely stateless at the service level, delegating all storage updates to repository methods.
- **Detached Password Hooks**: Mongoose's automatic pre-save password-hashing and comparison hooks are replaced by calling `hashPassword` and `comparePassword` in `user.service.js` and `auth.service.js`.
- **Atomic Transactions**: Multi-query processes are natively wrapped in `prisma.$transaction(async (tx) => { ... })`:
  - `refreshAuth`: Deletes expired token and issues new tokens in a single PostgreSQL transaction block.
  - `resetPassword` / `verifyEmail`: Securely verifies tokens, removes them, and updates the User model atomically.
  - `deleteUserById` (Tiered Deletion): Due to the `Restrict` onDelete constraint on the `Note` table, user notes are explicitly deleted prior to deleting the user, preventing foreign key exceptions in a secure atomic execution.
- **PostgreSQL Full-Text Search Translation**: Replaced Mongoose-specific query filters with Prisma-safe structures:
  - Query filters (e.g. `{ search }`) are intercepted and compiled to case-insensitive `contains` operators across `title` and `content` fields.

### 3. Key Instructions & Breaking Changes

- **Relations Mapping**: Field names mapped from Mongoose models to PostgreSQL are normalized. In tokens, `token.user` is renamed to `token.userId` to conform to Prisma relational schemas.
- **Strict Omit Enforcement**: Authentication is verified by executing `userRepository.findByEmail(email, { includePassword: true })` to temporarily fetch the hash. The password is then explicitly deleted from the returned object before sending it to the controller.

---

## Step 4: Validation Layer, Middlewares, & Auth Configuration

### 1. Files Created/Modified

- **`[MODIFY] src/validations/user.validation.js`**: Composed request schemas picking directly from the auto-generated Prisma `UserSchema`.
- **`[MODIFY] src/validations/auth.validation.js`**: Composed request schemas picking directly from the auto-generated Prisma `UserSchema`.
- **`[MODIFY] src/validations/note.validation.js`**: Composed request schemas picking directly from the auto-generated Prisma `NoteSchema` (fixing a structural bug in `createNote`).
- **`[MODIFY] src/middlewares/error.js`**: Replaced all MongoDB-specific checks with a high-fidelity Prisma error mapping system.
- **`[MODIFY] src/config/passport.js`**: Integrated Passport JWT verification with `userRepository.findById` to authenticate via PostgreSQL.
- **`[MODIFY] src/app.js`**: Removed `express-mongo-sanitize` middleware entirely.
- **`[MODIFY] src/routes/v1/index.js`**: Registered the legacy blocker `/notes` route in the Express routing engine.
- **`[MODIFY] tests/unit/middlewares/error.test.js`**: Replaced all Mongoose-specific unit tests with high-fidelity Prisma error-mapping tests.

### 2. Code Changes Details

- **Zod Schema Reusability**: Eliminated manual field definition duplication. All endpoint validation objects (`createUser`, `updateUser`, `register`, `login`, `createNote`, `updateNote`) are composed dynamically from the auto-generated Prisma database Zod schemas (`UserSchema` and `NoteSchema`) via `.pick()`, `.partial()`, and `.extend()`, enforcing strict database-to-request mapping consistency.
- **Database Error Converter**:
  - `mongoose.Error` checks are fully deleted.
  - Implemented high-fidelity catch block for `PrismaClientKnownRequestError` mapping:
    - **`P2002`** (Unique constraint violation, e.g. duplicate email) -> returns a clean `400 Bad Request` mapping the target duplicate field names.
    - **`P2025`** (Record to update/delete not found) -> returns `404 Not Found`.
    - **`P2003`** (Foreign key constraint violation) -> returns `400 Bad Request`.
  - Implemented catch block for `PrismaClientValidationError` -> returns `400 Bad Request`.
- **Authentication Decoupling**: passport-jwt authentication queries are successfully routed away from the active-record `User` model, querying the PostgreSQL singleton via `userRepository.findById` to inject the user object into `req.user`.
- **Blocked Endpoint Registration**: Added `noteRoute` to `defaultRoutes` inside `src/routes/v1/index.js`, fixing a severe active routing registration issue.

### 3. Key Instructions & Breaking Changes

- **CUID2 Regexp Verification**: Kept `refine(objectId)` for user-defined parameter validation (`userId`, `noteId`) as CUID2 lowercase alphanumeric structures starting with any letter will fail standard v1-cuid checks built into Zod (`z.string().cuid()`).
- **Sanitization Decommissioning**: `express-mongo-sanitize` is no longer loaded, reducing unnecessary execution cycles since SQL injection is natively handled via Prisma parameterized queries.

---

## Phase 1: Configuration & Env Validation Cleanup

### 1. Files Created/Modified

- **`[MODIFY] src/config/config.js`**: Cleaned and purged Zod schema environment validation and configuration object exports from MongoDB/Mongoose parameters.
- **`[MODIFY] .env`**: Surgically removed legacy `MONGODB_URL`.
- **`[MODIFY] .env.example`**: Removed `MONGODB_URL` and added `DATABASE_URL` example representing PostgreSQL environment parameters.

### 2. Code Changes Details

- **Schema Validation Safety**: Eradicated the optional `MONGODB_URL` key definition from Zod's `envVarsSchema` validation object to ensure only valid database properties are accepted at process launch.
- **Mongoose Module Decommission**: Cleaned the exported object completely of the `mongoose` settings block, standardizing configuration parameter exports for Postgres/Prisma datasource singletons.

### 3. Key Instructions & Breaking Changes

- **Single DB Config Source of Truth**: `config.prisma.url` is now the sole relational target property. Ensure any direct deployment scripts or server runtimes do not rely on passing MONGODB_URL environment configurations.

---

## Phase 1: Models Eradication & Legacy Plugins Decommissioning

### 1. Files Deleted/Modified

- **`[DELETE] src/models/`**: Permanently eradicated the entire models folder, including `user.model.js`, `note.model.js`, `token.model.js`, and all files in the `plugins/` subfolder (`toJSON.plugin.js`, `paginate.plugin.js`).
- **`[DELETE] tests/unit/models/`**: Eradicated obsolete test files testing Mongoose schemas and Mongoose plugins.
- **`[MODIFY] tests/fixtures/user.fixture.js`**: Refactored to generate fully CUID2-compliant identifiers and perform bulk postgres database writes using the global `prisma` client.
- **`[MODIFY] tests/fixtures/token.fixture.js`**: Relinked token fixtures to reference the CUID2 `id` properties.
- **`[MODIFY] tests/integration/user.test.js`**: Removed imports to `/models` and introduced a clean, database-backed `User` adapter utilizing the Prisma client to run integration assertions.
- **`[MODIFY] tests/integration/auth.test.js`**: Removed imports to `/models` and introduced clean `User` and `Token` database-backed adapters to support existing assertions during transition.

### 2. Code Changes Details

- **Backward-Compatible CUID2 Generator**: Created a specialized String proxy returned by `createCuid2()` in user fixtures. The object incorporates a `.toHexString()` method to ensure legacy tests expecting MongoDB ObjectId string behaviors run without modifying thousands of assertion lines.
- **Mock DB Adapters for Integration Tests**: Designed high-fidelity database-backed adapters (`User`, `Token`) using raw queries and custom parameter selectors to bypass Prisma's global password omission boundaries inside integration test assertions.

### 3. Key Instructions & Breaking Changes

- **No Residual NoSQL Drivers**: All business logic, services, controllers, and middlewares are completely decoupled from MongoDB Mongoose models. The entire `src/models/` directory has been deleted.

---

## Phase 2: PostgreSQL Performance Tuning - GIN & pg_trgm Indexes

### 1. Files Created/Modified

- **`[NEW] prisma/migrations/20260518194500_add_trgm_gin_indexes/migration.sql`**: Created a raw SQL migration to configure high-performance GIN indexes on the `notes` table.

### 2. Code Changes Details

- **pg_trgm Extension**: Enabled the `pg_trgm` PostgreSQL module. This allows case-insensitive full-text searches using `LIKE`, `ILIKE`, or `contains` queries to be evaluated using indexed lookups instead of expensive sequential scans.
- **Trigram GIN Indexes**: Built optimized Generalized Inverted Indexes (`GIN`) using `gin_trgm_ops` on both `"title"` and `"content"` columns inside the `"notes"` table. This reduces the search latency of `Note` text lookups from $O(N)$ sequential scans to $O(\log N)$ logarithmic index operations on large production tables.

### 3. Key Instructions & Breaking Changes

- **Migration Application**: Execute `npx prisma migrate dev` or `npx prisma migrate deploy` locally to apply the newly written schema changes and index optimizations to your running PostgreSQL instance.

---

## Phase 2: PostgreSQL Performance Tuning - High-Traffic Cursor Pagination

### 1. Files Created/Modified

- **`[NEW] src/utils/paginateCursor.js`**: Designed and implemented the generic database-level cursor-based pagination engine.
- **`[NEW] tests/unit/utils/paginateCursor.test.js`**: Created exhaustive unit testing to guarantee mathematical correctness under varying payload sizes.
- **`[MODIFY] src/repositories/note.repository.js`**: Transitioned primary `paginateNotes` datastore layer querying from legacy offset skip to cursor matching.
- **`[MODIFY] src/controllers/note.controller.js`**: Adjusted REST parameters to bind, extract, and propagate the `cursor` property in place of `page`.
- **`[MODIFY] src/validations/note.validation.js`**: Replaced standard offset page validations with refined CUID2 cursor checks.
- **`[MODIFY] src/services/note.service.js`**: Updated query service interfaces to document cursor-driven return schemas.

### 2. Code Changes Details

- **Deterministic Time-Monotonic Sorting**: Sorting was configured strictly on `{ id: 'desc' }`. Because CUID2 elements are inherently time-sorted and monotonically incrementing, sorting by `createdAt` (which can create non-deterministic collisions under massive concurrent load at the same millisecond) was eliminated entirely.
- **Dynamic Limit Over-fetching**: Configured queries to request `limit + 1` elements. This enables real-time boolean determination of `hasNextPage` and extracts the final record's primary key CUID2 string as the exact `nextCursor` without conducting an expensive global `count(*)` computation.

### 3. Key Instructions & Breaking Changes

- **API Call Shape**: Clients calling `GET /v1/notes` must now query using the `cursor` parameter (e.g. `/v1/notes?limit=10&cursor=clh3am...`) instead of `page`. Responses return `{ results: [...], nextCursor: "...", hasNextPage: true }`.

---

## Phase 3: Validation & Security Hardening - Decoupled Schema Composition

### 1. Files Created/Modified

- **`[NEW] src/generated/zod/index.js`**: Transpiled the auto-generated Zod TypeScript schemas into CommonJS JavaScript to resolve standard Node runtime load dependencies.
- **`[MODIFY] src/validations/auth.validation.js`**: Refactored schemas using strict inheritance and picking patterns from `UserSchema`.
- **`[MODIFY] src/validations/user.validation.js`**: Replaced primitive constraints with lightweight `.pick()` and `.partial()` compositions on the base `UserSchema`.
- **`[MODIFY] src/validations/note.validation.js`**: Adapted schema validation for CUID2 cursors, inheriting all note parameters from `NoteSchema`.

### 2. Code Changes Details

- **CommonJS Transpilation**: Compiled `src/generated/zod/index.ts` to `index.js` using `esbuild`. This eliminates the "Double Maintenance" trap while allowing the main Node application to import generated schemas natively at bootloader level without transpilation/loader performance penalties.
- **Strict Dry Composition**: Composed request schemas using `.pick()`, `.extend()`, `.omit()`, and `.partial()` on `UserSchema` and `NoteSchema`. Standard field constraints (like name string lengths, email regexes, and tag array definitions) are maintained solely in the Prisma schema as the single source of truth, avoiding duplicate code and constraint drifting.

### 3. Key Instructions & Breaking Changes

- **Single Source of Truth**: Any schema modifications (e.g. title lengths, new model properties) must be performed inside `prisma/schema.prisma` and regenerated using `npx prisma generate`, which automatically recreates the compiled JS schemas.

---

## Phase 3: Validation & Security Hardening - Nested Relational Protection Whitelists

### 1. Files Created/Modified

- **`[MODIFY] src/repositories/note.repository.js`**: Introduced a non-bypassable `cleanNoteIncludes` whitelist block and refactored repository read methods to strictly secure joins.

### 2. Code Changes Details

- **Non-Bypassable Whitelist Block**: Implemented a strict whitelist schema parameter:
  ```javascript
  const cleanNoteIncludes = {
    owner: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  };
  ```
- **Join Interception & Rewriting**: Updated both `findById` and `paginateNotes` methods. If a client attempts to populate the `owner` relation, the repository intercepts the request and rewrites the query structure to use our select whitelist. This guarantees that user passwords, tokens, or other sensitive metadata columns never escape the database boundary, protecting against high-severity recursive overfetching.

### 3. Key Instructions & Breaking Changes

- **Enforced Security Baseline**: Relational note operations (joins/populates) automatically filter out password hashes at the repository layer. Direct access to raw columns outside this whitelist is completely blocked by default.

---

## Phase 4: Vitest & Testcontainers Rebuild - Isolated PostgreSQL Containerization

### 1. Files Created/Modified

- **`[MODIFY] package.json`**: Uninstalled the legacy `mongodb-memory-server` package and added `testcontainers` to development dependencies.
- **`[MODIFY] tests/utils/setupTestDB.js`**: Rewrote the entire test database setup utility to orchestrate dockerized PostgreSQL instances.

### 2. Code Changes Details

- **Dockerized PostgreSQL Testcontainer**: Integrated `GenericContainer` pulling `postgres:16-alpine`. This spins up a completely isolated, lightweight, actual PostgreSQL instance for integration tests, fully matching the production runtime database instead of relying on legacy NoSQL mock servers.
- **Dynamic Port Mapping**: Configured with dynamic high-availability mapping on port `5432`, preventing concurrent port collision bugs during parallel or sequential file test execution.
- **Schema Autoloading**: Automatically runs `npx prisma migrate deploy` at the setup lifecycle. This guarantees the container's PostgreSQL schema is fully migrated and strictly syncs up to the latest Prisma migrations folder before any integration assertions evaluate.
- **Dynamic Singleton Eviction**: Implemented module-cache eviction on `beforeAll`. By deleting cached `config.js` and `prisma.js` keys from `require.cache`, the singleton is safely re-initialized with the dynamic Testcontainer's connection URL instead of using the local `.env` values.
- **Cascade Relational Truncation**: Constructed a high-performance DB reset in `beforeEach` which scans the `public` schema and performs `TRUNCATE ... CASCADE` on all relational tables, keeping test suites 100% clean and isolated without slow full database reconstruction.

### 3. Key Instructions & Breaking Changes

- **Docker Requirement**: Running integration test suites (`npm run test` or `vitest run tests/integration`) now requires a working Docker Desktop / Docker daemon runtime environment on the host machine.

---

## Phase 4: Vitest & Testcontainers Rebuild - Time-Sorted CUID2 Relational Fixtures

### 1. Files Created/Modified

- **`[NEW] tests/fixtures/note.fixture.js`**: Created the entire mock notes fixture with bulk-write database seed functionality.
- **`[MODIFY] tests/fixtures/user.fixture.js`**: Already contains robust time-sorted CUID2 generation and atomic `prisma.user.createMany` data-seeding structures.
- **`[MODIFY] tests/fixtures/token.fixture.js`**: Already updated to leverage clean CUID2-compliant user identifiers.

### 2. Code Changes Details

- **Mock Note Relational Model**: Modeled the mock note fixtures strictly according to the relational schema, replacing the legacy Mongoose ObjectId properties with time-sorted, collision-safe CUID2 strings inside `noteOne`, `noteTwo`, and `noteThree`.
- **Relational Field Alignment**: Refactored the legacy NoSQL `note.owner` and `token.user` fields to explicitly target the Prisma mapped relational database foreign key fields: `note.ownerId` and `token.userId` pointing to the user CUID2 properties.
- **High-Throughput Prisma Bulk Seeding**: Engineered `insertNotes` utilizing the high-performance atomic write capability:
  ```javascript
  await prisma.note.createMany({
    data: notes.map((note) => ({ ... })),
    skipDuplicates: true,
  });
  ```
  This cleanly decouples test fixture loading from MongoDB-style `save()` bulk operations.

### 3. Key Instructions & Breaking Changes

- **Clean Fixtures Standard**: Do NOT write legacy NoSQL ObjectId models or import `mongoose` inside mock test fixtures. Leverage the `createCuid2()` proxy wrapper to maintain seamless backward compatibility with existing assertions.

---

## Phase 5: Production ETL Cutover - High-Throughput Memory-Safe Streaming ETL

### 1. Files Created/Modified

- **`[NEW] src/scripts/migrateProductionData.js`**: Designed and implemented the complete production streaming ETL cutover orchestrator.

### 2. Code Changes Details

- **Memory-Safe MongoDB Cursor Streaming**: Rather than loading massive MongoDB collections into memory arrays or utilizing Javascript RAM maps which cause Out-of-Memory (OOM) crashes, the script streams documents dynamically in batches of 1,000 using native MongoDB cursor streams (maintaining strict $O(1)$ RAM space complexity).
- **PostgreSQL Temporary Staging Map**: Configured three isolated database-level staging tables: `_MigrationMap`, `_StagingTokens`, and `_StagingNotes`.
- **Database-Level Join Key Remapping**: For each batch of Users, the CUID2 mappings are generated and stored inside `_MigrationMap`. When streaming Tokens and Notes, the records are loaded into the corresponding temporary staging tables. The script then executes a single high-performance raw SQL join query inside PostgreSQL:
  ```sql
  INSERT INTO "notes" (id, title, content, archived, tags, created_at, updated_at, owner_id)
  SELECT n.id, n.title, n.content, n.archived, n.tags, n.created_at, n.updated_at, m.new_cuid
  FROM "_StagingNotes" n
  JOIN "_MigrationMap" m ON m.legacy_mongoid = n.legacy_owner_id
  ON CONFLICT DO NOTHING;
  ```
  This offloads all heavy key remapping logic to the highly optimized PostgreSQL relational join engine, yielding incredible database-level speeds.
- **Teardown & Cleanup**: Drops all temporary staging tables and map tables upon successful cutover, ensuring a completely clean and optimized production target schema.

### 3. Key Instructions & Breaking Changes

- **Executing the Migration**: Set your target database connection credentials inside the environment and run:
  `node src/scripts/migrateProductionData.js`
  This will securely and rapidly migrate all live production users, tokens, and notes from MongoDB to PostgreSQL.

---

## Architectural Refactor: Modular Prisma Schema Directory (`prismaSchemaFolder`)

### 1. Files Created/Modified

- **`[MODIFY] package.json`**: Added custom `"prisma:generate"` script mapping to the consolidated compiler.
- **`[MODIFY] prisma/schema.prisma`**: Refactored to enable `prismaSchemaFolder` and act as the main configuration orchestrator.
- **`[NEW] prisma/generate.js`**: Created a high-performance build script that consolidates model fragments and handles code generation.
- **`[NEW] prisma/models/user.prisma`**: Extracted and modularized the User identity model definition.
- **`[NEW] prisma/models/token.prisma`**: Extracted and modularized the Token security session model definition.
- **`[NEW] prisma/models/note.prisma`**: Extracted and modularized the Note business logic model definition.
- **`[NEW] prisma/enums/role.prisma`**: Extracted and modularized the Role authorization enum.
- **`[NEW] prisma/enums/tokenType.prisma`**: Extracted and modularized the TokenType verification enum.

### 2. Code Changes Details

- **Staff-Level Modular Architecture**: Fully decoupled the monolithic Prisma schema, dividing models into `prisma/models/` and enums into `prisma/enums/`, adhering to native folder-based modularity patterns.
- **Zod Generator Monolith Compiler Workaround**: Because the third-party `zod-prisma-types` library reads raw schema files directly from disk instead of using compiled Prisma DMMFs, it lacks native support for multiple schema files, resulting in compilation failures. We engineered `prisma/generate.js` to dynamically compile model/enum fragments into a temporary monolith, trigger generation, and clean up the temp file cleanly, ensuring flawless Zod and Prisma Client compiling.

### 3. Key Instructions & Breaking Changes

- **Compiling Schema Changes**: When changing database schemas or models, do not run `npx prisma generate` directly. Run the custom compiler script:
  `npm run prisma:generate`
  This compiles all modular folders, generates Zod schemas, and updates your Prisma client cleanly.
