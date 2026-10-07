/**
 * Review Routes
 * Handles review submissions, role-specific listings, updates, and moderation.
 */

const express = require('express');
const {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  listCustomerReviews,
  listProviderReviews,
  listAdminReviews,
} = require('../../controllers/review.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createReviewSchema,
  updateReviewSchema,
} = require('../../validators/review.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

// Provider routes (prefixed with /provider)
router.get(
  '/provider',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  listProviderReviews
);
router.get(
  '/provider/:id',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  getReviewById
);

// Admin routes (prefixed with /admin)
router.get(
  '/admin',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  listAdminReviews
);
router.get(
  '/admin/:id',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  getReviewById
);

// Customer endpoints
router.post(
  '/',
  authenticate,
  authorize(ROLES.CUSTOMER),
  validate(createReviewSchema),
  createReview
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.CUSTOMER),
  listCustomerReviews
);

router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.CUSTOMER),
  validate(updateReviewSchema),
  updateReview
);

// Admin deletion / moderation
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  deleteReview
);

// Shared review detail route
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.SERVICE_PROVIDER, ROLES.PLATFORM_ADMIN),
  getReviewById
);

module.exports = router;
