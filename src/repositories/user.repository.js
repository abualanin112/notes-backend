const prisma = require('../config/prisma');
const { paginate } = require('../utils/paginate');

/**
 * Repository layer for User entity using Prisma Client
 */

/**
 * Create a new user
 * @param {Object} userBody
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const create = async (userBody, tx = prisma) => {
  return tx.user.create({
    data: userBody,
  });
};

/**
 * Find user by ID
 * @param {string} id
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object|null>}
 */
const findById = async (id, options = {}, tx = prisma) => {
  let select;
  let client = tx;
  if (options && typeof options.findUnique === 'function') {
    client = options;
  } else if (options && options.select) {
    select = options.select;
  }

  return client.user.findUnique({
    where: { id },
    ...(select && { select }),
  });
};

/**
 * Find user by email
 * @param {string} email
 * @param {Object} [options]
 * @param {boolean} [options.includePassword=false] - Whether to explicitly return password hash
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object|null>}
 */
const findByEmail = async (email, { includePassword = false } = {}, tx = prisma) => {
  return tx.user.findUnique({
    where: { email },
    omit: { password: !includePassword },
  });
};

/**
 * Check if email is already taken
 * @param {string} email
 * @param {string} [excludeUserId] - Exclude user with this ID from check
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<boolean>}
 */
const isEmailTaken = async (email, excludeUserId, tx = prisma) => {
  const user = await tx.user.findFirst({
    where: {
      email,
      NOT: excludeUserId ? { id: excludeUserId } : undefined,
    },
  });
  return !!user;
};

/**
 * Update user by ID
 * @param {string} id
 * @param {Object} updateBody
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const updateById = async (id, updateBody, tx = prisma) => {
  return tx.user.update({
    where: { id },
    data: updateBody,
  });
};

/**
 * Delete user by ID
 * @param {string} id
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const deleteById = async (id, tx = prisma) => {
  return tx.user.delete({
    where: { id },
  });
};

/**
 * Paginate users
 * @param {Object} filter - Where filter criteria
 * @param {Object} options - Pagination options
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>} Standard relational pagination response shape
 */
const paginateUsers = async (filter, options, tx = prisma) => {
  const ALLOWED_POPULATIONS = ['notes'];
  const paginateOptions = { ...options };

  if (paginateOptions.populate) {
    paginateOptions.populate = paginateOptions.populate
      .split(',')
      .map((rel) => rel.trim())
      .filter((rel) => ALLOWED_POPULATIONS.includes(rel))
      .join(',');
  }

  return paginate(tx.user, filter, paginateOptions);
};

module.exports = {
  create,
  findById,
  findByEmail,
  isEmailTaken,
  updateById,
  deleteById,
  paginateUsers,
};
