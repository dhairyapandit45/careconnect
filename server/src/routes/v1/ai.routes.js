/**
 * AI Routes
 * Exposes intelligent classification and provider matching endpoints.
 * Protected with server-side authentication and role-based access control.
 */

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { ROLES } = require('../../constants/roles');
const {
  classifyRequestSchema,
  matchProvidersSchema,
} = require('../../validators/ai.validator');
const {
  classifyRequest,
  matchProviders,
} = require('../../controllers/ai.controller');

const router = express.Router();

// Require authentication for all AI capabilities
router.use(authenticate);

/**
 * Request Category Classification
 * POST /api/v1/ai/classify
 * Available to all authenticated users (Customers, Operations, Admins)
 */
router.post('/classify', validate(classifyRequestSchema), classifyRequest);

/**
 * Intelligent Explainable Provider Matching
 * POST /api/v1/ai/match-providers
 * Restricted to Customers requesting service and Operations/Platform Admins managing marketplace
 */
router.post(
  '/match-providers',
  authorize(ROLES.CUSTOMER, ROLES.PLATFORM_ADMIN, ROLES.OPERATIONS_MANAGER),
  validate(matchProvidersSchema),
  matchProviders
);

module.exports = router;
