const { createClient } = require('redis');
const config = require('./config');
const logger = require('./logger');

// ──────────────────────────────────────────────────────────────
// Redis Client Singleton with In-Memory Fallback
// ──────────────────────────────────────────────────────────────

/** @type {import('redis').RedisClientType | null} */
let redisClient = null;

/** @type {boolean} */
let isReady = false;

/**
 * In-memory cache used as a transparent fallback when Redis is
 * unavailable or unconfigured. Entries are stored with an explicit
 * expiry timestamp to prevent unbounded memory growth.
 * @type {Map<string, { value: unknown, expiresAt: number }>}
 */
const memoryCache = new Map();

/**
 * Lazily initialize and return the Redis client.
 * Returns `null` if Redis is not configured or connection fails,
 * signaling consumers to use the memory fallback.
 *
 * @returns {Promise<import('redis').RedisClientType | null>}
 */
const getClient = async () => {
  if (redisClient && isReady) return redisClient;

  if (!config.redis?.url) {
    return null;
  }

  // Prevent concurrent initialization attempts
  if (redisClient && !isReady) return null;

  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error(
              { event: 'redis.reconnect.exhausted', retries },
              'Redis max reconnection attempts reached. Falling back to memory cache.',
            );
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 200, 5000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err, event: 'redis.error' }, 'Redis client error');
      isReady = false;
      if (err.message === 'Redis max retries exceeded') {
        logger.warn({ event: 'redis.degradation' }, 'Redis max retries exceeded, nullifying client for future recovery');
        redisClient = null;
      }
    });

    redisClient.on('ready', () => {
      logger.info({ event: 'redis.ready' }, 'Redis client connected and ready');
      isReady = true;
    });

    redisClient.on('end', () => {
      logger.warn({ event: 'redis.disconnected' }, 'Redis client disconnected');
      isReady = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn(
      { err: error, event: 'redis.connect.failed' },
      'Failed to connect to Redis. Using in-memory cache fallback.',
    );
    redisClient = null;
    return null;
  }
};

// ──────────────────────────────────────────────────────────────
// Cache Operations (Redis-first, Memory-fallback)
// ──────────────────────────────────────────────────────────────

/**
 * Retrieve a cached value by key.
 *
 * @param {string} key - Cache key
 * @returns {Promise<unknown | null>} Parsed value or null on miss
 */
const cacheGet = async (key) => {
  try {
    const client = await getClient();
    if (client) {
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) : null;
    }
  } catch (error) {
    logger.warn({ err: error, key, event: 'cache.get.redis_error' }, 'Redis GET failed, trying memory fallback');
  }

  // Memory fallback
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value;
  }
  memoryCache.delete(key);
  return null;
};

/**
 * Store a value in cache with a TTL.
 *
 * @param {string} key - Cache key
 * @param {unknown} value - Value to cache (must be JSON-serializable)
 * @param {number} [ttlSeconds=300] - Time-to-live in seconds
 * @returns {Promise<void>}
 */
const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    const client = await getClient();
    if (client) {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    }
  } catch (error) {
    logger.warn({ err: error, key, event: 'cache.set.redis_error' }, 'Redis SETEX failed, using memory fallback');
  }

  // Memory fallback
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

/**
 * Delete a specific cache entry.
 *
 * @param {string} key - Cache key to invalidate
 * @returns {Promise<void>}
 */
const cacheDel = async (key) => {
  try {
    const client = await getClient();
    if (client) {
      await client.del(key);
    }
  } catch (error) {
    logger.warn({ err: error, key, event: 'cache.del.redis_error' }, 'Redis DEL failed');
  }

  // Always clean memory fallback too (dual-write safety)
  memoryCache.delete(key);
};

const resetClient = () => {
  redisClient = null;
  isReady = false;
  memoryCache.clear();
};

module.exports = {
  getClient,
  cacheGet,
  cacheSet,
  cacheDel,
  resetClient,
};
