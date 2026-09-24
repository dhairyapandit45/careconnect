/**
 * Customer Booking Routes
 * Mounted at /api/v1/bookings
 */

const express = require('express');
const {
  listCustomerBookings,
  getCustomerBookingById,
  cancelCustomerBooking,
} = require('../../controllers/booking.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { cancelBookingSchema } = require('../../validators/booking.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

// All customer booking routes require CUSTOMER authentication
router.use(authenticate);
router.use(authorize(ROLES.CUSTOMER));

router.get('/', listCustomerBookings);
router.get('/:id', getCustomerBookingById);
router.post('/:id/cancel', validate(cancelBookingSchema), cancelCustomerBooking);

module.exports = router;
