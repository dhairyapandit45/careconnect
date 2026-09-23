/**
 * Authentication Routes
 */

const express = require('express');
const { register, login, getCurrentUser, logout } = require('../../controllers/auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../../validators/auth.validator');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();

// Apply auth rate limiter
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

module.exports = router;
