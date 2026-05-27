# Modular Monolith Migration Master Plan

## 1. Executive Summary

This document serves as the master blueprint for migrating the existing `notes-backend` monolithic architecture into a strict, production-grade Modular Monolith. The goal is to enforce rigid module boundaries, eliminate shared mutable state, isolate database access, and support future ERP evolution (CRM, Accounting, HR) while maintaining 100% test integrity and RBAC correctness.

## 2. Core Architectural Imperatives

- **Test Integrity**: The migration is a failure if tests become brittle. Integration tests must run against realistic Testcontainers setups without cross-test state leakage.
- **Module Isolation**: Files are grouped by bounded context (e.g., `src/modules/notes`, `src/modules/auth`), not by technical layer.
- **Explicit Interfaces**: Modules communicate exclusively through explicitly exported Service Contracts. Cross-module repository calls are strictly forbidden.
- **Transactional Safety**: Transactions spanning multiple modules must be managed by Orchestrators, using Sagas or well-defined Unit of Work boundaries to prevent deadlocks.
- **Security Invariants**: The RBAC system (`Role`, `Permission`, `UserRole`) must remain the single source of truth for authorization, uniformly asserted at the boundary.

## 3. Migration Roadmap Outline

- **Phase 1: Shared Kernel & Observability Consolidation** (Extracting `config`, `logger`, `als.js`, `metrics.js` into a Core module).
- **Phase 2: Data Access Isolation** (Refactoring Prisma repositories to be strictly scoped to their owning modules, removing direct Prisma exports).
- **Phase 3: Module Extraction** (Iteratively extracting `User`, `Auth`, `Note`, and `Audit` into isolated bounded contexts).
- **Phase 4: Routing & Pipeline Hardening** (Refactoring Express routing to mount modular routers instead of monolithic v1 index).
- **Phase 5: ERP Orchestration Preparation** (Laying the groundwork for complex multi-module workflows and anti-corruption layers).

## 4. Anti-Patterns to Eliminate

- Direct cross-entity Prisma schema queries outside of repositories.
- Leaking DTOs across module boundaries without serializers.
- Global mutable state or implicit assumptions in background workers.
- Nested transactions or "hidden" transaction propagation.
