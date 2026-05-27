const { Prisma } = require('@prisma/client');
const httpStatus = require('http-status');
const config = require('../config');
const ApiError = require('../ApiError');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    let message = error.message || httpStatus[statusCode];

    // Handle Prisma specific database request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        statusCode = httpStatus.BAD_REQUEST;
        message = 'Resource already exists';
        error.name = 'RESOURCE_ALREADY_EXISTS';
      } else if (error.code === 'P2025') {
        statusCode = httpStatus.NOT_FOUND;
        message = 'Resource not found';
        error.name = 'RESOURCE_NOT_FOUND';
      } else if (error.code === 'P2003') {
        statusCode = httpStatus.BAD_REQUEST;
        message = 'Dependency constraint violation';
        error.name = 'CONSTRAINT_VIOLATION';
      } else {
        statusCode = httpStatus.BAD_REQUEST;
        message = 'Invalid request payload';
        error.name = 'BAD_REQUEST';
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Validation failed';
      error.name = 'VALIDATION_FAILED';
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
    success: false,
    error: {
      code: statusCode === httpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_SERVER_ERROR' : err.name || 'API_ERROR',
      message,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  };

  // Attach error to response for pino-http to auto-log with request context
  res.err = err;

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
