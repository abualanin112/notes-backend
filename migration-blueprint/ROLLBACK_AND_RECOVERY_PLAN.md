# Rollback and Recovery Plan

## 1. The Atomic Migration Principle

The migration will be executed via Git branches representing Bounded Context extraction phases (e.g., `feature/extract-audit-module`).
Because we are NOT changing the database schema (`schema.prisma`), code-level rollbacks are entirely safe and non-destructive.

## 2. Rollback Triggers

A rollback of a phase MUST occur if:

- Integration tests fail and cannot be trivially fixed without bypassing security or domain rules.
- Test execution time increases by >20% (indicating poor connection pooling or nested container spinning).
- Unhandled transaction deadlocks occur in the CI pipeline.

## 3. Database Schema Rollback

Since the Modular Monolith refactor does not alter the underlying PostgreSQL schema immediately, no complex data migration rollbacks are required.
_Note_: If future phases split tables into separate databases, a separate data-replication fallback plan will be required. For now, the database remains a monolithic data store logically partitioned by code.

## 4. Emergency Patching during Migration

If a critical production bug emerges in the monolithic `master` branch while the migration branch is mid-flight:

1. Fix the bug in `master`.
2. Rebase the migration branch onto `master`.
3. Resolve structural conflicts by applying the bugfix to the new modular file locations.
