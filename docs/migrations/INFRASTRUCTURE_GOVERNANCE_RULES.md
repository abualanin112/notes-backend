# Infrastructure Governance Rules

## 1. Lifecycle Semantics

- **Startup Ordering**: Applications MUST enforce hard startup ordering:
  1. Boot Environment/Config
  2. Boot Telemetry/Logger
  3. Boot Primary Database (PostgreSQL) - Required for readiness
  4. Boot Secondary Cache (Redis) - Required for full health, but failures must instantly degrade to memory cache.
  5. Boot HTTP Listener
  6. Boot Background Workers
- **Graceful Shutdown**: The shutdown sequence MUST run in reverse order:
  1. Stop accepting new HTTP requests (`server.close()`).
  2. Halt future Cron scheduling (`task.stop()`).
  3. **AWAIT** completion of any actively running worker operations (maximum 10s timeout).
  4. Disconnect secondary cache (Redis).
  5. Disconnect primary database (Prisma).
  6. Flush log buffers and exit(0).

## 2. Worker & Background Execution

- **Cron Overlap Prevention**: No worker may be scheduled without a distributed lock (e.g., Redlock) or queue mechanism (BullMQ) if the system runs > 1 replica.
- **Worker Timeouts**: Every background job MUST be wrapped in a `Promise.race` execution timeout. A worker exceeding its timeout must be aborted, and the failure must trigger an alert.
- **Worker Telemetry**: Background jobs must explicitly establish their own `asyncLocalStorage` scope with a distinct `jobId` to ensure logs are correlated.

## 3. Caching & Memory Boundaries

- **Memory Cache Eviction**: Any in-memory cache used as a degraded fallback MUST implement active TTL eviction (e.g., `lru-cache` or `node-cache`) to prevent unbounded Map growth.
- **Cache Invalidation Guarantees**: Any operation mutating database state that serves as the source of truth for a cache (e.g., Role/Permission assignments) MUST execute the cache invalidation instruction within the _same logical transaction boundary_ or immediately following successful commit.

## 4. Health & Degradation

- **Readiness Semantics**: The `/ready` endpoint asserts whether the node can handle traffic. It MUST verify PostgreSQL connectivity but MAY ignore Redis if the degradation fallback is functional.
- **Liveness Semantics**: The `/health` endpoint asserts overall node health. It MUST verify both PostgreSQL and Redis. If Redis is down, it must explicitly report a `DEGRADED` status but return `200 OK` (so load balancers don't kill the pod, but orchestrators log the degradation).
- **Circuit Breakers**: External dependencies (Redis) must trip a circuit breaker after $N$ consecutive failures to prevent cascading request timeouts, immediately routing traffic to memory fallbacks.

## 5. Observability & Telemetry

- **ALS Context Isolation Guarantees**: The `asyncLocalStorage` store must strictly isolate request IDs, user IDs, and contextual loggers. No service layer may use `baseLogger` if a contextual logger exists.
- **Slow Query Telemetry**: Queries exceeding 500ms MUST emit a `db.query.slow` telemetry event.
- **Operational Alert Taxonomy**: All logs intended to trigger pagers must follow a strict taxonomy (`event: "system.degradation"`, `event: "db.connection.failed"`).

---

_(Note: As of Phase 7 Architecture Convergence, all above governance rules have been strictly and completely enforced across the entire backend architecture.)_
