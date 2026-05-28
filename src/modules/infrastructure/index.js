import { prisma } from './prisma.js';

export {
  getClient as getRedisClient,
  disconnectClient as disconnectRedis,
  isDegraded as isRedisDegraded,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheIncr,
  resetClient as resetRedisClient,
} from './redis.js';

const runInTransaction = (callback) => prisma.$transaction(callback);

export { prisma, runInTransaction };
