# Module Ownership Matrix

This document defines the strict ownership invariants for the Modular Monolith.

## Matrix

| Concept / Asset         | Owner Module  | Consumers (Readers)       | Mutators (Writers)    |
| ----------------------- | ------------- | ------------------------- | --------------------- |
| **User Entity**         | IAM           | Notes, Audit              | IAM only              |
| **Token Entity**        | IAM           | None                      | IAM only              |
| **RBAC Logic**          | IAM           | All Modules               | IAM only              |
| **Note Entity**         | Notes         | Audit (via Orchestration) | Notes only            |
| **Audit Events**        | Audit         | Admin routes              | All Modules (via API) |
| **Database Connection** | Shared Kernel | All Repositories          | Shared Kernel         |
| **Error Definitions**   | Shared Kernel | All Modules               | Shared Kernel         |
| **Observability (ALS)** | Shared Kernel | All Modules               | Shared Kernel         |

## Ownership Rules

1. **Repository Isolation**: A module is the exclusive owner of its database tables. Only the `IAM` module's repositories may issue Prisma queries against `users`, `roles`, `tokens`.
2. **Business Rules Isolation**: The logic for determining if a Note is valid belongs exclusively to the `Notes` module.
3. **Route Isolation**: The `/v1/notes` route namespace is exclusively owned by the `Notes` module.
