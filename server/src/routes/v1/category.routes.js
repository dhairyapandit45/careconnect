/**
 * ServiceCategory Routes
 */

const express = require('express');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../../controllers/category.controller');
const { authenticate, optionalAuthenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createCategorySchema,
  updateCategorySchema,
} = require('../../validators/category.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

// Public / Authenticated read access
router.get('/', optionalAuthenticate, getCategories);
router.get('/:id', optionalAuthenticate, getCategoryById);

// Platform Admin management routes
router.post(
  '/',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  validate(createCategorySchema),
  createCategory
);

router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  deleteCategory
);

module.exports = router;
