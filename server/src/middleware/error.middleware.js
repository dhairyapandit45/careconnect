/**
 * Centralized Error Handling Middleware
 * Intercepts all application errors, translates DB/JWT errors, formats standardized JSON,
 * and strips stack traces in production environments.
 */

const { env } = require('../config/env');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/apiError');
const { ERROR_CODES } = require('../constants/errorCodes');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, ERROR_CODES.NOT_FOUND));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let details = err.details || [];

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = ERROR_CODES.DUPLICATE_RESOURCE;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. Please use another value.`;
    details = [{ field, message }];
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = `Invalid format for identifier: ${err.value}`;
    details = [{ field: err.path, message: `Invalid identifier format: ${err.value}` }];
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = ERROR_CODES.UNAUTHORIZED;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = ERROR_CODES.UNAUTHORIZED;
    message = 'Authentication token has expired';
  }

  // Handle SyntaxError (e.g. malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = 'Malformed JSON request body';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${message}`);
  }

  const responsePayload = {
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
  };

  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    responsePayload.error.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
