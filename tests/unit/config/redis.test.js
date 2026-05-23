const redis = require('redis');

// Enforce REDIS_URL environment variable before any modules are required
process.env.REDIS_URL = 'redis://localhost:6379';

// Define the mock client shape
const mockRedisClient = {
  connect: vi.fn(),
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
};

// Spy on createClient once at module load time
vi.spyOn(redis, 'createClient').mockReturnValue(mockRedisClient);

// Require our module once at the top level
const { cacheGet, cacheSet, cacheDel, getClient, resetClient } = require('../../../src/config/redis');

describe('Redis Configuration & Cache Fallback Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clean reset of singletons inside redis.js
    resetClient();

    // Reset all mock client methods
    mockRedisClient.connect.mockReset();
    mockRedisClient.on.mockReset();
    mockRedisClient.get.mockReset();
    mockRedisClient.setEx.mockReset();
    mockRedisClient.del.mockReset();

    // Default clean setups
    mockRedisClient.connect.mockResolvedValue();
    mockRedisClient.on.mockReturnValue(mockRedisClient);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
  });

  describe('getClient', () => {
    test('should return redisClient when successfully connected', async () => {
      // Trigger ready callback to simulate connection completion
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
        return mockRedisClient;
      });

      const client = await getClient();
      expect(client).toBe(mockRedisClient);
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });
  });

  describe('Cache Operations - Fallback Mode (Redis Fails/Unconfigured)', () => {
    beforeEach(() => {
      // Simulate client connection failing or throwing
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
    });

    test('should write to and read from the local memory cache when Redis is offline', async () => {
      const key = 'test-key-1';
      const val = { user: 'John', permissions: ['read:notes:own'] };

      // Set item
      await cacheSet(key, val, 10); // 10s TTL

      // Get item (should hit memory fallback)
      const retrieved = await cacheGet(key);
      expect(retrieved).toEqual(val);
    });

    test('should expire items in memory cache based on TTL', async () => {
      const key = 'expiring-key';
      const val = 'some-value';

      // Set item with negative TTL (already expired)
      await cacheSet(key, val, -5);

      const retrieved = await cacheGet(key);
      expect(retrieved).toBeNull();
    });

    test('should remove deleted items from memory cache', async () => {
      const key = 'deleted-key';
      const val = 'data';

      await cacheSet(key, val, 60);
      let retrieved = await cacheGet(key);
      expect(retrieved).toBe(val);

      await cacheDel(key);
      retrieved = await cacheGet(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Operations - Active Mode (Redis Online)', () => {
    beforeEach(() => {
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback();
        }
        return mockRedisClient;
      });
    });

    test('should use Redis get and setEx when Redis is online', async () => {
      const key = 'redis-key';
      const val = { foo: 'bar' };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(val));
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheSet(key, val, 120);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, 120, JSON.stringify(val));

      const retrieved = await cacheGet(key);
      expect(retrieved).toEqual(val);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    test('should use Redis del when Redis is online', async () => {
      const key = 'redis-del-key';
      mockRedisClient.del.mockResolvedValue(1);

      await cacheDel(key);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });
  });
});
