/**
 * Support Ticket Routes
 * REST routes for ticket submission, conversation messages, assignment, priority, and status transitions.
 */

const express = require('express');
const {
  createTicket,
  getTicketById,
  listTickets,
  addMessage,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  closeTicket,
} = require('../../controllers/supportTicket.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
  updateTicketPrioritySchema,
  assignTicketSchema,
  closeTicketSchema,
} = require('../../validators/supportTicket.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

const ALL_ROLES_ARRAY = [
  ROLES.CUSTOMER,
  ROLES.SERVICE_PROVIDER,
  ROLES.SUPPORT_AGENT,
  ROLES.OPERATIONS_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

const STAFF_ROLES_ARRAY = [
  ROLES.SUPPORT_AGENT,
  ROLES.OPERATIONS_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

// Create new support ticket
router.post(
  '/',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  validate(createTicketSchema),
  createTicket
);

// List tickets (scoped by caller role in service)
router.get(
  '/',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  listTickets
);

// Append reply or staff note
router.post(
  '/:id/messages',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  validate(addMessageSchema),
  addMessage
);

router.post(
  '/:id/reply',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  validate(addMessageSchema),
  addMessage
);

// Update status (staff, or customer/provider closing)
router.patch(
  '/:id/status',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  validate(updateTicketStatusSchema),
  updateTicketStatus
);

// Update priority (staff only)
router.patch(
  '/:id/priority',
  authenticate,
  authorize(...STAFF_ROLES_ARRAY),
  validate(updateTicketPrioritySchema),
  updateTicketPriority
);

// Assign / reassign ticket (staff only)
router.patch(
  '/:id/assign',
  authenticate,
  authorize(...STAFF_ROLES_ARRAY),
  validate(assignTicketSchema),
  assignTicket
);

// Close ticket
router.patch(
  '/:id/close',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  validate(closeTicketSchema),
  closeTicket
);

// Retrieve single ticket details
router.get(
  '/:id',
  authenticate,
  authorize(...ALL_ROLES_ARRAY),
  getTicketById
);

module.exports = router;
