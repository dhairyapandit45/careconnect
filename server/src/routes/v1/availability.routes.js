/**
 * Provider Availability Routes
 * Allows SERVICE_PROVIDER to configure weekly recurrence shifts and blocked dates.
 */

const express = require('express');
const {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} = require('../../controllers/availability.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createAvailabilitySchema,
  updateAvailabilitySchema,
} = require('../../validators/availability.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.SERVICE_PROVIDER));

router.get('/', getAvailability);
router.post('/', validate(createAvailabilitySchema), createAvailability);
router.patch('/:id', validate(updateAvailabilitySchema), updateAvailability);
router.delete('/:id', deleteAvailability);

module.exports = router;
