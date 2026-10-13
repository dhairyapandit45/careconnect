/**
 * Analytics Routes
 * Exposes platform analytics endpoints protected by server-side RBAC
 * for PLATFORM_ADMIN and OPERATIONS_MANAGER.
 */

const express = require('express');
const { authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');
const { validate } = require('../../middleware/validate.middleware');
const { analyticsQuerySchema } = require('../../validators/analytics.validator');

const {
  getOverview,
  getBookingTrends,
  getRevenueTrends,
  getProviderPerformance,
  getCategoryDemand,
  getDisputeTrends,
  getSupportTrends,
} = require('../../controllers/analytics.controller');

const router = express.Router();

// Authorize Platform Admin and Operations Manager
router.use(authorize(ROLES.PLATFORM_ADMIN, ROLES.OPERATIONS_MANAGER));

// Apply analytics query validation to all GET endpoints
router.use(validate(analyticsQuerySchema, 'query'));

/**
 * Platform Overview Analytics
 * GET /api/v1/admin/analytics/overview or /api/v1/operations/analytics/overview
 */
router.get('/', getOverview);
router.get('/overview', getOverview);

/**
 * Booking Trends Analytics
 * GET /api/v1/admin/analytics/bookings or /api/v1/operations/analytics/bookings
 */
router.get('/bookings', getBookingTrends);

/**
 * Revenue Trends Analytics
 * GET /api/v1/admin/analytics/revenue or /api/v1/operations/analytics/revenue
 */
router.get('/revenue', getRevenueTrends);

/**
 * Provider Performance Analytics
 * GET /api/v1/admin/analytics/providers or /api/v1/operations/analytics/providers
 */
router.get('/providers', getProviderPerformance);

/**
 * Category Demand Analytics
 * GET /api/v1/admin/analytics/categories or /api/v1/operations/analytics/categories
 */
router.get('/categories', getCategoryDemand);

/**
 * Dispute Analytics
 * GET /api/v1/admin/analytics/disputes or /api/v1/operations/analytics/disputes
 */
router.get('/disputes', getDisputeTrends);

/**
 * Support Ticket Analytics
 * GET /api/v1/admin/analytics/support or /api/v1/operations/analytics/support
 */
router.get('/support', getSupportTrends);

module.exports = router;
