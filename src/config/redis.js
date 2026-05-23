const { createClient } = require('redis');
const { LRUCache } = require('lru-cache');
const config = require('./config');
const logger = require('./logger');
const { metrics } = require('./metrics');

// ──────────────────────────────────────────────────────────────
// Lightweight Redis Circuit Breaker State
// ──────────────────────────────────────────────────────────────
const CIRCUIT_BREAKER = {
  failures: 0,
  maxFailures: 5,
  isOpen: false,
  nextTry: 0,
  cooldownMs: 60000, // 60 seconds
};

// ──────────────────────────────────────────────────────────────
// Redis Client Singleton with In-Memory Fallback
// ──────────────────────────────────────────────────────────────

/** @type {import('redis').RedisClientType | null} */
let redisClient = null;

/** @type {boolean} */
let isReady = false;

/**
 * In-memory cache used as a transparent fallback.
 * Uses lru-cache to enforce hard memory limits and automatic TTL eviction.
 */
const memoryCache = new LRUCache({
  max: 1000, // maximum number of entries
  ttl: 1000 * 60 * 5, // 5 minutes default TTL
});

/**
 * Lazily initialize and return the Redis client.
 * Includes Circuit Breaker logic.
 *
 * @returns {Promise<import('redis').RedisClientType | null>}
 */
const getClient = async () => {
  // If circuit breaker is open, check if cooldown passed (half-open)
  if (CIRCUIT_BREAKER.isOpen) {
    if (Date.now() > CIRCUIT_BREAKER.nextTry) {
      // Half-open: allow one attempt
      logger.info({ event: 'redis.circuit_breaker.half_open' }, 'Redis circuit breaker half-open. Attempting reconnect.');
      CIRCUIT_BREAKER.isOpen = false;
    } else {
      // Circuit is still open, return null to force memory cache fallback
      return null;
    }
  }

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
          metrics.redis.reconnects += 1;
          if (retries > 10) {
            logger.error({ event: 'redis.reconnect.exhausted', retries }, 'Redis max reconnection attempts reached.');
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 200, 5000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err, event: 'redis.error' }, 'Redis client error');
      isReady = false;

      CIRCUIT_BREAKER.failures += 1;
      if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.maxFailures && !CIRCUIT_BREAKER.isOpen) {
        CIRCUIT_BREAKER.isOpen = true;
        CIRCUIT_BREAKER.nextTry = Date.now() + CIRCUIT_BREAKER.cooldownMs;
        metrics.redis.degradedModeTransitions += 1;
        logger.warn({ event: 'redis.circuit_breaker.open' }, 'Redis circuit breaker opened. Falling back to memory cache.');
      }

      if (err.message === 'Redis max retries exceeded') {
        metrics.redis.degradedModeTransitions += 1;
        logger.warn({ event: 'redis.degradation' }, 'Redis max retries exceeded, nullifying client for future recovery');
        redisClient = null;
      }
    });

    redisClient.on('ready', () => {
      logger.info({ event: 'redis.ready' }, 'Redis client connected and ready');
      isReady = true;
      // Reset circuit breaker on success
      CIRCUIT_BREAKER.failures = 0;
      CIRCUIT_BREAKER.isOpen = false;
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
    CIRCUIT_BREAKER.failures += 1;
    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.maxFailures) {
      CIRCUIT_BREAKER.isOpen = true;
      CIRCUIT_BREAKER.nextTry = Date.now() + CIRCUIT_BREAKER.cooldownMs;
      metrics.redis.degradedModeTransitions += 1;
    }
    return null;
  }
};

const disconnectClient = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isReady = false;
  }
};

/**
 * Returns whether Redis is currently in a degraded state.
 * Required for Health & Readiness reporting.
 */
const isDegraded = () => {
  return CIRCUIT_BREAKER.isOpen || (!isReady && redisClient === null && config.redis?.url);
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
      if (raw) {
        metrics.cache.hits += 1;
        return JSON.parse(raw);
      }
      metrics.cache.misses += 1;
      return null;
    }
  } catch (error) {
    logger.warn({ err: error, key, event: 'cache.get.redis_error' }, 'Redis GET failed, trying memory fallback');
  }

  // Memory fallback
  const val = memoryCache.get(key);
  if (val) {
    metrics.cache.hits += 1;
    return val;
  }
  metrics.cache.misses += 1;
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
  memoryCache.set(key, value, { ttl: ttlSeconds * 1000 });
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

/**
 * Atomically increment a numeric value in the cache.
 *
 * @param {string} key - Cache key
 * @returns {Promise<number>} The new value after incrementing
 */
const cacheIncr = async (key) => {
  try {
    const client = await getClient();
    if (client) {
      const newValue = await client.incr(key);
      return newValue;
    }
  } catch (error) {
    logger.warn({ err: error, key, event: 'cache.incr.redis_error' }, 'Redis INCR failed, trying memory fallback');
  }

  // Memory fallback
  let val = memoryCache.get(key);
  if (typeof val !== 'number') {
    val = parseInt(val, 10);
    if (Number.isNaN(val)) val = 0;
  }
  val += 1;
  memoryCache.set(key, val, { ttl: 1000 * 60 * 60 * 24 * 365 }); // 1 year fallback TTL
  return val;
};

const resetClient = () => {
  redisClient = null;
  isReady = false;
  CIRCUIT_BREAKER.failures = 0;
  CIRCUIT_BREAKER.isOpen = false;
  CIRCUIT_BREAKER.nextTry = 0;
  memoryCache.clear();
};

module.exports = {
  getClient,
  disconnectClient,
  isDegraded,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheIncr,
  resetClient,
};
