/**
 * Platform Administration Routes
 * Protected strictly by server-side RBAC for PLATFORM_ADMIN role.
 */

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');
const { sendSuccess } = require('../../utils/apiResponse');
const User = require('../../models/User');
const ProviderProfile = require('../../models/ProviderProfile');

const router = express.Router();

// Enforce authentication & PLATFORM_ADMIN authorization on all routes in this module
router.use(authenticate);
router.use(authorize(ROLES.PLATFORM_ADMIN));

/**
 * GET /api/v1/admin/dashboard
 * Administrative overview metrics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingVerifications = await ProviderProfile.countDocuments({
      verificationStatus: 'PENDING',
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin metrics retrieved successfully',
      data: {
        totalUsers,
        pendingVerifications,
        systemStatus: 'HEALTHY',
        activeRole: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users
 * Lists platform users
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().limit(50);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'User list retrieved',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
