/**
 * Integration & Unit Tests: Rate Limiting & Demo Mode Architecture
 *
 * Validates:
 * 1. Standard mode defaults (100 API, 20 Auth)
 * 2. Demo mode defaults (1500 API, 100 Auth)
 * 3. Environment overrides (RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX)
 * 4. Route exclusions (health checks and auth login/register on apiLimiter)
 * 5. Independent limiter budgets (general API exhaustion does not lock out auth or health)
 * 6. Standardized HTTP 429 responses and error payloads
 * 7. Trusted proxy configuration (trust proxy = 1) and IP-based rate limiting
 */

const express = require('express');
const request = require('supertest');
const { validateEnv } = require('../src/config/env');
const {
  createApiLimiter,
  createAuthLimiter,
  shouldSkipApiLimiter,
} = require('../src/middleware/rateLimiter.middleware');
const { ERROR_CODES } = require('../src/constants/errorCodes');
const app = require('../src/app');

describe('Rate Limiting & Demo Mode Architecture', () => {
  // --------------------------------------------------------------------------
  // 1. Environment Configuration & Profiles
  // --------------------------------------------------------------------------
  describe('Environment Configuration & Dynamic Profiles', () => {
    it('should default to standard mode with 100 API and 20 Auth limits when DEMO_MODE is false or unset', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'test_jwt_secret_key_at_least_16_chars',
      });

      expect(config.DEMO_MODE).toBe(false);
      expect(config.RATE_LIMIT_MAX).toBe(100);
      expect(config.AUTH_RATE_LIMIT_MAX).toBe(20);
      expect(config.RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
      expect(config.AUTH_RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
    });

    it('should configure demo mode with 1500 API and 100 Auth limits when DEMO_MODE is true', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'test_jwt_secret_key_at_least_16_chars',
        DEMO_MODE: 'true',
      });

      expect(config.DEMO_MODE).toBe(true);
      expect(config.RATE_LIMIT_MAX).toBe(1500);
      expect(config.AUTH_RATE_LIMIT_MAX).toBe(100);
      expect(config.RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
      expect(config.AUTH_RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
    });

    it('should accept numeric string "1" as truthy DEMO_MODE', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'test_jwt_secret_key_at_least_16_chars',
        DEMO_MODE: '1',
      });

      expect(config.DEMO_MODE).toBe(true);
      expect(config.RATE_LIMIT_MAX).toBe(1500);
      expect(config.AUTH_RATE_LIMIT_MAX).toBe(100);
    });

    it('should prioritize explicit RATE_LIMIT_MAX over standard or demo defaults', () => {
      const standardOverride = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'test_jwt_secret_key_at_least_16_chars',
        DEMO_MODE: 'false',
        RATE_LIMIT_MAX: '250',
      });
      expect(standardOverride.RATE_LIMIT_MAX).toBe(250);
      expect(standardOverride.AUTH_RATE_LIMIT_MAX).toBe(20);

      const demoOverride = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'test_jwt_secret_key_at_least_16_chars',
        DEMO_MODE: 'true',
        RATE_LIMIT_MAX: '3000',
      });
      expect(demoOverride.RATE_LIMIT_MAX).toBe(3000);
      expect(demoOverride.AUTH_RATE_LIMIT_MAX).toBe(100);
    });

    it('should prioritize explicit AUTH_RATE_LIMIT_MAX over standard or demo defaults', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        JWT_SECRET: 'test_jwt_secret_key_at_least_16_chars',
        DEMO_MODE: 'true',
        AUTH_RATE_LIMIT_MAX: '150',
      });

      expect(config.AUTH_RATE_LIMIT_MAX).toBe(150);
      expect(config.RATE_LIMIT_MAX).toBe(1500);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Route Exclusion Logic
  // --------------------------------------------------------------------------
  describe('Route Exclusion Logic (shouldSkipApiLimiter)', () => {
    it('should skip health check variations so monitors and status checks do not consume rate limit', () => {
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/health' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/health' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/health' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/health/' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/health?check=ready' })).toBe(true);
    });

    it('should skip auth login and register so navigation does not consume login attempt budget', () => {
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/auth/login' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/auth/login' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/auth/login' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/auth/login/' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/auth/register' })).toBe(true);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/auth/register' })).toBe(true);
    });

    it('should NOT skip general authenticated endpoints or data endpoints', () => {
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/auth/me' })).toBe(false);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/categories' })).toBe(false);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/bookings' })).toBe(false);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/admin/analytics/overview' })).toBe(false);
      expect(shouldSkipApiLimiter({ originalUrl: '/api/v1/providers' })).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. HTTP 429 Enforcement & Response Formats
  // --------------------------------------------------------------------------
  describe('HTTP 429 Enforcement & Standard Response Payloads', () => {
    it('should enforce general API limit and return standard 429 payload when exceeded', async () => {
      const testApp = express();
      const limiter = createApiLimiter({
        forceEnable: true,
        max: 2,
        windowMs: 60000,
      });

      testApp.use('/api', limiter);
      testApp.get('/api/test', (req, res) => res.json({ success: true, message: 'ok' }));

      // Request 1: allowed
      const res1 = await request(testApp).get('/api/test');
      expect(res1.status).toBe(200);

      // Request 2: allowed
      const res2 = await request(testApp).get('/api/test');
      expect(res2.status).toBe(200);

      // Request 3: blocked
      const res3 = await request(testApp).get('/api/test');
      expect(res3.status).toBe(429);
      expect(res3.body).toEqual({
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.',
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: [],
        },
      });
      expect(res3.headers['ratelimit-limit']).toBe('2');
      expect(res3.headers['ratelimit-remaining']).toBe('0');
    });

    it('should enforce auth limiter and return dedicated auth 429 payload when exceeded', async () => {
      const testApp = express();
      const authLimiter = createAuthLimiter({
        forceEnable: true,
        max: 2,
        windowMs: 60000,
      });

      testApp.post('/auth/login', authLimiter, (req, res) => res.json({ success: true }));

      // Attempt 1: allowed
      const res1 = await request(testApp).post('/auth/login');
      expect(res1.status).toBe(200);

      // Attempt 2: allowed
      const res2 = await request(testApp).post('/auth/login');
      expect(res2.status).toBe(200);

      // Attempt 3: blocked
      const res3 = await request(testApp).post('/auth/login');
      expect(res3.status).toBe(429);
      expect(res3.body).toEqual({
        success: false,
        message: 'Too many authentication attempts, please try again in 15 minutes.',
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: [],
        },
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. Independent Limiter Budgets & Pipeline Integration
  // --------------------------------------------------------------------------
  describe('Independent Limiter Budgets (Separation of Concerns)', () => {
    it('should ensure exhausting the general API limiter does NOT block health checks or login attempts', async () => {
      const testApp = express();
      const apiLimiter = createApiLimiter({
        forceEnable: true,
        max: 2,
        windowMs: 60000,
      });
      const authLimiter = createAuthLimiter({
        forceEnable: true,
        max: 5,
        windowMs: 60000,
      });

      // Pipeline mirroring production app.js
      testApp.use('/api', apiLimiter);

      // Routes
      testApp.get('/api/v1/health', (req, res) => res.json({ success: true, service: 'health' }));
      testApp.get('/api/v1/categories', (req, res) => res.json({ success: true, service: 'categories' }));
      testApp.post('/api/v1/auth/login', authLimiter, (req, res) => res.json({ success: true, service: 'login' }));

      // Exhaust general API limit (2 requests to /categories)
      const cat1 = await request(testApp).get('/api/v1/categories');
      expect(cat1.status).toBe(200);

      const cat2 = await request(testApp).get('/api/v1/categories');
      expect(cat2.status).toBe(200);

      // 3rd request to /categories is rate limited (429)
      const cat3 = await request(testApp).get('/api/v1/categories');
      expect(cat3.status).toBe(429);
      expect(cat3.body.message).toMatch(/Too many requests from this IP/);

      // Health check should STILL return 200 (excluded from apiLimiter)
      const healthRes = await request(testApp).get('/api/v1/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.service).toBe('health');

      // Login endpoint should STILL succeed (excluded from apiLimiter, has its own budget)
      const loginRes1 = await request(testApp).post('/api/v1/auth/login');
      expect(loginRes1.status).toBe(200);
      expect(loginRes1.body.service).toBe('login');

      const loginRes2 = await request(testApp).post('/api/v1/auth/login');
      expect(loginRes2.status).toBe(200);
    });

    it('should ensure authentication attempts do NOT exhaust or increment the general API limiter', async () => {
      const testApp = express();
      const apiLimiter = createApiLimiter({
        forceEnable: true,
        max: 2,
        windowMs: 60000,
      });
      const authLimiter = createAuthLimiter({
        forceEnable: true,
        max: 1,
        windowMs: 60000,
      });

      testApp.use('/api', apiLimiter);
      testApp.get('/api/v1/categories', (req, res) => res.json({ success: true }));
      testApp.post('/api/v1/auth/login', authLimiter, (req, res) => res.json({ success: true }));

      // Exhaust auth attempts (1 login request)
      const auth1 = await request(testApp).post('/api/v1/auth/login');
      expect(auth1.status).toBe(200);

      // 2nd login is blocked by authLimiter
      const auth2 = await request(testApp).post('/api/v1/auth/login');
      expect(auth2.status).toBe(429);
      expect(auth2.body.message).toMatch(/Too many authentication attempts/);

      // General API endpoint (/categories) should STILL have its full budget
      const cat1 = await request(testApp).get('/api/v1/categories');
      expect(cat1.status).toBe(200);

      const cat2 = await request(testApp).get('/api/v1/categories');
      expect(cat2.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Trusted Proxy & Client IP Isolation
  // --------------------------------------------------------------------------
  describe('Trusted Proxy & Client IP Isolation', () => {
    it('should have trust proxy configured to 1 in main Express app', () => {
      expect(app.get('trust proxy')).toBe(1);
    });

    it('should isolate rate limit buckets by client IP when running behind trusted proxy', async () => {
      const proxyApp = express();
      proxyApp.set('trust proxy', 1);

      const limiter = createApiLimiter({
        forceEnable: true,
        max: 1,
        windowMs: 60000,
      });

      proxyApp.use('/api', limiter);
      proxyApp.get('/api/data', (req, res) => res.json({ ip: req.ip }));

      // Client A exhausts their quota (1 request)
      const resA1 = await request(proxyApp)
        .get('/api/data')
        .set('X-Forwarded-For', '203.0.113.10');
      expect(resA1.status).toBe(200);

      const resA2 = await request(proxyApp)
        .get('/api/data')
        .set('X-Forwarded-For', '203.0.113.10');
      expect(resA2.status).toBe(429);

      // Client B from different IP is NOT blocked
      const resB1 = await request(proxyApp)
        .get('/api/data')
        .set('X-Forwarded-For', '198.51.100.25');
      expect(resB1.status).toBe(200);

      // Client B second request is blocked
      const resB2 = await request(proxyApp)
        .get('/api/data')
        .set('X-Forwarded-For', '198.51.100.25');
      expect(resB2.status).toBe(429);
    });
  });
});
