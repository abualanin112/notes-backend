const pinoHttp = require('pino-http');
const crypto = require('crypto');
const { baseLogger } = require('./logger');

const pinoMiddleware = pinoHttp({
  logger: baseLogger,
  genReqId(req) {
    // Generate a unique correlation ID for each request
    return req.id || crypto.randomUUID();
  },
  customProps(req) {
    // Add custom properties like userId if authenticated
    return {
      userId: req.user ? req.user.id : undefined,
    };
  },
  customSuccessMessage() {
    return 'request completed';
  },
  customErrorMessage() {
    return 'request errored';
  },
  serializers: {
    req: (req) => {
      // Use standard serializer to generate safe object copy
      const serialized = pinoHttp.stdSerializers.req(req);
      // Explicitly enforce header redaction before it hits the base logger's generic paths
      // Must clone the headers object to avoid mutating the original req.headers
      if (serialized.headers) {
        serialized.headers = { ...serialized.headers };
        if (serialized.headers.authorization) {
          serialized.headers.authorization = '[REDACTED]';
        }
        if (serialized.headers.cookie) {
          serialized.headers.cookie = '[REDACTED]';
        }
      }
      return serialized;
    },
    res: pinoHttp.stdSerializers.res,
    err: pinoHttp.stdSerializers.err,
  },
});

module.exports = pinoMiddleware;
