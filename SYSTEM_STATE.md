# System State

*This document will track the official architecture, canonical flows, active systems, and current source-of-truth implementations.*

## Canonical Architecture
- Node.js/Express REST API
- PostgreSQL via Prisma ORM
- Single-Tenant Database-Driven RBAC (`permissions` and `user_roles`)
- Pino structured logging & Audit Logs
- Vitest + Testcontainers integration testing

*(Detailed state mapping to be populated during Phase 0 & Phase 1)*
