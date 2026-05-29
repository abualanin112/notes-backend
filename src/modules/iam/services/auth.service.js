import httpStatus from 'http-status';
import crypto from 'crypto';
import { verifyToken, generateAuthTokens } from './token.service.js';
import { findByEmail, findById as findUserById, updateById as updateUserById } from '../repositories/user.repository.js';
import {
  findOne as findTokenRecord,
  deleteById as deleteTokenById,
  updateById as updateTokenById,
  deleteMany as deleteManyTokens,
} from '../repositories/token.repository.js';
import { runInTransaction } from '../../../infrastructure/prisma.js';
import { ApiError } from '../../../shared/ApiError.js';
import { tokenTypes } from '../../../shared/Tokens.js';
import { hashPassword, comparePassword } from '../../../shared/Password.js';
import { logger } from '../../../infrastructure/logger.js';
import { logEvent } from '../../audit/index.js';

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  // Explicitly fetch password using findByEmail with includePassword: true
  const user = await findByEmail(email, { includePassword: true });
  if (!user || !(await comparePassword(password, user.password))) {
    logger.warn({ event: 'auth.login.failed', email }, 'Failed login attempt');
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  // Strip password hash from returned object for security
  delete user.password;

  await logEvent({
    event: 'auth.login',
    entityType: 'User',
    entityId: user.id,
    action: 'EXECUTE',
  });

  logger.info({ event: 'auth.login.success', targetId: user.id }, 'User logged in successfully');
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
const logout = async (refreshToken) => {
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const refreshTokenDoc = await findTokenRecord({
    token: hashedToken,
    type: tokenTypes.REFRESH,
    blacklisted: false,
  });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await deleteTokenById(refreshTokenDoc.id);

  await logEvent({
    event: 'auth.logout',
    entityType: 'User',
    entityId: refreshTokenDoc.userId,
    action: 'EXECUTE',
  });
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken, ip = null, userAgent = null) => {
  try {
    return await runInTransaction(async (tx) => {
      const refreshTokenDoc = await verifyToken(refreshToken, tokenTypes.REFRESH, tx);
      const user = await findUserById(refreshTokenDoc.userId, tx);
      if (!user) {
        throw new Error();
      }

      if (refreshTokenDoc.blacklisted) {
        // Evaluate strict grace period for frontend race conditions (2 seconds maximum)
        if (Date.now() - refreshTokenDoc.updatedAt.getTime() < 2000) {
          throw new ApiError(httpStatus.UNAUTHORIZED, 'Concurrent refresh request detected');
        }

        // REUSE DETECTED! Threat protocol.
        await deleteManyTokens({ familyId: refreshTokenDoc.familyId }, tx);

        logger.error(
          { event: 'auth.refresh.reuse_detected', targetId: user.id, familyId: refreshTokenDoc.familyId },
          'Refresh token reuse detected. Family revoked.',
        );
        await logEvent(
          {
            event: 'auth.refresh.reuse_detected',
            entityType: 'User',
            entityId: user.id,
            action: 'DELETE',
            metadata: { familyId: refreshTokenDoc.familyId },
          },
          tx,
        );

        throw new ApiError(httpStatus.UNAUTHORIZED, 'Token reuse detected. Session terminated.');
      }

      // Blacklist the old refresh token instead of deleting it, enabling reuse detection
      await updateTokenById(refreshTokenDoc.id, { blacklisted: true }, tx);

      await logEvent(
        {
          event: 'auth.refresh.rotated',
          entityType: 'User',
          entityId: user.id,
          action: 'UPDATE',
        },
        tx,
      );

      // Generate new tokens belonging to the same family
      return generateAuthTokens(user, tx, refreshTokenDoc.familyId, ip, userAgent);
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    await runInTransaction(async (tx) => {
      const resetPasswordTokenDoc = await verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD, tx);
      const user = await findUserById(resetPasswordTokenDoc.userId, tx);
      if (!user) {
        throw new Error();
      }

      // Hash the new password explicitly
      const hashedPassword = await hashPassword(newPassword);

      // Update user password and delete reset tokens atomically
      await updateUserById(user.id, { password: hashedPassword }, tx);
      await deleteManyTokens(
        {
          userId: user.id,
          type: tokenTypes.RESET_PASSWORD,
        },
        tx,
      );
    });
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise<void>}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    await runInTransaction(async (tx) => {
      const verifyEmailTokenDoc = await verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL, tx);
      const user = await findUserById(verifyEmailTokenDoc.userId, tx);
      if (!user) {
        throw new Error();
      }

      // Delete all verification tokens and mark user verified atomically
      await deleteManyTokens(
        {
          userId: user.id,
          type: tokenTypes.VERIFY_EMAIL,
        },
        tx,
      );
      await updateUserById(user.id, { isEmailVerified: true }, tx);
    });
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

export { loginUserWithEmailAndPassword, logout, refreshAuth, resetPassword, verifyEmail };
