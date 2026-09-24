/**
 * Rate Limiting Middleware
 * Protects endpoints against brute-force and DDoS attempts.
 */

const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { ERROR_CODES } = require('../constants/errorCodes');

const apiLimiter =
  env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: 'Too many requests from this IP, please try again after 15 minutes.',
          error: {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            details: [],
          },
        },
      });

const authLimiter =
  env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // max 20 login/register attempts per window
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
      });

module.exports = {
  apiLimiter,
  authLimiter,
};
