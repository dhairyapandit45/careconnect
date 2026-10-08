/**
 * Platform Administration Routes
 * Protected by server-side RBAC for administrative & operations roles.
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

// Enforce authentication on all administrative endpoints
router.use(authenticate);

// Role authorization levels
const ADMIN_AND_OPS = [ROLES.PLATFORM_ADMIN, ROLES.OPERATIONS_MANAGER];
const STAFF_ALL = [ROLES.PLATFORM_ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.SUPPORT_AGENT];

/**
 * Platform & Dashboard Statistics
 */
router.get('/dashboard', authorize(...ADMIN_AND_OPS), validate(statsQuerySchema, 'query'), getDashboardStats);
router.get('/stats', authorize(...ADMIN_AND_OPS), validate(statsQuerySchema, 'query'), getDashboardStats);

/**
 * User Management Endpoints
 */
router.get('/users', authorize(...ADMIN_AND_OPS), validate(userQuerySchema, 'query'), listUsers);
router.get('/users/:id', authorize(...ADMIN_AND_OPS), getUserById);
router.patch(
  '/users/:id/status',
  authorize(...ADMIN_AND_OPS),
  validate(updateUserStatusSchema, 'body'),
  updateUserStatus
);

/**
 * Provider Verification & Review Console Endpoints
 */
router.get('/providers', authorize(...ADMIN_AND_OPS), listProviders);
router.get('/providers/:id', authorize(...ADMIN_AND_OPS), getProviderById);
router.patch(
  '/providers/:id/verification',
  authorize(...ADMIN_AND_OPS),
  validate(verifyProviderSchema, 'body'),
  verifyProvider
);

/**
 * Booking Operational Oversight Endpoints
 */
router.get('/bookings', authorize(...ADMIN_AND_OPS), validate(bookingQuerySchema, 'query'), listBookings);
router.get('/bookings/:id', authorize(...ADMIN_AND_OPS), getBookingById);

/**
 * Job Operational Oversight Endpoints
 */
router.get('/jobs', authorize(...ADMIN_AND_OPS), validate(jobQuerySchema, 'query'), listJobs);
router.get('/jobs/:id', authorize(...ADMIN_AND_OPS), getJobById);

/**
 * Dispute Oversight Endpoints (Accessible to Platform Admin, Ops Manager, Support Agent)
 */
router.get('/disputes', authorize(...STAFF_ALL), listDisputes);
router.get('/disputes/:id', authorize(...STAFF_ALL), getDisputeById);

/**
 * Support Ticket Oversight Endpoints (Accessible to Platform Admin, Ops Manager, Support Agent)
 */
router.get('/tickets', authorize(...STAFF_ALL), listTickets);
router.get('/tickets/:id', authorize(...STAFF_ALL), getTicketById);
router.get('/support-tickets', authorize(...STAFF_ALL), listTickets);
router.get('/support-tickets/:id', authorize(...STAFF_ALL), getTicketById);

module.exports = router;
