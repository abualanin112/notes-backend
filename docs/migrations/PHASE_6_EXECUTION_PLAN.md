# Phase 6 Execution Plan — Infrastructure & Operational Safety

This roadmap defines the implementation path for securing the backend platform against runtime failures, degraded dependencies, scaling bottlenecks, and observability gaps.

> [!WARNING]
> This phase modifies core Node.js lifecycle events, background worker execution patterns, and cache eviction logic. Rollback checkpoints must be strictly observed between each sub-phase to ensure stability.

## Phase 6A — Lifecycle Safety

**Goal**: Ensure the application starts predictably and shuts down without causing data corruption or orphaned processes.

1. **Startup Dependency Validation** (Requirement #9)
   - Refactor `src/index.js` to systematically wait for both PostgreSQL _and_ Redis readiness before binding the HTTP server.
   - If Redis is unavailable at boot, instantly flag the system as `DEGRADED` but continue booting, ensuring the memory fallback is actively engaged.
2. **Prisma & Redis Lifecycle Governance** (Requirement #14)
   - Implement `redisClient.disconnect()` in the shutdown flow.
   - Ensure Prisma disconnection is wrapped in a discrete timeout to prevent the shutdown handler itself from hanging.
3. **Graceful Degraded-Mode Semantics** (Requirement #8)
   - Implement robust handling in `redis.js` so that if max retries are exceeded, it cleanly nullifies the reference but allows a periodic heartbeat probe to attempt recovery instead of permanently disabling Redis until a pod restart.

**Validation Checkpoint**: Send `SIGTERM` to the process and verify logs show clean disconnection of both Prisma and Redis with zero orphaned promises.

---

## Phase 6B — Health & Readiness

**Goal**: Provide accurate node states to orchestrators (e.g., Kubernetes, Load Balancers).

1. **Redis Circuit Breaker Strategy** (Requirement #1)
   - Wrap Redis calls in a circuit breaker. If 5 consecutive operations fail, open the circuit and instantly route all calls to the memory cache for 60 seconds before half-opening to test connectivity.
2. **Health/Readiness Decoupling**
   - Update `/ready` to assert PostgreSQL.
   - Update `/health` to assert _both_ PostgreSQL and Redis. If Redis is disconnected, `/health` must report `{ database: 'UP', cache: 'DEGRADED', status: 'DEGRADED' }` but return HTTP 200 to prevent load balancer eviction.

**Validation Checkpoint**: Simulate Redis outage and verify `/ready` remains 200 OK while `/health` transitions to `DEGRADED`.

---

## Phase 6C — Worker Resilience

**Goal**: Make background tasks safe for horizontal scaling.

1. **Worker Overlap Prevention** (Requirement #6)
   - Implement a lightweight distributed lock (via Redis `SETNX`) inside `tokenCleanup.worker.js`. Only the node that acquires the lock executes the cron logic, preventing duplicate execution across replicas.
2. **Background Job Timeout Strategy** (Requirement #11)
   - Wrap the token cleanup execution block in `Promise.race()` with a strict 5-minute timeout to prevent indefinite hangs if the DB connection stalls.
3. **Graceful Worker Shutdown**
   - Refactor `tokenCleanupTask.stop()` to track active execution state. The shutdown handler must `await` currently running jobs before severing DB connections.

**Validation Checkpoint**: Run two app instances concurrently and verify the cron job only executes on one instance.

---

## Phase 6D — Resource Protection

**Goal**: Prevent unbounded memory growth and state inconsistencies.

1. **Memory Fallback Cache TTL/Eviction** (Requirement #3)
   - Replace the unbounded `Map` in `src/config/redis.js` with `lru-cache` or `node-cache` to enforce hard memory limits and automatic TTL eviction, preventing OOM crashes during extended Redis outages.
2. **Permission Cache Versioning** (Requirement #2)
   - Attach a global `cache_version` key in Redis. If the RBAC schema changes (e.g., new permissions added globally), bumping the version instantly busts all localized user caches.
3. **Cache Invalidation Guarantees** (Requirement #13)
   - Standardize a pattern where cache invalidation is explicitly scheduled in a post-commit Prisma middleware or hook.

**Validation Checkpoint**: Simulate 10,000 unique `cacheSet` operations to the memory fallback and verify heap memory stabilizes via LRU eviction.

---

## Phase 6E — Operational Observability

**Goal**: Ensure telemetry provides enough context to resolve production incidents rapidly.

1. **ALS Context Isolation Guarantees** (Requirement #15)
   - Ensure background workers establish their own `asyncLocalStorage` context with a generated `jobId` so their logs are fully correlated.
2. **Structured Infrastructure Telemetry Taxonomy** (Requirement #12 & #10)
   - Define canonical `event` labels for infrastructure: `system.boot`, `system.shutdown`, `system.worker.started`, `cache.redis.degraded`, `db.prisma.disconnected`.
3. **Slow Query Telemetry** (Requirement #5)
   - Implement a Prisma extension to log `db.query.slow` if execution exceeds 500ms.
4. **Authorization Metrics** (Requirement #4)
   - Emit telemetry metrics summarizing access granted vs. denied per role for audit tracking.
5. **Event Loop Lag Visibility** (Requirement #7)
   - Hook into Node's `perf_hooks` to monitor event loop lag. Emit a `system.event_loop.lagged` alert if the lag exceeds 100ms.

**Validation Checkpoint**: Execute heavy load and verify slow query logs and event loop warnings appear in stdout.

## Open Questions for Review

- Should the Redis distributed lock for workers fail-open or fail-closed if Redis is degraded? (Fail-open risks duplicate cron runs; fail-closed halts cron runs entirely until Redis recovers).
- Should slow query thresholds be configurable via `.env` or hardcoded?
