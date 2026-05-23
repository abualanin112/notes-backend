# Authorization Flow

*This document defines the ONE canonical authorization flow to ensure consistent enforcement.*

## Flow Definition
1. **Request Reception**: Express receives the request.
2. **Authentication (Passport JWT)**: `auth.js` middleware validates the JWT and attaches `req.user`.
3. **Permission Gate (Middleware)**:
   - `auth.js` fetches `action:resource:scope` permissions from `permission.service.js` (cached in Redis).
   - Wildcard (`*:*:*`) returns true immediately.
   - Exact string matches or `:any` scope matches return true.
4. **Ownership Gate (Service/Controller)**:
   - If the request requires an `:own` scope, the service layer queries the DB for the entity.
   - `authorization.service.js` compares the entity's `ownerId` against `req.user.id`.

*(To be verified and strictly enforced during Phase 1)*
