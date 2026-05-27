const httpStatus = require('http-status');
const crypto = require('crypto');
const tokenService = require('./token.service');
const { userRepository, tokenRepository, runInTransaction } = require('../../../repositories');
const { ApiError } = require('../../shared');
const {
  tokens: { tokenTypes },
} = require('../../shared');
const {
  password: { comparePassword, hashPassword },
} = require('../../shared');
const { logger } = require('../../shared');
const auditService = require('../../../services/audit.service');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  // Explicitly fetch password using findByEmail with includePassword: true
  const user = await userRepository.findByEmail(email, { includePassword: true });
  if (!user || !(await comparePassword(password, user.password))) {
    logger.warn({ event: 'auth.login.failed', email }, 'Failed login attempt');
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  // Strip password hash from returned object for security
  delete user.password;

  await auditService.logEvent({
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
  const refreshTokenDoc = await tokenRepository.findOne({
    token: hashedToken,
    type: tokenTypes.REFRESH,
    blacklisted: false,
  });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await tokenRepository.deleteById(refreshTokenDoc.id);

  await auditService.logEvent({
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
      const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH, tx);
      const user = await userRepository.findById(refreshTokenDoc.userId, tx);
      if (!user) {
        throw new Error();
      }

      if (refreshTokenDoc.blacklisted) {
        // Evaluate strict grace period for frontend race conditions (2 seconds maximum)
        if (Date.now() - refreshTokenDoc.updatedAt.getTime() < 2000) {
          throw new ApiError(httpStatus.UNAUTHORIZED, 'Concurrent refresh request detected');
        }

        // REUSE DETECTED! Threat protocol.
        await tokenRepository.deleteMany({ familyId: refreshTokenDoc.familyId }, tx);

        logger.error(
          { event: 'auth.refresh.reuse_detected', targetId: user.id, familyId: refreshTokenDoc.familyId },
          'Refresh token reuse detected. Family revoked.',
        );
        await auditService.logEvent(
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
      await tokenRepository.updateById(refreshTokenDoc.id, { blacklisted: true }, tx);

      await auditService.logEvent(
        {
          event: 'auth.refresh.rotated',
          entityType: 'User',
          entityId: user.id,
          action: 'UPDATE',
        },
        tx,
      );

      // Generate new tokens belonging to the same family
      return tokenService.generateAuthTokens(user, tx, refreshTokenDoc.familyId, ip, userAgent);
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
      const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD, tx);
      const user = await userRepository.findById(resetPasswordTokenDoc.userId, tx);
      if (!user) {
        throw new Error();
      }

      // Hash the new password explicitly
      const hashedPassword = await hashPassword(newPassword);

      // Update user password and delete reset tokens atomically
      await userRepository.updateById(user.id, { password: hashedPassword }, tx);
      await tokenRepository.deleteMany(
        {
          userId: user.id,
          type: tokenTypes.RESET_PASSWORD,
        },
        tx,
      );
    });
  } catch (error) {
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
      const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL, tx);
      const user = await userRepository.findById(verifyEmailTokenDoc.userId, tx);
      if (!user) {
        throw new Error();
      }

      // Delete all verification tokens and mark user verified atomically
      await tokenRepository.deleteMany(
        {
          userId: user.id,
          type: tokenTypes.VERIFY_EMAIL,
        },
        tx,
      );
      await userRepository.updateById(user.id, { isEmailVerified: true }, tx);
    });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};
