/**
 * Authentication and RBAC Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../utils/apiError');
const User = require('../models/User');
const { USER_STATUS } = require('../constants/status');
const { ROLE_PERMISSIONS } = require('../constants/roles');

/**
 * Verifies JWT token and attaches authenticated user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token missing or invalid format'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Authentication token missing'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists'));
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      return next(ApiError.forbidden('Your account has been suspended. Please contact support.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restricts access to specified roles
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User must be authenticated to access this resource'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied: Role [${req.user.role}] does not have required permissions`
        )
      );
    }

    next();
  };
};

/**
 * Checks if user has a specific permission
 * @param {string} permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!permissions.includes(permission)) {
      return next(
        ApiError.forbidden(
          `Access denied: Role [${req.user.role}] lacks permission [${permission}]`
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
};
