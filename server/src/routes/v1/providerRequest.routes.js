/**
 * Provider Requests Routes
 * Accessible only to verified, active SERVICE_PROVIDER accounts.
 */

const express = require('express');
const {
  getEligibleRequests,
  getEligibleRequestById,
} = require('../../controllers/providerRequest.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.SERVICE_PROVIDER));

// List eligible requests matching provider capabilities and territory
router.get('/', getEligibleRequests);

// Retrieve specific eligible request detail
router.get('/:id', getEligibleRequestById);

module.exports = router;
