# Future Domain Decomposition

## 1. Purpose

This document maps out how the current monolithic codebase will fracture into distinct bounded contexts, preparing for scale.

## 2. The Decomposition Strategy

### Context 1: Identity & Access (IAM)

- **Aggregates**: User, Role, Permission.
- **Responsibility**: Gatekeeping, authentication, privilege escalation prevention, token lifecycle.

### Context 2: Knowledge Management (Notes)

- **Aggregates**: Note, Tags.
- **Responsibility**: Core application logic.

### Context 3: System Observability (Audit)

- **Aggregates**: AuditLog.
- **Responsibility**: Immutable event tracking, compliance reporting.

## 3. Boundary Overlaps to Resolve

- **Auth Middleware**: Currently acts globally. Will be owned by IAM, but exported as a Shared Kernel utility or an injected dependency.
- **Resource Ownership**: Ownership evaluation (e.g., "Can user edit this Note?") must shift from a centralized Authorization Service to a Decentralized Policy Engine residing within the target module (Notes).

## 4. Future Domains

- **Workflow Context**: Will manage state machines for document approvals.
- **Tenant Context**: Will manage Multi-Tenancy (currently Single-Tenant) if the ERP shifts to B2B SaaS, requiring a massive schema partition strategy (Row Level Security vs Schema-per-tenant).
