import { als as asyncLocalStorage } from '../../infrastructure/als.js';
import { logger } from '../../infrastructure/logger.js';
import { create } from './audit.repository.js';

const MAX_SERIALIZATION_DEPTH = 3;
const MAX_ARRAY_SIZE = 50;
const MAX_STRING_LENGTH = 2000;
const FORBIDDEN_KEYS = new Set(['password', 'token', 'refreshtoken', 'cookie', 'authorization']);

/**
 * Recursively sanitize metadata payload to prevent sensitive data leaks.
 * Enforces depth limit, array size limit, and string size limit.
 */
const sanitizeMetadata = (obj, depth = 0, maxDepth = MAX_SERIALIZATION_DEPTH) => {
  if (depth > maxDepth) return '[MAX_DEPTH_EXCEEDED]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > MAX_STRING_LENGTH) {
      return `${obj.substring(0, MAX_STRING_LENGTH)}...[TRUNCATED]`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_SIZE) {
      const truncated = obj.slice(0, MAX_ARRAY_SIZE).map((item) => sanitizeMetadata(item, depth + 1, maxDepth));
      truncated.push(`[TRUNCATED_${obj.length - MAX_ARRAY_SIZE}_ITEMS]`);
      return truncated;
    }
    return obj.map((item) => sanitizeMetadata(item, depth + 1, maxDepth));
  }

  return Object.keys(obj).reduce((sanitized, key) => {
    // eslint-disable-next-line security/detect-object-injection
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

    // Hybrid Approach: Allow-list for top-level canonical structure
    const canonicalPayload = {
      event,
      reqId,
      actorId,
      entityType,
      entityId,
      action,
      // Deny-list for nested dynamic data inside metadata (treated as 'before' / 'after' depending on action context, or plain metadata)
      metadata: safeMetadata,
      reason,
    };

    return await create(canonicalPayload, tx);
  } catch (error) {
    logger.error({ err: error, event: 'system.audit.failure' }, 'Failed to persist audit log');
    throw error; // Bubble up so transactional boundaries can cleanly rollback
  }
};

export { logEvent, sanitizeMetadata };
