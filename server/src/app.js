/**
 * Express Application Pipeline Setup
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { env } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const v1Router = require('./routes/v1');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      const allowedOrigin = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/+$/, '') : '';
      const cleanOrigin = origin.replace(/\/+$/, '');
      try {
        const originUrl = new URL(origin);
        if (
          cleanOrigin === allowedOrigin ||
          originUrl.hostname === 'localhost' ||
          originUrl.hostname.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
      } catch {
        // Fallback for non-standard origins
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global API rate limiting
app.use('/api', apiLimiter);

// Mount API v1 router on /api/v1, /api, and root / to ensure all variations route correctly
app.use('/api/v1', v1Router);
app.use('/api', v1Router);
app.use('/', v1Router);

// 404 Not Found Middleware
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
