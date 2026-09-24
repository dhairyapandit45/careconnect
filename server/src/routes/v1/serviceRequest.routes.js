/**
 * ServiceRequest Routes
 */

const express = require('express');
const {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
} = require('../../controllers/serviceRequest.controller');
const {
  createQuote,
  listQuotesForRequest,
  acceptQuote,
} = require('../../controllers/quote.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createServiceRequestSchema } = require('../../validators/serviceRequest.validator');
const { createQuoteSchema } = require('../../validators/quote.validator');
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

// Quote Management for this Service Request
router.post(
  '/:id/quotes',
  authorize(ROLES.SERVICE_PROVIDER),
  validate(createQuoteSchema),
  createQuote
);

router.get('/:id/quotes', listQuotesForRequest);

router.patch(
  '/:requestId/quotes/:quoteId/accept',
  authorize(ROLES.CUSTOMER),
  acceptQuote
);

module.exports = router;
