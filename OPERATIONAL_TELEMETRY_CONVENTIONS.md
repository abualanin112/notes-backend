# Operational Telemetry & Metrics Conventions

## 1. Canonical Event Taxonomy

All logs intended for indexing and alerting MUST use a canonical `event` label:

### Infrastructure

- `system.boot`: Emitted when the server attempts to start.
- `system.shutdown`: Emitted during graceful shutdown.
- `system.event_loop.lagged`: Emitted when event loop lag exceeds 100ms.

### Cache & Dependencies

- `cache.redis.degraded`: Emitted when Redis is unreachable.
- `redis.circuit_breaker.open`: Emitted when failure threshold is breached.
- `redis.circuit_breaker.half_open`: Emitted during recovery probing.
- `redis.reconnect.exhausted`: Emitted when max retries hit.

### Database

- `db.query.slow`: Emitted when a Prisma query exceeds 500ms.
- `database.query`: (Debug only) Logs standard query execution times.

### Workers

- `system.worker.started`: Emitted when a worker acquires a lock.
- `system.worker.completed`: Emitted on successful execution.
- `system.worker.failed`: Emitted on failure.
- `system.worker.skipped`: Emitted when lock cannot be acquired.

## 2. In-Memory Metrics

A lightweight metrics aggregator (`src/config/metrics.js`) tracks operational health counters and logs them every 60 seconds:

- `redisReconnects`: Count of `redisClient` reconnect attempts.
- `degradedCount`: Number of times the cache transitioned to degraded memory mode.
- `cacheHitRatio`: LRU cache hit/miss ratio to gauge fallback effectiveness.
- `activeWorkers`: Currently executing singleton background jobs.
- `avgWorkerDurationMs`: Average time taken by background tasks.
- `slowQueries`: Count of Prisma operations exceeding threshold.
- `authorizationDenied`: Count of 403 Forbidden RBAC blocks.

## 3. ALS Context Isolation

- All HTTP requests instantiate a scoped `asyncLocalStorage` containing `reqId` and `logger`.
- Background workers instantiate their own `asyncLocalStorage` scope with a generated `jobId`.
- This ensures that downstream telemetry from repositories and services correctly correlate to the triggering context without cross-contamination.
