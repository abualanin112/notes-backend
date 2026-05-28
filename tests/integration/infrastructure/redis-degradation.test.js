import { metrics } from '../../../src/modules/shared/index.js';
import {
  resetRedisClient,
  getRedisClient,
  isRedisDegraded,
  cacheGet,
  cacheSet,
} from '../../../src/modules/infrastructure/index.js';

vi.hoisted(() => {
  process.env.REDIS_URL = 'redis://localhost:6379';
});

// Define mock client using vi.hoisted
const mockRedisClient = vi.hoisted(() => ({
  connect: vi.fn(),
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
  quit: vi.fn(),
}));

// Mock the 'redis' module before imports
vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue(mockRedisClient),
}));

describe('Infrastructure: Redis Circuit Breaker & Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRedisClient();

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
      await getRedisClient();
    }

    const client6 = await getRedisClient();
    expect(client6).toBeNull();

    // Connect should only be called 5 times.
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(5);

    // Degraded mode transition should be recorded
    expect(metrics.redis.degradedModeTransitions).toBeGreaterThanOrEqual(1);
    expect(isRedisDegraded()).toBe(true);
  });

  it('should fallback to memory cache and record metrics correctly', async () => {
    // Force circuit breaker open
    mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
    for (let i = 0; i < 5; i++) {
      await getRedisClient();
    }

    await cacheSet('fallback_key', { data: 123 }, 60);
    const result = await cacheGet('fallback_key');

    expect(result).toEqual({ data: 123 });
    expect(metrics.cache.hits).toBe(1);
    const missed = await cacheGet('missing_key');
    expect(missed).toBeNull();
    expect(metrics.cache.misses).toBe(1);
  });
});
