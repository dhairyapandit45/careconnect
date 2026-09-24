/**
 * Primary API v1 Router
 * Mounts domain modules and establishes versioned routing structure.
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const categoryRoutes = require('./category.routes');
const serviceRequestRoutes = require('./serviceRequest.routes');
const providerRoutes = require('./provider.routes');
const providerRequestRoutes = require('./providerRequest.routes');
const quoteRoutes = require('./quote.routes');
const availabilityRoutes = require('./availability.routes');
const bookingRoutes = require('./booking.routes');
const { sendSuccess } = require('../../utils/apiResponse');

const router = express.Router();

// Mount active route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.use('/providers', providerRoutes);
router.use('/provider-requests', providerRequestRoutes);
router.use('/quotes', quoteRoutes);
router.use('/availability', availabilityRoutes);
router.use('/bookings', bookingRoutes);

// Helper for planned route group placeholders
const createPlaceholderRouter = (resourceName) => {
  const subRouter = express.Router();
  subRouter.all('*', (req, res) => {
    return sendSuccess(res, {
      statusCode: 200,
      message: `CareConnect API v1: [${resourceName}] route registered. Endpoint implementation scheduled in upcoming sprint.`,
      data: {
        resource: resourceName,
        path: req.path,
        method: req.method,
      },
    });
  });
  return subRouter;
};

// Planned route groups
router.use('/users', createPlaceholderRouter('users'));
router.use('/jobs', createPlaceholderRouter('jobs'));
router.use('/invoices', createPlaceholderRouter('invoices'));
router.use('/reviews', createPlaceholderRouter('reviews'));
router.use('/disputes', createPlaceholderRouter('disputes'));
router.use('/notifications', createPlaceholderRouter('notifications'));

module.exports = router;
