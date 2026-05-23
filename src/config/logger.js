const pino = require('pino');
const config = require('./config');
const asyncLocalStorage = require('./als');

/**
 * Pino Logger Configuration
 * Aggressively redacts sensitive data (passwords, tokens, cookies).
 */
let logLevel = 'info';
if (config.env === 'test') {
  logLevel = 'silent';
} else if (config.env === 'development') {
  logLevel = 'debug';
}

const baseLogger = pino({
  level: logLevel,
  formatters: {
    level: (label) => ({ level: label }), // Map standard text levels (e.g., 'info') instead of numeric values
    log: (object) => {
      // Standardize timing fields to durationMs as per Phase 2.5
      if (object.responseTime !== undefined) {
        const { responseTime, ...rest } = object;
        return { ...rest, durationMs: responseTime };
      }
      return object;
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.passwordConfirmation',
      'body.token',
      'body.refreshToken',
      'user.password',
      '*.password', // Generic catch-all for deeply nested passwords
      'password',
    ],
    censor: '[REDACTED]',
  },
  // Ensure background tasks (without ALS) still have basic identifiers
  base: {
    env: config.env,
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Contextual Logger Proxy
 * Intercepts logging calls and checks if there is a child logger in the ALS context.
 * If true (i.e. within an HTTP request), it automatically injects `reqId` and `userId`.
 * If false (i.e. background job), it falls back to the global `baseLogger`.
 */
const logger = {
  info: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).info(...args),
  error: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).error(...args),
  warn: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).warn(...args),
  debug: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).debug(...args),
  fatal: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).fatal(...args),
  trace: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).trace(...args),
  child: (bindings) => {
    // Return a function that dynamically resolves the correct logger at runtime
    // and binds the module metadata to it. This preserves ALS tracking for child loggers.
    return {
      info: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).child(bindings).info(...args),
      error: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).child(bindings).error(...args),
      warn: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).child(bindings).warn(...args),
      debug: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).child(bindings).debug(...args),
      fatal: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).child(bindings).fatal(...args),
      trace: (...args) => (asyncLocalStorage.getStore()?.logger || baseLogger).child(bindings).trace(...args),
    };
  },
};

module.exports = Object.assign(logger, { baseLogger });
