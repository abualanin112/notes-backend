process.env.REDIS_URL = 'redis://localhost:6379';

const { metrics } = require('../../../src/config/metrics');
const redis = require('redis');
const { vi, describe, it, expect, beforeEach } = require('vitest');

// Define mock client
const mockRedisClient = {
  connect: vi.fn(),
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
  quit: vi.fn(),
};

// Spy on createClient BEFORE requiring redisConfig
vi.spyOn(redis, 'createClient').mockReturnValue(mockRedisClient);

const redisConfig = require('../../../src/config/redis');

describe('Infrastructure: Redis Circuit Breaker & Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisConfig.resetClient();

    // Reset metrics
    metrics.redis.reconnects = 0;
    metrics.redis.degradedModeTransitions = 0;
    metrics.cache.hits = 0;
    metrics.cache.misses = 0;

    mockRedisClient.connect.mockReset();
    mockRedisClient.on.mockReset();
    mockRedisClient.get.mockReset();
    mockRedisClient.setEx.mockReset();
    mockRedisClient.del.mockReset();
    mockRedisClient.quit.mockReset();

    mockRedisClient.connect.mockResolvedValue();
    mockRedisClient.on.mockReturnValue(mockRedisClient);
  });

  it('should trip the circuit breaker after 5 consecutive failures', async () => {
    // Simulate connection failure
    mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

    // Attempt to connect 5 times
    for (let i = 0; i < 5; i++) {
      await redisConfig.getClient();
    }

    // After 5 failures, circuit breaker is open. Next attempt returns null directly.
    const client6 = await redisConfig.getClient();
    expect(client6).toBeNull();
    
    // Connect should only be called 5 times.
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(5);
    
    // Degraded mode transition should be recorded
    expect(metrics.redis.degradedModeTransitions).toBeGreaterThanOrEqual(1);
    expect(redisConfig.isDegraded()).toBe(true);
  });

  it('should fallback to memory cache and record metrics correctly', async () => {
    // Force circuit breaker open
    mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
    for (let i = 0; i < 5; i++) {
      await redisConfig.getClient();
    }

    // Now fallback to memory
    await redisConfig.cacheSet('fallback_key', { data: 123 }, 60);
    const result = await redisConfig.cacheGet('fallback_key');
    
    expect(result).toEqual({ data: 123 });
    expect(metrics.cache.hits).toBe(1);

    const missed = await redisConfig.cacheGet('missing_key');
    expect(missed).toBeNull();
    expect(metrics.cache.misses).toBe(1);
  });
});
