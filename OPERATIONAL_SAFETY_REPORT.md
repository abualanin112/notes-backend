# Operational Safety & Infrastructure Audit Report

## 1. Startup Lifecycle Risks

**Risk Level**: NEEDS HARDENING

- **Missing Dependency Bootstrapping**: `src/index.js` checks PostgreSQL via `prisma.$queryRaw` before opening the HTTP port, which is good. However, it completely ignores Redis initialization. If Redis is unreachable, the system will accept traffic but aggressively timeout or fail over on early requests until the client transitions into a degraded state.

## 2. Graceful Shutdown Risks

**Risk Level**: HIGH RISK

- **Orphaned Worker Crashes**: In `src/index.js`, the `exitHandler` calls `global.tokenCleanupTask.stop()`. However, `node-cron`'s `stop()` only cancels _future_ schedules; it does not await actively executing jobs. The shutdown flow proceeds immediately to `prisma.$disconnect()` and `process.exit(0)`. Any worker currently mid-execution will violently crash due to dropped database connections.
- **Hanging Redis Connections**: The `exitHandler` disconnects the Prisma client but entirely forgets to disconnect the `redisClient`. This can cause connection leaks on the Redis server during rapid horizontal scaling down events.

## 3. Worker & Cron Safety Risks

**Risk Level**: HIGH RISK

- **Cron Overlap & Duplicate Execution**: The `tokenCleanupTask` runs daily at 03:00 AM. In a multi-node deployment, every single replica will fire this job at the exact same millisecond. There is no distributed lock (e.g., Redlock) ensuring singleton execution, leading to DB contention and duplicated effort.
- **Missing Timeout Protection**: The worker lacks an execution wrapper. If the Prisma query hangs due to lock contention, the worker will hang indefinitely without timing out.

## 4. Memory & Resource Risks

**Risk Level**: HIGH RISK

- **Unbounded Memory Leak**: In `src/config/redis.js`, the fallback `memoryCache` is implemented as a simple `Map`. Eviction only occurs lazily when `cacheGet()` encounters an expired key. If a user's permissions are cached but the user never logs in again, that cache entry stays in RAM forever, eventually exhausting container memory.

## 5. Health Check & Observability Gaps

**Risk Level**: NEEDS HARDENING

- **Incomplete Health Validation**: The `/ready` and `/health` endpoints in `src/app.js` only validate PostgreSQL. Redis connectivity is entirely ignored. Orchestrators (like Kubernetes) will view the pod as perfectly healthy even if the cache layer is down, preventing automated recovery.
- **Missing Degraded Semantics**: The system gracefully falls back to memory cache when Redis is down, but this state is not surfaced in `/health`. The `/health` endpoint should explicitly report `database: "UP"` but `cache: "DEGRADED"`.
- **Missing Slow Query Visibility**: Prisma is not configured to emit metrics or logs for queries exceeding specific execution thresholds.

## Categorization Summary

| Category            | Risk Description                                                         | Priority |
| :------------------ | :----------------------------------------------------------------------- | :------- |
| **SAFE**            | Database isolation, TLS termination, CORS strictness                     | N/A      |
| **NEEDS HARDENING** | Redis startup sequencing, Health endpoint semantics                      | Medium   |
| **HIGH RISK**       | Map memory leaks, Graceful shutdown DB crashes, Duplicate cron execution | Critical |
| **DEFERRED**        | Advanced event-loop lag profiling                                        | Low      |
