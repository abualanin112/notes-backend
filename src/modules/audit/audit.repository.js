import { prisma } from '../infrastructure/index.js';

/**
 * Create a new audit log
 * @param {Object} data - The audit log data
 * @param {Object} [tx=prisma] - Optional transaction client
 * @returns {Promise<Object>} The created audit log
 */
const create = async (data, tx = prisma) => {
  return tx.auditLog.create({
    data,
  });
};

export { create };
