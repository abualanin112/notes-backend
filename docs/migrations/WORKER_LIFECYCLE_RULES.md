# Background Worker Lifecycle Rules

## 1. Concurrency & Overlap Prevention

- **Singleton Execution**: Every worker MUST acquire a distributed lock via Redis `SETNX` before executing business logic.
- **Fail-Open on Degradation**: If Redis is degraded, the worker should log a warning (`cache.redis.degraded`) and execute anyway, as duplicate execution is preferable to total background job starvation.
- **TTL Enforced**: The Redis lock must have an explicit TTL (`EX: 300`) to prevent stale locks if the worker crashes unexpectedly.

## 2. Timeout Governance

- **Promise.race Timeouts**: Every background task must be wrapped in a `Promise.race` against a strict timeout (e.g., 5 minutes) to prevent infinite hangs if the database connection stalls.
- **Cancellation Limits**: Timeouts _do not_ cancel underlying Prisma queries. They only prevent the worker process from locking the Node.js event loop indefinitely.

## 3. Graceful Shutdown

- **Job Tracking**: Every invoked worker creates a `Promise` that is added to `global.activeWorkers`.
- **Drain on Exit**: The `SIGTERM`/`SIGINT` graceful shutdown sequence MUST `await` `global.activeWorkers` to complete (with a maximum timeout) before severing the database connections.
- **No New Jobs**: During shutdown, `global.isShuttingDown` is set to `true`. Cron triggers checking this flag MUST immediately exit without starting new work.

## 4. Context Isolation

- **AsyncLocalStorage (ALS)**: Every worker must spawn its own `asyncLocalStorage` scope containing a unique `jobId`.
- **Logger Propagation**: The scoped logger `logger.child({ jobId })` must be bound to the ALS store so all downstream service logs are correlated to the worker execution.
