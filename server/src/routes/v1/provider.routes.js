/**
 * Service Provider Routes
 */

const express = require('express');
const {
  getMyProfile,
  getProviderById,
  createProfile,
  updateProfile,
  getSkills,
} = require('../../controllers/provider.controller');
const {
  listProviderQuotes,
  getProviderQuoteById,
  withdrawQuote,
} = require('../../controllers/quote.controller');
const {
  listProviderBookings,
  getProviderBookingById,
  cancelProviderBooking,
} = require('../../controllers/booking.controller');
const { cancelBookingSchema } = require('../../validators/booking.validator');
const availabilityRoutes = require('./availability.routes');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createProviderProfileSchema,
  updateProviderProfileSchema,
} = require('../../validators/provider.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

// Public / discovery & capability routes
router.get('/skills', optionalAuthenticate, getSkills);

// Provider self-management routes
router.get(
  '/me',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  getMyProfile
);

router.post(
  '/profile',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  validate(createProviderProfileSchema),
  createProfile
);

router.patch(
  '/profile',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  validate(updateProviderProfileSchema),
  updateProfile
);

router.put(
  '/profile',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  validate(updateProviderProfileSchema),
  updateProfile
);

// Provider Availability Schedule Sub-Router
router.use('/availability', availabilityRoutes);

// Provider Quotes Management
router.get(
  '/quotes',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  listProviderQuotes
);

router.get(
  '/quotes/:id',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  getProviderQuoteById
);

router.patch(
  '/quotes/:id/withdraw',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  withdrawQuote
);

// Provider Bookings Management
router.get(
  '/bookings',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  listProviderBookings
);

router.get(
  '/bookings/:id',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  getProviderBookingById
);

router.post(
  '/bookings/:id/cancel',
  authenticate,
  authorize(ROLES.SERVICE_PROVIDER),
  validate(cancelBookingSchema),
  cancelProviderBooking
);

// Provider detail inspection (Safe public summary for customers/guests; full for owner/staff)
router.get('/:id', optionalAuthenticate, getProviderById);

module.exports = router;
