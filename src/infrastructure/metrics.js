import { logger } from './logger.js';

export const metrics = {
  redis: {
    reconnects: 0,
    degradedModeTransitions: 0,
  },
  cache: {
    hits: 0,
    misses: 0,
  },
  workers: {
    active: 0,
    completed: 0,
    failed: 0,
    totalDurationMs: 0,
  },
  db: {
    slowQueries: 0,
  },
  auth: {
    authorizationDenied: 0,
  },
};

const getCacheHitRatio = () => {
  const total = metrics.cache.hits + metrics.cache.misses;
  if (total === 0) return 0;
  return (metrics.cache.hits / total).toFixed(2);
};

const getAverageWorkerDurationMs = () => {
  if (metrics.workers.completed === 0) return 0;
  return Math.round(metrics.workers.totalDurationMs / metrics.workers.completed);
};

let flushInterval;

export const startMetricsFlusher = (intervalMs = 60000) => {
  if (flushInterval) clearInterval(flushInterval);
  flushInterval = setInterval(() => {
    logger.info(
      {
        event: 'system.metrics',
        redisReconnects: metrics.redis.reconnects,
        degradedCount: metrics.redis.degradedModeTransitions,
        cacheHitRatio: parseFloat(getCacheHitRatio()),
        activeWorkers: metrics.workers.active,
        avgWorkerDurationMs: getAverageWorkerDurationMs(),
        slowQueries: metrics.db.slowQueries,
        authorizationDenied: metrics.auth.authorizationDenied,
      },
      'Operational Metrics Summary',
    );
  }, intervalMs).unref();
};
