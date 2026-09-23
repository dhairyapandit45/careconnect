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

// Provider detail inspection (Safe public summary for customers/guests; full for owner/staff)
router.get('/:id', optionalAuthenticate, getProviderById);

module.exports = router;
