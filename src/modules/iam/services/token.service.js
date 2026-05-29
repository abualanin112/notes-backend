import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import crypto from 'crypto';
import httpStatus from 'http-status';
import { getUserByEmail } from './user.service.js';
import { create as createTokenRecord, findOne as findTokenRecord } from '../repositories/token.repository.js';
import { ApiError } from '../../../shared/ApiError.js';
import { tokenTypes } from '../../../shared/Tokens.js';
import { config } from '../../../infrastructure/config.js';

/**
 * Generate token
 * @param {string} userId
 * @param {dayjs.Dayjs} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: dayjs().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Hash a token securely for persistence
 * @param {string} token
 * @returns {string}
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Save a token
 * @param {string} token
 * @param {string} userId
 * @param {dayjs.Dayjs} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @param {string} [familyId] - Token family for rotation
 * @param {string} [ip]
 * @param {string} [userAgent]
 * @returns {Promise<Object>}
 */
const saveToken = async (
  token,
  userId,
  expires,
  type,
  blacklisted = false,
  tx = undefined,
  familyId = null,
  ip = null,
  userAgent = null,
) => {
  return createTokenRecord(
    {
      token: hashToken(token),
      userId,
      expires: expires.toDate(),
      type,
      blacklisted,
      familyId,
      ip,
      userAgent,
    },
    tx,
  );
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<Object>}
 */
const verifyToken = async (token, type, tx) => {
  const payload = jwt.verify(token, config.jwt.secret);
  const tokenDoc = await findTokenRecord(
    {
      token: hashToken(token),
      type,
      userId: payload.sub,
      blacklisted: false,
    },
    tx,
  );
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {Object} user
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @param {string} [familyId] - Existing familyId if rotating, otherwise generates new
 * @param {string} [ip]
 * @param {string} [userAgent]
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user, tx, familyId = null, ip = null, userAgent = null) => {
  const accessTokenExpires = dayjs().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = dayjs().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);

  const tokenFamilyId = familyId || crypto.randomUUID();
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH, false, tx, tokenFamilyId, ip, userAgent);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email, tx) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = dayjs().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD, false, tx);
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {Object} user
 * @param {Object} [tx=prisma] - Optional Prisma transaction client
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user, tx) => {
  const expires = dayjs().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL, false, tx);
  return verifyEmailToken;
};

export { generateToken, saveToken, verifyToken, generateAuthTokens, generateResetPasswordToken, generateVerifyEmailToken };
