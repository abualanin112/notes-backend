# Enterprise Security Standards & Taxonomy

This document outlines the formal security mechanisms, operational taxonomy, and anti-patterns strictly enforced within the repository.

---

## 1. Authentication & Session Security

### Automated Refresh Token Rotation

We implement absolute session security via **Refresh Token Rotation**.

- Every time a refresh token is used, it is **blacklisted**, not deleted.
- If a client attempts to use a blacklisted refresh token, the backend triggers a **High-Severity Threat Protocol**. The entire token family (all active sessions for that user) is instantly destroyed to neutralize the potential credential theft.
- **Race Condition Protection**: Token rotation occurs within strict Prisma serializable transaction boundaries. A tiny 2-second grace period exists solely to accommodate immediate network race conditions, but frontend clients **MUST** implement concurrent request deduplication to ensure stability.

### Frontend Concurrent Refresh Responsibility

The 2-second backend grace window is a fail-safe, not an architectural crutch. Frontend applications consuming this API MUST serialize refresh token requests to prevent unnecessary token revocation and race conditions. Acceptable strategies include:

- Shared refresh promises (returning the ongoing refresh promise to any subsequent request)
- Mutexes or RTK Query mutex handling
- Axios interceptor refresh queues

If a frontend broadcasts multiple concurrent refresh requests without deduplication, it risks exceeding the strict grace window and triggering a high-severity session revocation.

### Hashed Token Storage

Refresh tokens are high-value credentials. They are treated equivalently to passwords.

- All refresh tokens are hashed (SHA-256) _before_ being persisted in PostgreSQL.
- Database compromises will not expose active session tokens.

### Session Metadata Tracking

To support future security audits and per-device session management, tokens now track:

- `ip`: The originating IP address of the login.
- `userAgent`: The client device string.
- `lastUsedAt`: To detect dormant but active tokens.
- `familyId`: The grouping identifier that links a rotating chain of tokens to a specific physical device session.

### Explicit Token Retention Policy

Tokens are ephemeral and have strict retention policies to balance database scalability with forensic visibility:

- **Expired Normal Tokens**: Cryptographically expired tokens are continuously purged via a daily background worker. They are not retained.
- **Compromised Token Families**: When a family is revoked due to detected reuse, the tokens are immediately deleted from active storage. The corresponding `auth.refresh.reuse_detected` audit log securely retains the `familyId` and metadata for forensic review indefinitely.

---

## 2. Telemetry & Security Taxonomy

Authentication activity is a cornerstone of platform accountability and is integrated directly with the Audit Infrastructure. We use a strict event taxonomy for observability.

### Standardized Event Taxonomy

- `auth.login.success`: Emitted on successful authentication.
- `auth.login.failed`: Emitted on incorrect credentials.
- `auth.refresh.rotated`: Emitted when a session successfully cycles to a new token.
- `auth.refresh.reuse_detected`: Emitted when an attacker (or corrupted client state) attempts to reuse a revoked token. (Escalated as a high-severity `logger.error` + `AuditLog`).
- `auth.logout`: Emitted when a session terminates gracefully.

### Explicit Log Redaction

The Pino logger is rigidly configured via a custom HTTP serializer (`src/config/pinoHttp.js`) to actively strip `Authorization` and `cookie` headers _before_ they are serialized by Express, ensuring absolute PII safety in operational log sinks.

---

## 3. Rate Limiting & Traffic Control

Layered rate-limiting is implemented to protect high-value targets while ensuring system usability.

- **Auth Limiter**: Strict (10 reqs / 15m). Targets `/register` and `/login` to thwart credential stuffing.
- **Refresh Limiter**: Moderate-Strict (20 reqs / 15m). Targets `/refresh-tokens` to protect the rotation endpoints.
- **API Limiter**: Moderate (300 reqs / 15m). Applies globally to `/v1/*` to mitigate data scraping and general DDoS.
- **Health Probes**: Unrestricted, enabling load-balancers to accurately gauge uptime.

### Trust Proxy Configurations

The backend natively understands execution behind Reverse Proxies (e.g. Nginx, Cloudflare, Render). `app.set('trust proxy', 1)` is enabled to ensure rate-limiters throttle the _true_ client IP rather than the load balancer.

---

## 4. Secure Cookie Strategy (Future Migration Path)

While the API currently issues raw JSON tokens (for SPA consumption via `localStorage`/memory), the preferred production standard for ERP environments is HTTP-only cookies. When the architecture shifts to a first-party frontend, implement the following:

- `httpOnly: true` (prevents XSS theft).
- `secure: true` (requires HTTPS).
- `sameSite: 'strict'` (mitigates CSRF).

---

## 5. Brute-Force Strategy & Anti-Abuse (Future Migration Path)

Currently, system abuse is constrained by standard Rate Limiters. To preserve future extensibility without premature complexity, future SIEM upgrades should introduce:

- IP throttling / temporary IP lockouts.
- Progressive Account lockouts (e.g. 5 failed attempts = 15m lock).
- Integration of a Redis-backed Distributed Rate Limiter for horizontally scaled pods.

---

## 6. Anti-Pattern: No Fingerprint-Based Security

**We explicitly reject invasive browser fingerprinting.**
Session security is entirely dependent on cryptographic rotation, transaction-safe revocation, explicit expiration, and auditable event tracking.
We will **never** rely on Canvas fingerprinting, User-Agent entropy tracking, or third-party behavioral tracking to assert session validity. These methods are privacy-hostile, operationally fragile, and strictly banned from the enterprise architecture.
