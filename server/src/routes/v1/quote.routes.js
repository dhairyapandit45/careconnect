/**
 * General Quotes Routes
 */

const express = require('express');
const {
  acceptQuote,
  withdrawQuote,
  getProviderQuoteById,
} = require('../../controllers/quote.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);

// Customer quote acceptance
router.patch('/:id/accept', authorize(ROLES.CUSTOMER), acceptQuote);

// Provider quote withdrawal
router.patch('/:id/withdraw', authorize(ROLES.SERVICE_PROVIDER), withdrawQuote);

// Single quote lookup
router.get('/:id', getProviderQuoteById);

module.exports = router;
