const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const redisConfig = require('./config/redis');
const { startTokenCleanupJob } = require('./workers/tokenCleanup.worker');
const { monitorEventLoopDelay } = require('perf_hooks');
const { startMetricsFlusher } = require('./config/metrics');

let server;

// Global shutdown flag
global.isShuttingDown = false;

// Track active workers to await them during shutdown
global.activeWorkers = new Set();

/**
 * Bootstrap database connection and start network listener
 */
const bootstrap = async () => {
  try {
    // 0. Initialize Event Loop Telemetry & Metrics
    startMetricsFlusher();
    const eventLoopMonitor = monitorEventLoopDelay({ resolution: 10 });
    eventLoopMonitor.enable();
    setInterval(() => {
      const lagMs = eventLoopMonitor.max / 1e6; // Convert ns to ms
      if (lagMs > config.telemetry.eventLoopLagThresholdMs) {
        logger.warn({ event: 'system.event_loop.lagged', lagMs: Math.round(lagMs) }, 'Event loop lag exceeded threshold');
      }
      eventLoopMonitor.reset();
    }, 5000).unref(); // check every 5s, don't block shutdown

    // 1. Assert PostgreSQL availability at startup before opening HTTP listener
    logger.info('Asserting PostgreSQL database connectivity...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Successfully connected to PostgreSQL');

    // 2. Initialize secondary cache (Redis) before HTTP binding
    logger.info('Asserting Redis cache connectivity...');
    const redisClient = await redisConfig.getClient();
    if (!redisClient) {
      logger.warn({ event: 'cache.redis.degraded' }, 'Redis failed to initialize at startup. Running in DEGRADED memory-cache mode.');
    }

    // 3. Open HTTP Listener
    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
    });

    // 4. Initialize background workers if enabled for this node
    if (config.enableBackgroundWorkers) {
      global.tokenCleanupTask = startTokenCleanupJob();
      logger.info('Background workers enabled on this node.');
    } else {
      logger.info('Background workers disabled on this node.');
    }
  } catch (error) {
    logger.error('Failed to establish database connection during bootstrap:', error);
    process.exit(1);
  }
};

bootstrap();

const performShutdown = async () => {
  global.isShuttingDown = true;
  logger.info('Starting reverse-order graceful shutdown...');

  // 1. Stop HTTP Server
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed cleanly');
        resolve();
      });
    });
  }

  // 2. Stop Cron Scheduling
  if (global.tokenCleanupTask) {
    global.tokenCleanupTask.stop();
    logger.info('Token cleanup cron job stopped');
  }

  // 3. Await Active Workers (max 5 seconds)
  if (global.activeWorkers.size > 0) {
    logger.info(`Waiting for ${global.activeWorkers.size} active workers to complete...`);
    try {
      await Promise.race([
        Promise.all(Array.from(global.activeWorkers)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Worker shutdown timeout')), 5000))
      ]);
      logger.info('All active workers completed safely');
    } catch (err) {
      logger.warn({ err }, 'Not all workers completed cleanly during shutdown');
    }
  }

  // 4. Disconnect Redis
  try {
    if (typeof redisConfig.disconnectClient === 'function') {
      await redisConfig.disconnectClient();
      logger.info('Redis client disconnected');
    }
  } catch (err) {
    logger.error('Failed to disconnect Redis client:', err);
  }

  // 5. Disconnect Prisma
  try {
    // Prisma disconnect itself should have a timeout to prevent hanging
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma disconnect timeout')), 3000))
    ]);
    logger.info('Prisma client disconnected');
  } catch (err) {
    logger.error('Failed to disconnect Prisma client:', err);
  }
};

const exitHandler = () => {
  // Set a fallback force-exit timeout of 10 seconds for unexpected errors
  const forceExitTimeout = setTimeout(() => {
    logger.warn('Unscheduled graceful shutdown timeout exceeded. Force exiting process...');
    process.exit(1);
  }, 10000);

  performShutdown()
    .then(() => {
      clearTimeout(forceExitTimeout);
      process.exit(1);
    })
    .catch((err) => {
      logger.error({ err }, 'Error during emergency shutdown');
      clearTimeout(forceExitTimeout);
      process.exit(1);
    });
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

const handleShutdown = async (signal) => {
  logger.info(`${signal} received.`);

  // Set a fallback force-exit timeout of 10 seconds to prevent hanging indefinitely
  const forceExitTimeout = setTimeout(() => {
    logger.warn('Graceful shutdown timeout exceeded. Force exiting process...');
    process.exit(1);
  }, 10000);

  try {
    await performShutdown();
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
