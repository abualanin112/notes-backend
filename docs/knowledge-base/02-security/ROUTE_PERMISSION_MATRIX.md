# Route Permission Matrix

**Phase:** 4 — Session 4b  
**Scope:** HTTP Routes to RBAC Permission and ABAC Service Assertion mappings, Serializers, Validators, and Audit Logs correlation.  
**Prerequisites:** [`02-security/AUTH_SYSTEM.md`](AUTH_SYSTEM.md) (Authentication), [`02-security/RBAC_SYSTEM.md`](RBAC_SYSTEM.md) (Gate Layers).

This document serves as the absolute dynamic contract for all mounted REST endpoints under the `/v1` namespace.

---

## 1. Auth Routes (`/v1/auth/*`)

Auth routes govern session creation, destruction, token refresh, and basic identity proof mutations. They do not enforce RBAC route guards because they represent anonymous onboarding points.

| Method   | Endpoint                   | Authn Required      | Required Permission | Scope Behavior | Service Assertions | Audit Logs Emitted                                                                                   | Serializer Used                        | Validation Schema               | Risk Classification                       |
| -------- | -------------------------- | ------------------- | ------------------- | -------------- | ------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------- | ----------------------------------------- |
| **POST** | `/register`                | Public (None)       | None                | N/A            | None               | `users.created` (inside `userService.createUser`)                                                    | `serializeUser` (inline in controller) | `authValidation.register`       | **Medium** (Public register endpoint)     |
| **POST** | `/login`                   | Public (None)       | None                | N/A            | None               | `auth.login` (inside `authService.loginUserWithEmailAndPassword`)                                    | `serializeUser` (inline in controller) | `authValidation.login`          | **High** (Credential entry boundary)      |
| **POST** | `/logout`                  | Public (None)       | None                | N/A            | None               | `auth.logout` (inside `authService.logout`)                                                          | None (Returns 204 No Content)          | `authValidation.logout`         | **Low** (Session deletion)                |
| **POST** | `/refresh-tokens`          | Public (None)       | None                | N/A            | None               | `auth.refresh.rotated` (on rotation success) or `auth.refresh.reuse_detected` (on compromise replay) | None (Returns token object payload)    | `authValidation.refreshTokens`  | **High** (Session continuity renewal)     |
| **POST** | `/forgot-password`         | Public (None)       | None                | N/A            | None               | None                                                                                                 | None (Returns 204 No Content)          | `authValidation.forgotPassword` | **Medium** (Email enumeration vector)     |
| **POST** | `/reset-password`          | Public (None)       | None                | N/A            | None               | `auth.password_reset` (inside service transaction)                                                   | None (Returns 204 No Content)          | `authValidation.resetPassword`  | **High** (Credential modification)        |
| **POST** | `/send-verification-email` | Authenticated (JWT) | None                | N/A            | None               | None                                                                                                 | None (Returns 204 No Content)          | None                            | **Low** (Auxiliary flow triggering)       |
| **POST** | `/verify-email`            | Public (None)       | None                | N/A            | None               | `auth.email_verified` (inside service transaction)                                                   | None (Returns 204 No Content)          | `authValidation.verifyEmail`    | **Medium** (Identity verification update) |

---

## 2. User Routes (`/v1/users/*`)

User routes manage profiles, administrative operations, and user records. They execute the full **Two-Gate Authorization Architecture** (Gate 1 in Express `auth()` middleware, Gate 2 in active service-level assertions).

| Method     | Endpoint   | Authn Required      | Required Permission | Scope Behavior             | Service Assertions                                               | Audit Logs Emitted                                                                                 | Serializer Used                   | Validation Schema           | Risk Classification                          |
| ---------- | ---------- | ------------------- | ------------------- | -------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------- | -------------------------------------------- |
| **POST**   | `/`        | Authenticated (JWT) | `create:users:any`  | `:any` (Admin only)        | None                                                             | `users.created` (inside `userService.createUser`)                                                  | `serializeUser` (via interceptor) | `userValidation.createUser` | **High** (Administrative user creation)      |
| **GET**    | `/`        | Authenticated (JWT) | `read:users:any`    | `:any` (Admin only)        | None                                                             | None                                                                                               | `serializeUser` (via interceptor) | `userValidation.getUsers`   | **Medium** (Directory scan access)           |
| **GET**    | `/:userId` | Authenticated (JWT) | `read:users:own`    | `:own` / `:any` (subsumed) | `assertCanReadUser` (Throws 403 on mismatch if lacking `:any`)   | `authz.escalation.attempted` (if escalation blocked)                                               | `serializeUser` (via interceptor) | `userValidation.getUser`    | **Medium** (Sensitive profile access)        |
| **PATCH**  | `/:userId` | Authenticated (JWT) | `update:users:own`  | `:own` / `:any` (subsumed) | `assertCanManageUser` (Throws 403 on mismatch if lacking `:any`) | `authz.escalation.attempted` (if escalation blocked)                                               | `serializeUser` (via interceptor) | `userValidation.updateUser` | **High** (Profile data modification)         |
| **DELETE** | `/:userId` | Authenticated (JWT) | `delete:users:own`  | `:own` / `:any` (subsumed) | `assertCanManageUser` (Throws 403 on mismatch if lacking `:any`) | `authz.escalation.attempted` (if escalation blocked), `users.deleted` (inside service transaction) | None (Returns 204 No Content)     | `userValidation.deleteUser` | **High** (Destructive administrative change) |

---

