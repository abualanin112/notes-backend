# Redis Circuit Breaker & Fallback Rules

## 1. Overview

The caching layer incorporates a **Lightweight Circuit Breaker** and a local **LRU In-Memory Fallback** to protect the primary PostgreSQL database and the application runtime from cascading failures when Redis is degraded or unreachable.

## 2. Circuit Breaker Mechanics

- **Failure Threshold**: 5 consecutive errors (`maxFailures: 5`).
- **Cooldown Window**: 60 seconds (`cooldownMs: 60000`).
- **State Transitions**:
  - `CLOSED`: Normal operation.
  - `OPEN`: Failures exceed threshold. All cache operations route instantly to the local LRU memory cache.
  - `HALF-OPEN`: After the 60s cooldown, exactly _one_ operation is permitted to attempt reaching Redis. If it succeeds, the breaker resets to `CLOSED`. If it fails, the breaker returns to `OPEN` for another 60s.

## 3. Graceful Degradation Semantics

- **Health Probes**: When the circuit is OPEN, the `/health` endpoint MUST return HTTP 200 (to prevent Kubernetes from killing the pod) but report the cache status explicitly as `DEGRADED`.
- **Memory Limits**: The fallback cache uses `lru-cache` with a hard limit of 1000 items and a 5-minute TTL to prevent unbounded memory growth (`OOM`) during prolonged Redis outages.
- **Dual-Write Safety**: All cache invalidation requests (`cacheDel`) immediately purge the key from the local memory cache, even if Redis is up, to prevent race conditions during state transitions.

## 4. Telemetry Events

- `redis.circuit_breaker.open`: Breaker trips.
- `redis.circuit_breaker.half_open`: Cooldown expired, attempting recovery.
- `redis.ready`: Breaker successfully reset.
- `cache.redis.degraded`: Redis unavailable at startup.
