/**
 * Structured Logger Abstraction
 * Formats logs cleanly in development and provides structured JSON in production.
 */

const { env } = require('../config/env');

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  if (env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  }

  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const colors = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    RESET: '\x1b[0m',
  };

  const color = colors[level] || colors.RESET;
  return `${color}[${timestamp}] [${level}]${colors.RESET}: ${message}${metaStr}`;
};

const logger = {
  debug: (message, meta) => {
    if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
      console.debug(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  },
  info: (message, meta) => {
    if (env.NODE_ENV !== 'test') {
      console.info(formatLog(LOG_LEVELS.INFO, message, meta));
    }
  },
  warn: (message, meta) => {
    console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
  },
  error: (message, meta) => {
    console.error(formatLog(LOG_LEVELS.ERROR, message, meta));
  },
};

module.exports = {
  logger,
};
