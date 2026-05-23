const { AsyncLocalStorage } = require('async_hooks');

/**
 * AsyncLocalStorage instance for tracking request-scoped observability context.
 * ALLOWED: reqId, userId, logger
 * FORBIDDEN: business state, DTOs, repositories
 */
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = asyncLocalStorage;
