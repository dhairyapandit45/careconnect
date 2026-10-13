/**
 * Rate Limiting Middleware
 * Protects endpoints against brute-force and DDoS attempts.
 * Provides separated limits for general API routes and authentication attempts,
 * with route exclusions for health checks and auth routes on the general limiter.
 */

const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { ERROR_CODES } = require('../constants/errorCodes');

/**
 * Determine whether a request path should bypass the general API rate limiter.
 * - Health checks are excluded so uptime monitors and status probes never consume quota.
 * - Login and registration routes are excluded from the general limiter because they are
 *   strictly protected by the dedicated authLimiter. This ensures standard navigation
 *   and analytics requests do not exhaust the login budget.
 */
const shouldSkipApiLimiter = (req) => {
  const url = (req.originalUrl || req.path || '').split('?')[0].replace(/\/+$/, '');
  if (url === '/health' || url.endsWith('/health')) {
    return true;
  }
  if (url.endsWith('/auth/login') || url.endsWith('/auth/register')) {
    return true;
  }
  return false;
};

const createApiLimiter = (options = {}) => {
  const isTest = options.nodeEnv ? options.nodeEnv === 'test' : env.NODE_ENV === 'test';
  if (isTest && !options.forceEnable) {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs: options.windowMs || env.RATE_LIMIT_WINDOW_MS,
    max: options.max !== undefined ? options.max : env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip !== undefined ? options.skip : shouldSkipApiLimiter,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes.',
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: [],
      },
    },
    ...options.limiterOptions,
  });
};

const createAuthLimiter = (options = {}) => {
  const isTest = options.nodeEnv ? options.nodeEnv === 'test' : env.NODE_ENV === 'test';
  if (isTest && !options.forceEnable) {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs: options.windowMs || env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: options.max !== undefined ? options.max : env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again in 15 minutes.',
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: [],
      },
    },
    ...options.limiterOptions,
  });
};

const apiLimiter = createApiLimiter();
const authLimiter = createAuthLimiter();

module.exports = {
  apiLimiter,
  authLimiter,
  createApiLimiter,
  createAuthLimiter,
  shouldSkipApiLimiter,
};

