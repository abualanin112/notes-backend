# PHASE 7 COMPLETION: API Architecture & Authorization Hardening

## Overview

Phase 7 introduces a strict, production-grade authorization foundation. We have decoupled authorization from transport middleware, explicitized response boundaries, and introduced centralized "Deny by Default" authorization helpers.

## 1. "Deny by Default" Architecture

Authorization logic must **fail closed**.

- **No Implicit Assumptions:** The previous generic `auth` middleware had an implicit `req.params.userId !== user.id` bypass that allowed privilege escalation if route parameters were improperly named. This has been removed.
- **Centralized Helpers:** We introduced `authorization.service.js` with explicit helpers (e.g. `assertCanManageNote`). Controllers explicitly invoke these helpers before executing any mutations.
- **Service Agnosticism:** Services are now fully decoupled from Express HTTP `req` objects and authorization semantics. Services exist strictly to execute validated business domain logic.

## 2. "Repositories Never Authorize" Principle

**Repositories are persistence-only abstractions.**

- They must NEVER enforce ownership, RBAC, or business permissions.
- They must NEVER perform query filtering under the guise of authorization.
- Authorization decisions must remain centralized and observable _above_ the persistence layer.

## 3. Response Boundary Hardening (Serializers)

Prisma models are **no longer raw-dumped** into API responses.

- Relying exclusively on Prisma `omit` or generic `exclude()` functions is fragile.
- We introduced explicit serializers (`user.serializer.js`, `note.serializer.js`).
- All controllers now explicitly wrap entities in `serializeUser` or `serializeNote` before returning data to the frontend, guaranteeing passwords, internal relations, and security-sensitive fields never leak.

## 4. Permission Namespace Strategy (Future-Proofing)

To prevent naming chaos as the ERP evolves, future RBAC expansion will utilize dot-notation permission namespaces:

- `users.manage`, `users.read`
- `notes.update`, `notes.delete`
- `audit.read`
- `auth.sessions.revoke`

_Note: Enterprise RBAC systems (like Keycloak/Auth0) are intentionally deferred. The current foundation relies on a scalable monolithic design._

## 5. Authorization Error Semantics & Observability

API error responses are strictly normalized:

- **401 Unauthorized:** Unauthenticated.
- **403 Forbidden:** Authenticated but insufficient permission.
- **404 Not Found:** Resource missing (or intentionally hidden to prevent enumeration).

### Severity Rules

Authorization failures emit structured telemetry:

- **WARN:** Normal 403 denied access (e.g. `authz.access.denied`).
- **ERROR:** Suspicious privilege escalation attempts or permission probing (e.g. `authz.escalation.attempted`), triggering explicit Audit Log entries for forensic review.

## Future ERP Authorization Extensibility

The architecture now seamlessly supports future migration to:

- Organization or Tenant isolation
- Department-level branch isolation
- Delegated administration
- Advanced Attribute-Based Access Control (ABAC)
