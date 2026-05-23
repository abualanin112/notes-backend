const cron = require('node-cron');
const { tokenRepository } = require('../repositories');
const logger = require('../config/logger');
const redisConfig = require('../config/redis');
const asyncLocalStorage = require('../config/als');
const crypto = require('crypto');
const { metrics } = require('../config/metrics');

const LOCK_KEY = 'worker:lock:tokenCleanup';
const LOCK_TTL_SECONDS = 300; // 5 minutes max execution time lock
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

const executeWithLock = async (jobId) => {
  const client = await redisConfig.getClient();
  if (client) {
    // Attempt to acquire distributed singleton lock via SETNX
    const acquired = await client.set(LOCK_KEY, jobId, { NX: true, EX: LOCK_TTL_SECONDS });
    if (!acquired) {
      logger.info({ event: 'system.worker.skipped', jobId }, 'Another instance is running this worker job. Skipping.');
      return;
    }
  } else {
    logger.warn({ event: 'cache.redis.degraded', jobId }, 'Redis degraded. Proceeding without lock. Duplicate execution may occur.');
  }

  const start = performance.now();
  metrics.workers.active++;

  try {
    logger.info({ event: 'system.worker.started', jobId }, 'Starting automated token cleanup job');
    
    // Timeout wrapper - does NOT cancel prisma query but prevents worker from hanging indefinitely
    const executionPromise = tokenRepository.deleteExpiredTokens();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Worker timeout exceeded')), TIMEOUT_MS));
    
    const result = await Promise.race([executionPromise, timeoutPromise]);

    metrics.workers.completed++;
    logger.info(
      { event: 'system.worker.completed', jobId, deletedCount: result.count },
      `Automated token cleanup completed. Deleted ${result.count} expired tokens.`,
    );
  } catch (error) {
    metrics.workers.failed++;
    logger.error({ event: 'system.worker.failed', jobId, err: error }, 'Failed to execute token cleanup job');
  } finally {
    metrics.workers.active--;
    metrics.workers.totalDurationMs += performance.now() - start;

    if (client) {
      // Release lock if we hold it
      const lockValue = await client.get(LOCK_KEY);
      if (lockValue === jobId) {
        await client.del(LOCK_KEY);
      }
    }
  }
};

const startTokenCleanupJob = () => {
  const task = cron.schedule(
    '0 3 * * *',
    () => {
      if (global.isShuttingDown) return;

      const jobId = crypto.randomUUID();
      
      // Establish isolated ALS context for worker logs
      const store = {
        reqId: `cron-${jobId}`,
        logger: logger.child({ jobId }),
      };

      const workerPromise = new Promise((resolve) => {
        asyncLocalStorage.run(store, async () => {
          try {
            await executeWithLock(jobId);
          } finally {
            resolve();
          }
        });
      });

      // Track active execution for graceful shutdown
      if (global.activeWorkers) {
        global.activeWorkers.add(workerPromise);
        workerPromise.finally(() => global.activeWorkers.delete(workerPromise));
      }
    },
    {
      timezone: 'UTC',
    },
  );

  logger.info('Token cleanup cron job initialized (runs at 03:00 AM UTC daily)');
  return task;
};

module.exports = {
  startTokenCleanupJob,
};
