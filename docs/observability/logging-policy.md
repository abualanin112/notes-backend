# Logging Policy & Safe Payload Guidelines

This document outlines the formal logging discipline required for this repository to ensure operational consistency and strict data privacy.

## 1. Formal Log Level Policy

Consistent log levels are critical for effective alerting and log aggregation. Follow these semantics:

### `TRACE`

- **Use for**: Deep infrastructure diagnostics, ORM (Prisma) internals, low-level lifecycle debugging (e.g., connection pool sizing, cache evictions).
- **Production Status**: Disabled by default.

### `DEBUG`

- **Use for**: Development-only debugging, temporary diagnostics, and non-production troubleshooting.
- **Production Status**: Disabled by default.
- **Example**: `logger.debug({ payloadSize }, 'Validating incoming request constraints');`

### `INFO`

- **Use for**: Business/operational events, request lifecycle milestones, and successful workflows.
- **Rules**: Do NOT overuse `info`. High-volume repetitive tasks should not spam info logs.
- **Example**: `logger.info({ event: 'auth.login.success', targetId: user.id }, 'User logged in successfully');`

### `WARN`

- **Use for**: Recoverable abnormal states, degraded behavior, suspicious activity (e.g., repeated failed logins), and system retries/fallbacks.
- **Rules**: Requires action eventually, but not immediately critical.
- **Example**: `logger.warn({ event: 'auth.login.failed', email }, 'Failed login attempt');`

### `ERROR`

- **Use for**: Failed operations, uncaught exceptions, transaction failures, and infrastructure failures.
- **Rules**: Should trigger immediate paging/alerts. Do NOT use `error` for expected client validation failures (e.g., 400 Bad Request).
- **Example**: `logger.error({ err, event: 'system.startup.failed' }, 'Database connection failed');`

## 2. Safe Logging Guidelines (Payload Rules)

To remain compliant with privacy regulations and avoid leaking sensitive information into observability platforms (which are often accessed by broader engineering teams), the following rules are strictly enforced:

### FORBIDDEN TO LOG

Never log any of the following fields, either directly or nested within objects:

- `req.body` (entire object)
- Raw Database/Domain Entities (e.g., full Prisma returns without DTO mapping)
- Passwords (raw or hashed)
- Refresh Tokens & JWTs
- Cookies
- Authorization headers
- Prisma query params (SQL variables)
- Personal Identifiable Information (PII) beyond `userId`
- Financial payloads

### REDACTION SAFETY

The root Pino logger is configured with `pino-redact` which actively strips `req.headers.authorization`, `cookie`, `password`, `refreshToken`, and `token`. However, **do not rely solely on the redactor**. Always explicitly cherry-pick safe fields before logging.

**Incorrect:**

```javascript
logger.info({ user: userEntity }, 'User updated'); // DANGEROUS: Leaks hashed password and PII
```

**Correct:**

```javascript
logger.info({ event: 'user.updated', targetId: user.id, email: user.email }, 'User updated'); // SAFE
```
