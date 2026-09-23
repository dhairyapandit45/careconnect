/**
 * Authentication Business Logic Service
 * Enforces security validations, credential hashing, and token issuance.
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../utils/apiError');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { ROLES } = require('../constants/roles');
const { USER_STATUS } = require('../constants/status');

/**
 * Generates a signed JWT with minimal principal metadata
 * Excludes sensitive personal information (email, phone, name)
 * @param {Object} user
 * @returns {string}
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * Registers a new user account
 * @param {Object} userData
 */
const registerUser = async (userData) => {
  const { name, email, password, phone, role } = userData;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.duplicate('An account with this email address already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password,
    phone: phone ? phone.trim() : '',
    role: role || ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE,
  });

  // If registering as service provider, create associated profile placeholder
  if (user.role === ROLES.SERVICE_PROVIDER) {
    await ProviderProfile.create({
      user: user._id,
      businessName: `${user.name}'s Services`,
    });
  }

  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Authenticates user credentials and issues token
 * Rejects inactive, suspended, or pending verification accounts
 * @param {string} email
 * @param {string} password
 */
const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Account status security boundary
  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.');
  }

  if (user.status === USER_STATUS.INACTIVE) {
    throw ApiError.forbidden('Your account is currently inactive. Please contact support.');
  }

  if (user.status === USER_STATUS.PENDING) {
    throw ApiError.forbidden('Your account is pending verification. Please check your verification status.');
  }

  const token = generateToken(user);
  const userObject = user.toJSON();

  return {
    user: userObject,
    token,
  };
};

/**
 * Retrieves user by ID
 * @param {string} userId
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user.toJSON();
};

module.exports = {
  generateToken,
  registerUser,
  loginUser,
  getUserById,
};
