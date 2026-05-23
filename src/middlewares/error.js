const { Prisma } = require('@prisma/client');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    let message = error.message || httpStatus[statusCode];

    // Handle Prisma specific database request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        statusCode = httpStatus.BAD_REQUEST;
        const target = error.meta && error.meta.target ? error.meta.target : [];
        message = `Unique constraint validation failed. Duplicate value for field: [${target.join(', ')}]`;
      } else if (error.code === 'P2025') {
        statusCode = httpStatus.NOT_FOUND;
        message = 'Record not found';
      } else if (error.code === 'P2003') {
        statusCode = httpStatus.BAD_REQUEST;
        message = 'Foreign key constraint violation';
      } else {
        statusCode = httpStatus.BAD_REQUEST;
        message = `Database query failed: ${error.message}`;
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      statusCode = httpStatus.BAD_REQUEST;
      message = `Database validation failed: ${error.message}`;
    }

    error = new ApiError(statusCode, message, false, err.stack, err);
  }
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  // Attach error to response for pino-http to auto-log with request context
  res.err = err;

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
