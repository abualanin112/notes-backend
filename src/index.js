const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const { startTokenCleanupJob } = require('./workers/tokenCleanup.worker');

let server;

/**
 * Bootstrap database connection and start network listener
 */
const bootstrap = async () => {
  try {
    // Assert PostgreSQL availability at startup before opening HTTP listener
    logger.info('Asserting PostgreSQL database connectivity...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Successfully connected to PostgreSQL');

    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
    });

    // Initialize background workers if enabled for this node
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

const exitHandler = () => {
  // Set a fallback force-exit timeout of 10 seconds for unexpected errors
  const forceExitTimeout = setTimeout(async () => {
    logger.warn('Unscheduled graceful shutdown timeout exceeded. Force exiting process...');
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error('Failed to disconnect Prisma client during force exit:', err);
    }
    process.exit(1);
  }, 10000);

  if (server) {
    if (global.tokenCleanupTask) {
      global.tokenCleanupTask.stop();
    }
    server.close(async () => {
      logger.info('Server closed cleanly after unexpected error');
      clearTimeout(forceExitTimeout);
      try {
        await prisma.$disconnect();
        logger.info('Prisma Client disconnected');
      } catch (err) {
        logger.error('Failed to disconnect Prisma client:', err);
      }
      process.exit(1);
    });
  } else {
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

const handleShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Set a fallback force-exit timeout of 10 seconds to prevent hanging indefinitely
  const forceExitTimeout = setTimeout(async () => {
    logger.warn('Graceful shutdown timeout exceeded. Force exiting process...');
    try {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected during force exit');
    } catch (err) {
      logger.error('Failed to disconnect Prisma client during force exit:', err);
    }
    process.exit(1);
  }, 10000);

  if (server) {
    if (global.tokenCleanupTask) {
      global.tokenCleanupTask.stop();
      logger.info('Token cleanup cron job stopped');
    }

    server.close(async () => {
      logger.info('HTTP server closed cleanly');
      clearTimeout(forceExitTimeout);
      try {
        await prisma.$disconnect();
        logger.info('Prisma client disconnected');
      } catch (err) {
        logger.error('Failed to disconnect Prisma client:', err);
      }
      process.exit(0);
    });
  } else {
    clearTimeout(forceExitTimeout);
    try {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected');
    } catch (err) {
      logger.error('Failed to disconnect Prisma client:', err);
    }
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
