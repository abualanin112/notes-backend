# PHASE 2.5 COMPLETION REPORT: Observability Hardening Refinements

## Phase Summary

Phase 2.5 applied strict operational discipline to the newly implemented Pino architecture. This hardening phase focused on payload safety, level semantics, module tracking, trace preservation, and context safety. The backend now meets rigorous enterprise observability standards without adding any new heavy infrastructure.

---

## 1. Formal Log Level Policy

### # DETECTED ISSUE

- No strict rules governed the usage of `logger.info()` vs `logger.debug()`, risking spamming the operational stream or losing critical debugging info.

### # CHANGE APPLIED

- Established and documented a formal log level hierarchy (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`) in `docs/observability/logging-policy.md`.

### # ARCHITECTURAL REASONING

- Consistency allows operators and future logging platforms to safely filter streams (e.g., dropping `DEBUG` in production, alerting instantly on `ERROR`).

---

## 2. Child Logger Strategy

### # DETECTED ISSUE

- No standardized way to trace which specific domain module emitted a log without manually passing `module: 'auth'` in every log payload.

### # CHANGE APPLIED

- Enhanced the `logger` Proxy object in `src/config/logger.js` with a custom `child(bindings)` method.
- This custom child proxy resolves the current request's `req.log` from `AsyncLocalStorage` at runtime and automatically binds the module metadata to it.

### # ARCHITECTURAL REASONING

- Developers can now instantiate module-level loggers (e.g., `const authLogger = logger.child({ module: 'auth' })`) that still inherit global `reqId` and `userId` implicitly during HTTP requests.

---

## 3. Error Cause & Stack Trace Preservation

### # DETECTED ISSUE

- When raw Prisma errors were caught and converted into `ApiError` instances by `errorConverter`, the original Prisma error object (and its inner stack/cause) was lost.

### # CHANGE APPLIED

- Refactored `ApiError` to natively support the `{ cause: err }` pattern introduced in Node.js >= 16.
- Updated `errorConverter` (`src/middlewares/error.js`) to pass the raw `err` as the cause to `ApiError`.
- Attached the error directly to `res.err` so `pino-http` intrinsically logs the full nested trace upon request completion.

### # ARCHITECTURAL REASONING

- Deep database causes (e.g., specific constraint violations) are preserved in the serialized JSON log output without leaking them to the HTTP API response.

---

## 4. Strict Payload Logging Rules

### # DETECTED ISSUE

- Logging entities directly (e.g., `logger.info(user)`) implicitly leaks sensitive data (hashed passwords, tokens) into log streams.

### # CHANGE APPLIED

- Established strict **Forbidden Payload** rules documented in `docs/observability/logging-policy.md`.
- Enforced the rule that loggers must explicitly pick safe fields (e.g., `{ targetId: user.id }`) rather than relying purely on serializers.

### # ARCHITECTURAL REASONING

- Defense-in-depth: Even if `pino-redact` fails or is misconfigured, explicitly mapping safe properties prevents PII and credential leaks.

---

## 5. Request Duration Standardization

### # DETECTED ISSUE

- Inconsistent timing nomenclature. `pino-http` natively emits `responseTime`, while Prisma was configured to emit `durationMs`.

### # CHANGE APPLIED

- Injected a global Pino log formatter in `src/config/logger.js` that intercepts all log payloads just before serialization.
- It detects `responseTime` and normalizes it to `durationMs`.

### # ARCHITECTURAL REASONING

- Consistent schema shapes ensure downstream analytics engines (e.g., ELK, Datadog) can reliably aggregate and calculate percentiles on `durationMs` across all events (HTTP and Database).

---

## 6. ALS Safety & Memory Retention Review

### # AUDIT FINDINGS

- The `AsyncLocalStorage` store currently retains `{ reqId, logger, userId }`.
- **Safety**: Because we instantiate the store via `alsMiddleware` perfectly scoped to the Express `req/res` lifecycle, Node.js V8 garbage collection automatically reclaims the store when the request terminates.
- **Risks Checked**: There are no long-lived global arrays or maps holding references to the `store` or `req` objects.

### # DEFERRED OBSERVABILITY DEBT

- **Cron Jobs / Queues**: Background jobs currently lack `reqId` tracking. When queue workers (e.g., BullMQ) are introduced in future ERP phases, a dedicated worker ALS middleware will be required to seed correlation IDs for background tasks.
