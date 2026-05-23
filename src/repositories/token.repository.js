const prisma = require('../config/prisma');

/**
 * Repository layer for Token entity using Prisma Client
 */

/**
 * Create a new token
 * @param {Object} tokenBody
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const create = async (tokenBody, tx = prisma) => {
  const { userId, ...rest } = tokenBody;
  return tx.token.create({
    data: {
      ...rest,
      user: {
        connect: { id: userId.toString() },
      },
    },
  });
};

/**
 * Find token by filter
 * @param {Object} filter - Prisma where filter criteria (e.g., { token, type, blacklisted })
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object|null>}
 */
const findOne = async (filter, tx = prisma) => {
  return tx.token.findFirst({
    where: filter,
  });
};

/**
 * Delete a single token by ID
 * @param {string} id
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const deleteById = async (id, tx = prisma) => {
  return tx.token.delete({
    where: { id },
  });
};

/**
 * Delete tokens matching a filter
 * @param {Object} filter - Prisma where criteria (e.g., { userId, type })
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>} Prisma BatchPayload { count }
 */
const deleteMany = async (filter, tx = prisma) => {
  return tx.token.deleteMany({
    where: filter,
  });
};

/**
 * Update token by ID
 * @param {string} id
 * @param {Object} updateBody
 * @param {Object} [tx=prisma]
 * @returns {Promise<Object>}
 */
const updateById = async (id, updateBody, tx = prisma) => {
  return tx.token.update({
    where: { id },
    data: updateBody,
  });
};

/**
 * Delete all expired tokens
 * @param {Object} [tx=prisma]
 * @returns {Promise<Object>}
 */
const deleteExpiredTokens = async (tx = prisma) => {
  let totalDeleted = 0;
  let hasMore = true;
  const BATCH_SIZE = 1000;

  /* eslint-disable no-await-in-loop */
  while (hasMore) {
    // Find a batch of expired tokens
    const expiredTokens = await tx.token.findMany({
      where: { expires: { lt: new Date() } },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (expiredTokens.length === 0) {
      hasMore = false;
      break;
    }

    const idsToDelete = expiredTokens.map((t) => t.id);
    const result = await tx.token.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    totalDeleted += result.count;
  }

  return { count: totalDeleted };
};

module.exports = {
  create,
  findOne,
  deleteById,
  deleteMany,
  updateById,
  deleteExpiredTokens,
};
