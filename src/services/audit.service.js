const asyncLocalStorage = require('../config/als');
const { auditRepository } = require('../repositories');
const logger = require('../config/logger');

const FORBIDDEN_KEYS = new Set(['password', 'token', 'refreshtoken', 'cookie', 'authorization']);

/**
 * Recursively sanitize metadata payload to prevent sensitive data leaks.
 * Enforces depth limit and string size limit.
 */
const sanitizeMetadata = (obj, depth = 0, maxDepth = 3) => {
  if (depth > maxDepth) return '[MAX_DEPTH_EXCEEDED]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > 2000) {
      return `${obj.substring(0, 2000)}...[TRUNCATED]`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMetadata(item, depth + 1, maxDepth));
  }

  return Object.keys(obj).reduce((sanitized, key) => {
    const value = obj[key];
    const lowerKey = key.toLowerCase();

    if (FORBIDDEN_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('token')) {
      return { ...sanitized, [key]: '[REDACTED]' };
    }
    return { ...sanitized, [key]: sanitizeMetadata(value, depth + 1, maxDepth) };
  }, {});
};

/**
 * Log an audit event
 * @param {Object} payload
 * @param {string} payload.event - Canonical event taxonomy (e.g., 'notes.created')
 * @param {string} payload.entityType - Standardized PascalCase entity name (e.g., 'Note')
 * @param {string} payload.entityId - ID of the target entity
 * @param {string} payload.action - Secondary classifier ('CREATE', 'UPDATE', 'DELETE', 'EXECUTE')
 * @param {Object} [payload.metadata] - Optional payload, will be strictly sanitized
 * @param {string} [payload.reason] - Optional context reason
 * @param {Object} [tx=null] - Prisma transaction client to ensure atomic persistence
 */
const logEvent = async ({ event, entityType, entityId, action, metadata = null, reason = null }, tx) => {
  try {
    const store = asyncLocalStorage.getStore();
    const actorId = store?.userId || null;
    const reqId = store?.reqId || null;

    let safeMetadata = null;
    if (metadata) {
      safeMetadata = sanitizeMetadata(metadata);
    }

    return await auditRepository.create(
      {
        event,
        reqId,
        actorId,
        entityType,
        entityId,
        action,
        metadata: safeMetadata,
        reason,
      },
      tx,
    );
  } catch (error) {
    logger.error({ err: error, event: 'system.audit.failure' }, 'Failed to persist audit log');
    throw error; // Bubble up so transactional boundaries can cleanly rollback
  }
};

module.exports = {
  logEvent,
  sanitizeMetadata,
};
