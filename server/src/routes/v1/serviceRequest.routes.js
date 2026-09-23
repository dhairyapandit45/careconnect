/**
 * ServiceRequest Routes
 */

const express = require('express');
const {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
} = require('../../controllers/serviceRequest.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createServiceRequestSchema } = require('../../validators/serviceRequest.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

// All service-request routes require authentication
router.use(authenticate);

// Customer request creation
router.post(
  '/',
  authorize(ROLES.CUSTOMER),
  validate(createServiceRequestSchema),
  createServiceRequest
);

// List requests (Ownership isolated in service layer)
router.get('/', getServiceRequests);

// Get single request details
router.get('/:id', getServiceRequestById);

module.exports = router;
