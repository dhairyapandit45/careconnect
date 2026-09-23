/**
 * Custom Operational API Error Class
 */

class ApiError extends Error {
  constructor(statusCode, message, code = 'BAD_REQUEST', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = []) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required', details = []) {
    return new ApiError(401, message, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'Access denied: insufficient permissions', details = []) {
    return new ApiError(403, message, 'FORBIDDEN', details);
  }

  static notFound(message = 'Resource not found', details = []) {
    return new ApiError(404, message, 'NOT_FOUND', details);
  }

  static duplicate(message = 'Duplicate resource', details = []) {
    return new ApiError(409, message, 'DUPLICATE_RESOURCE', details);
  }

  static validation(message = 'Validation failed', details = []) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static rateLimit(message = 'Too many requests, please try again later') {
    return new ApiError(429, message, 'RATE_LIMIT_EXCEEDED');
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR');
  }
}

module.exports = {
  ApiError,
};