## 3. Note Routes (`/v1/notes/*`)

Note routes manage aggregate user items. They are gated with route-level guards but execute hardcoded owner comparisons inside the controller, representing a security architectural drift (Drift ID D01).

| Method     | Endpoint   | Authn Required      | Required Permission | Scope Behavior | Service Assertions                                                                                                                                       | Audit Logs Emitted                                | Serializer Used                   | Validation Schema           | Risk Classification              |
| ---------- | ---------- | ------------------- | ------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------- | --------------------------- | -------------------------------- |
| **POST**   | `/`        | Authenticated (JWT) | `create:notes:own`  | `:own` only    | None (Owner ID injected from `req.user.id` in controller)                                                                                                | `notes.created` (inside service transaction)      | `serializeNote` (via interceptor) | `noteValidation.createNote` | **Medium** (Record creation)     |
| **GET**    | `/`        | Authenticated (JWT) | `read:notes:own`    | `:own` only    | None (Implicitly scoped by injecting `req.user.id` into query filters)                                                                                   | None                                              | `serializeNote` (via interceptor) | `noteValidation.getNotes`   | **Medium** (Collection scan)     |
| **GET**    | `/:noteId` | Authenticated (JWT) | `read:notes:own`    | `:own` only    | None (**Drift D01:** Hardcoded controller comparison `note.ownerId !== req.user.id` throws 404 to block access; bypasses `authorizationService`)         | None                                              | `serializeNote` (via interceptor) | `noteValidation.getNote`    | **Medium** (Single record fetch) |
| **PATCH**  | `/:noteId` | Authenticated (JWT) | `update:notes:own`  | `:own` only    | None (**Drift D01:** Hardcoded controller comparison `existingNote.ownerId !== req.user.id` throws 404 to block access; bypasses `authorizationService`) | None                                              | `serializeNote` (via interceptor) | `noteValidation.updateNote` | **Medium** (Record update)       |
| **DELETE** | `/:noteId` | Authenticated (JWT) | `delete:notes:own`  | `:own` only    | None (**Drift D01:** Hardcoded controller comparison `existingNote.ownerId !== req.user.id` throws 404 to block access; bypasses `authorizationService`) | None (Audit logged at service as `notes.deleted`) | None (Returns 204 No Content)     | `noteValidation.deleteNote` | **Medium** (Destructive change)  |

---

## 4. Admin / Security-Sensitive Backlog Routes (Unmounted HTTP)

These mappings represent backchannel capabilities implemented at the service tier (`authorization.service.js`) and validated with Zod (`validations/role.validation.js`), but **not currently exposed to the HTTP router**. They present high critical privilege escalation vectors that must be strictly audited upon future integration.

| Method     | Proposed Endpoint                  | Authn Required      | Required Permission | Scope Behavior      | Service Assertions                                                                         | Audit Logs Emitted                                                                          | Proposed Serializer | Validation Schema           | Risk Classification                               |
| ---------- | ---------------------------------- | ------------------- | ------------------- | ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------- | --------------------------- | ------------------------------------------------- |
| **POST**   | `/v1/roles/assign/:userId`         | Authenticated (JWT) | `assign:roles:any`  | `:any` (Admin only) | `assertCanAssignRole` (Throws 403 if target role's `level` exceeds actor's max role level) | `authz.role.assigned` (on success) or `authz.escalation.attempted` (on hierarchy violation) | `serializeUserRole` | `roleValidation.assignRole` | **High Critical** (Vertical privilege escalation) |
| **DELETE** | `/v1/roles/assign/:userId/:roleId` | Authenticated (JWT) | `assign:roles:any`  | `:any` (Admin only) | `assertCanAssignRole` (Proposed check to prevent removing roles of superior level)         | `authz.role.removed` (on success)                                                           | None                | `roleValidation.removeRole` | **High Critical** (Privilege removal vector)      |
| **POST**   | `/v1/roles`                        | Authenticated (JWT) | `create:roles:any`  | `:any` (Admin only) | Proposed level hierarchy check to prevent creating roles exceeding author's level          | `authz.role.created`                                                                        | `serializeRole`     | `roleValidation.createRole` | **High** (Dynamic role injection)                 |
| **PATCH**  | `/v1/roles/:roleId`                | Authenticated (JWT) | `update:roles:any`  | `:any` (Admin only) | Proposed assertion preventing altering a role to have a higher hierarchy level             | `authz.role.updated`                                                                        | `serializeRole`     | `roleValidation.updateRole` | **High** (Role modification)                      |
| **DELETE** | `/v1/roles/:roleId`                | Authenticated (JWT) | `delete:roles:any`  | `:any` (Admin only) | Prevent deleting protected system roles (`isSystem: true`)                                 | `authz.role.deleted`                                                                        | None                | `roleValidation.deleteRole` | **High** (Destructive metadata deletion)          |

---

## 5. Development Routes

These endpoints bypass standard telemetry and JWT authentication, mounted only during development modes.

| Method  | Endpoint   | Authn Required         | Required Permission | Scope Behavior | Service Assertions | Audit Logs Emitted | Serializer Used          | Validation Schema | Risk Classification                             |
| ------- | ---------- | ---------------------- | ------------------- | -------------- | ------------------ | ------------------ | ------------------------ | ----------------- | ----------------------------------------------- |
| **GET** | `/v1/docs` | Public (Dev Mode Only) | None                | N/A            | None               | None               | None (Swagger UI Assets) | None              | **Low** (Information disclosure in development) |
