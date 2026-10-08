/**
 * Operations Management Routes
 * Protected by server-side RBAC for operational staff (OPERATIONS_MANAGER, PLATFORM_ADMIN, SUPPORT_AGENT).
 */

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');
const { validate } = require('../../middleware/validate.middleware');

const {
  updateUserStatusSchema,
  userQuerySchema,
  bookingQuerySchema,
  jobQuerySchema,
  statsQuerySchema,
} = require('../../validators/admin.validator');
const { verifyProviderSchema } = require('../../validators/provider.validator');

const {
  getDashboardStats,
  listUsers,
  getUserById,
  updateUserStatus,
  listProviders,
  getProviderById,
  verifyProvider,
  listBookings,
  getBookingById,
  listJobs,
  getJobById,
  listDisputes,
  getDisputeById,
  listTickets,
  getTicketById,
} = require('../../controllers/admin.controller');

const router = express.Router();

// Enforce authentication on all operations endpoints
router.use(authenticate);

// Role authorization levels
const OPS_AND_ADMIN = [ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN];
const STAFF_ALL = [ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN, ROLES.SUPPORT_AGENT];

/**
 * Operations & Platform Statistics
 */
router.get('/stats', authorize(...OPS_AND_ADMIN), validate(statsQuerySchema, 'query'), getDashboardStats);

/**
 * User Operational Management Endpoints
 */
router.get('/users', authorize(...OPS_AND_ADMIN), validate(userQuerySchema, 'query'), listUsers);
router.get('/users/:id', authorize(...OPS_AND_ADMIN), getUserById);
router.patch(
  '/users/:id/status',
  authorize(...OPS_AND_ADMIN),
  validate(updateUserStatusSchema, 'body'),
  updateUserStatus
);

/**
 * Provider Operational Review Endpoints
 */
router.get('/providers', authorize(...OPS_AND_ADMIN), listProviders);
router.get('/providers/:id', authorize(...OPS_AND_ADMIN), getProviderById);
router.patch(
  '/providers/:id/verification',
  authorize(...OPS_AND_ADMIN),
  validate(verifyProviderSchema, 'body'),
  verifyProvider
);

/**
 * Booking Operational Inspection Endpoints
 */
router.get('/bookings', authorize(...OPS_AND_ADMIN), validate(bookingQuerySchema, 'query'), listBookings);
router.get('/bookings/:id', authorize(...OPS_AND_ADMIN), getBookingById);

/**
 * Job Operational Inspection Endpoints
 */
router.get('/jobs', authorize(...OPS_AND_ADMIN), validate(jobQuerySchema, 'query'), listJobs);
router.get('/jobs/:id', authorize(...OPS_AND_ADMIN), getJobById);

/**
 * Dispute Oversight Endpoints (Operations Manager, Platform Admin, Support Agent)
 */
router.get('/disputes', authorize(...STAFF_ALL), listDisputes);
router.get('/disputes/:id', authorize(...STAFF_ALL), getDisputeById);

/**
 * Support Ticket Oversight Endpoints (Operations Manager, Platform Admin, Support Agent)
 */
router.get('/tickets', authorize(...STAFF_ALL), listTickets);
router.get('/tickets/:id', authorize(...STAFF_ALL), getTicketById);
router.get('/support-tickets', authorize(...STAFF_ALL), listTickets);
router.get('/support-tickets/:id', authorize(...STAFF_ALL), getTicketById);

module.exports = router;
