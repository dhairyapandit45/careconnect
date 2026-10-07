/**
 * Dispute Routes
 * REST routes for dispute creation, inspection, cancellation, and admin resolution.
 */

const express = require('express');
const {
  createDispute,
  getDisputeById,
  listDisputes,
  cancelDispute,
  updateDisputeStatus,
} = require('../../controllers/dispute.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createDisputeSchema,
  updateDisputeStatusSchema,
  cancelDisputeSchema,
} = require('../../validators/dispute.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

const ALL_AUTHORIZED_DISPUTE_ROLES = [
  ROLES.CUSTOMER,
  ROLES.SERVICE_PROVIDER,
  ROLES.SUPPORT_AGENT,
  ROLES.OPERATIONS_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

const ADMIN_OPS_ROLES = [
  ROLES.SUPPORT_AGENT,
  ROLES.OPERATIONS_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

// Create dispute (Customers and Service Providers only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.SERVICE_PROVIDER),
  validate(createDisputeSchema),
  createDispute
);

// List disputes (scoped by role in service)
router.get(
  '/',
  authenticate,
  authorize(...ALL_AUTHORIZED_DISPUTE_ROLES),
  listDisputes
);

// Cancel dispute (Customer or Provider who raised it)
router.patch(
  '/:id/cancel',
  authenticate,
  authorize(...ALL_AUTHORIZED_DISPUTE_ROLES),
  validate(cancelDisputeSchema),
  cancelDispute
);

// Transition dispute status / resolve / reject (Admin and Operations staff only)
router.patch(
  '/:id/status',
  authenticate,
  authorize(...ADMIN_OPS_ROLES),
  validate(updateDisputeStatusSchema),
  updateDisputeStatus
);

router.patch(
  '/:id/resolve',
  authenticate,
  authorize(...ADMIN_OPS_ROLES),
  validate(updateDisputeStatusSchema),
  updateDisputeStatus
);

// Inspect single dispute details (with strict tenant boundaries)
router.get(
  '/:id',
  authenticate,
  authorize(...ALL_AUTHORIZED_DISPUTE_ROLES),
  getDisputeById
);

module.exports = router;
