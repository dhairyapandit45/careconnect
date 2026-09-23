/**
 * Request Validation Middleware using Zod
 */

const { ApiError } = require('../utils/apiError');

/**
 * Validates request data against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(ApiError.validation('Request validation failed', details));
    }

    // Replace request data with parsed/sanitized data
    req[source] = result.data;
    next();
  };
};

module.exports = {
  validate,
};
