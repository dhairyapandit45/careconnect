/**
 * Authentication and RBAC Authorization Middleware
 * Validates JWT signatures and enforces role-based access boundaries.
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
    if (!token || token.trim() === '') {
      return next(ApiError.unauthorized('Authentication token missing'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return next(ApiError.unauthorized('Invalid token payload'));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists'));
    }

    // Reject non-active accounts
    if (user.status === USER_STATUS.SUSPENDED) {
      return next(ApiError.forbidden('Your account has been suspended. Please contact support.'));
    }

    if (user.status === USER_STATUS.INACTIVE) {
      return next(ApiError.forbidden('Your account is inactive. Please contact support.'));
    }

    if (user.status === USER_STATUS.PENDING) {
      return next(ApiError.forbidden('Your account is pending verification.'));
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
 * Checks if user has a specific granular permission
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

/**
 * Optional authentication middleware: attaches user if valid JWT is present,
 * but does not reject request if token is missing.
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return next();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (userId) {
      const user = await User.findById(userId);
      if (user && user.status === USER_STATUS.ACTIVE) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  requirePermission,
};
