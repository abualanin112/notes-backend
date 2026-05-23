const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const logger = require('./logger');
const { metrics } = require('./metrics');

// ──────────────────────────────────────────────────────────────
// Prisma Client Dynamic Singleton Wrapper
// ──────────────────────────────────────────────────────────────

const omitConfig = {
  user: {
    password: true, // Natively exclude password globally for all queries
  },
};

/**
 * Factory function to instantiate the Prisma Client dynamically.
 * This evaluates the database connection URL in real-time, allowing
 * Testcontainers to inject a dynamic port during integration tests.
 */
const createClientInstance = () => {
  // If Testcontainers injected a dynamic URL in process.env, use it; otherwise fall back to config
  const activeDatabaseUrl = process.env.DATABASE_URL || config.prisma.url;

  const baseClient = new PrismaClient({
    datasources: {
      db: {
        url: activeDatabaseUrl,
      },
    },
    omit: omitConfig,
    log:
      config.env === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

  // In development, bind query logging to our pino logger
  if (config.env === 'development') {
    baseClient.$on('query', (e) => {
      // SECURITY WARNING: Never log e.params as it will leak passwords and PII
      logger.debug(
        {
          event: 'database.query',
          query: e.query,
          durationMs: e.duration,
        },
        'Prisma Query Executed',
      );
    });
  }

  // Apply extension for Slow Query Telemetry
  const client = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const duration = performance.now() - start;

          if (duration >= config.prisma.slowQueryThresholdMs) {
            metrics.db.slowQueries += 1;
            logger.warn(
              {
                event: 'db.query.slow',
                model,
                operation,
                durationMs: Math.round(duration),
              },
              'Slow database query detected',
            );
          }

          return result;
        },
      },
    },
  });

  return client;
};

// Internal actual client holder
let prismaClient = createClientInstance();

/**
 * High-Availability Proxy Object:
 * Intercepts all database calls and routes them to the active client instance.
 * Exposes a custom hidden method `$reconnect()` to wipe out old cache and sync with test runtimes.
 */
const prisma = new Proxy(
  {},
  {
    get(target, prop) {
      // Hidden lifecycle hook called inside setupTestDB.js to break module caching
      if (prop === '$reconnect') {
        return () => {
          logger.info('[Prisma Proxy] Evicting connection cache. Re-instantiating client for Testcontainers...');
          prismaClient = createClientInstance();
        };
      }

      // Safely forward standard parameters and bind repository queries
      const value = prismaClient[prop];
      if (typeof value === 'function') {
        return value.bind(prismaClient);
      }
      return value;
    },
  },
);

module.exports = prisma;
