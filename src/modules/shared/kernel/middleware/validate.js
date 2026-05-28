import httpStatus from 'http-status';
import { ZodError } from 'zod';
import { ApiError } from '../ApiError.js';

const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Update request with validated and coerced data
    Object.assign(req, validated);

    next();
  } catch (error) {
    if (error instanceof ZodError || error.name === 'ZodError') {
      const issues = error.issues || error.errors || [];
      const errorMessage = issues.map((details) => details.message).join(', ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }
    next(error);
  }
};

export { validate };
