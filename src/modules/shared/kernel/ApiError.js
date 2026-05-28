export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '', cause = null) {
    super(message, { cause });
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (cause) {
      this.cause = cause;
    }
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
