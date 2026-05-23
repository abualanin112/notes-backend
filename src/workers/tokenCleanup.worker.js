const cron = require('node-cron');
const { tokenRepository } = require('../repositories');
const logger = require('../config/logger');

const startTokenCleanupJob = () => {
  // Schedule the job to run every day at 03:00 AM UTC
  const task = cron.schedule(
    '0 3 * * *',
    async () => {
      logger.info({ event: 'system.token_cleanup.started' }, 'Starting automated token cleanup job');
      try {
        const result = await tokenRepository.deleteExpiredTokens();

        logger.info(
          { event: 'system.token_cleanup.completed', deletedCount: result.count },
          `Automated token cleanup completed. Deleted ${result.count} expired tokens.`,
        );
      } catch (error) {
        logger.error({ event: 'system.token_cleanup.failed', err: error }, 'Failed to execute token cleanup job');
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
