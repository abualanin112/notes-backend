import httpStatus from 'http-status';
import {
  isEmailTaken,
  create as createUserRecord,
  paginateUsers as paginateUserRecords,
  findById,
  findByEmail as findUserByEmailRecord,
  updateById as updateUserByIdRecord,
  deleteById as deleteUserByIdRecord,
} from '../repositories/user.repository.js';
import { runInTransaction } from '../../../infrastructure/prisma.js';
// TODO: HIGH-RISK AUTHORIZATION COUPLING
import { ApiError } from '../../../shared/ApiError.js';
import { hashPassword } from '../../../shared/Password.js';
import { logger } from '../../../infrastructure/logger.js';
import { logEvent } from '../../audit/index.js';

const userDeletionHooks = [];
const registerUserDeletionHook = (hook) => userDeletionHooks.push(hook);

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<Object>}
 */
const createUser = async (userBody) => {
  // Hash password explicitly before saving
  const hashedPassword = await hashPassword(userBody.password);

  if (await isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  return runInTransaction(async (tx) => {
    const user = await createUserRecord(
      {
        ...userBody,
        password: hashedPassword,
      },
      tx,
    );

    await logEvent(
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
  const users = await paginateUserRecords(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const getUserById = async (id) => {
  return findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const getUserByEmail = async (email) => {
  return findUserByEmailRecord(email);
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

  if (updateBody.email && (await isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  return runInTransaction(async (tx) => {
    const updatedUser = await updateUserByIdRecord(userId, dataToUpdate, tx);

    await logEvent(
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
    // Execute any registered pre-deletion hooks from other modules (dependency inversion)
    if (userDeletionHooks.length > 0) {
      await Promise.all(userDeletionHooks.map((hook) => hook(userId, tx)));
    }

    await deleteUserByIdRecord(userId, tx);

    await logEvent(
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

export { createUser, queryUsers, getUserById, getUserByEmail, updateUserById, deleteUserById, registerUserDeletionHook };
