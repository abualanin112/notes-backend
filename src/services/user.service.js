const httpStatus = require('http-status');
const { userRepository, noteRepository, runInTransaction } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/password');
const logger = require('../config/logger');
const auditService = require('./audit.service');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<Object>}
 */
const createUser = async (userBody) => {
  // Hash password explicitly before saving
  const hashedPassword = await hashPassword(userBody.password);

  if (await userRepository.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  return runInTransaction(async (tx) => {
    const user = await userRepository.create(
      {
        ...userBody,
        password: hashedPassword,
      },
      tx,
    );

    await auditService.logEvent(
      {
        event: 'users.created',
        entityType: 'User',
        entityId: user.id,
        action: 'CREATE',
        metadata: { email: user.email },
      },
      tx,
    );

    logger.info({ event: 'users.created', targetId: user.id }, 'User created successfully');
    return user;
  });
};

/**
 * Query for users
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<Object>} Standard relational pagination response shape
 */
const queryUsers = async (filter, options) => {
  return userRepository.paginateUsers(filter, options);
};

/**
 * Get user by id
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const getUserById = async (id) => {
  return userRepository.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const getUserByEmail = async (email) => {
  return userRepository.findByEmail(email);
};

/**
 * Update user by id
 * @param {string} userId
 * @param {Object} updateBody
 * @returns {Promise<Object>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const dataToUpdate = { ...updateBody };
  // Hash password if it is being updated
  if (dataToUpdate.password) {
    dataToUpdate.password = await hashPassword(dataToUpdate.password);
  }

  if (dataToUpdate.email && (await userRepository.isEmailTaken(dataToUpdate.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  return runInTransaction(async (tx) => {
    const updatedUser = await userRepository.updateById(userId, dataToUpdate, tx);

    await auditService.logEvent(
      {
        event: 'users.updated',
        entityType: 'User',
        entityId: userId,
        action: 'UPDATE',
        metadata: { changedFields: Object.keys(dataToUpdate) },
      },
      tx,
    );

    return updatedUser;
  });
};

/**
 * Delete user by id
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Tiered Deletion (Correction 5): Notes are RESTRICT at DB level,
  // we explicitly delete them inside a transaction before deleting the user.
  // Ephemeral tokens cascade automatically via foreign key settings.
  await runInTransaction(async (tx) => {
    await noteRepository.deleteManyByOwnerId(userId, tx);
    await userRepository.deleteById(userId, tx);

    await auditService.logEvent(
      {
        event: 'users.deleted',
        entityType: 'User',
        entityId: userId,
        action: 'DELETE',
      },
      tx,
    );
  });

  return user;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
