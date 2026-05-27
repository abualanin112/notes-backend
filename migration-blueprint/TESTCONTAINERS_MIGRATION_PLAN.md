# Testcontainers Migration Plan

## 1. Current Architecture

A single global PostgreSQL Testcontainer is spun up via `globalSetup.js`. This is optimal for performance (avoids 10+ seconds of spin-up time per test file).

## 2. Preservation Directive

**DO NOT DECENTRALIZE THE TESTCONTAINER.**
Moving to a modular monolith does not mean we need a separate database container per module. In a Modular Monolith, modules logically share the physical database but enforce boundaries at the code level.

## 3. Refactoring the Setup

- The `globalSetup.js` will remain centralized.
- The `DATABASE_URL` injection via Vitest `provide`/`inject` will remain.
- The only change is ensuring the schema push (`npx prisma db push`) runs against the combined schema, which will remain as a single `schema.prisma` file during the initial Modular Monolith migration.

## 4. Future Proofing (Multi-Schema)

If in the future we utilize Prisma's `multiSchema` feature (e.g., separating IAM tables to an `iam` schema and Notes to a `notes` schema), the Testcontainer startup script must be updated to ensure the PostgreSQL container initializes all necessary logical schemas before pushing the Prisma configuration.
