/**
 * Authentication Business Logic Service
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../utils/apiError');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { ROLES } = require('../constants/roles');
const { USER_STATUS } = require('../constants/status');

/**
 * Generates a signed JWT for the user
 * @param {Object} user
 * @returns {string}
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
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

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.duplicate('An account with this email address already exists');
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    phone,
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
    user,
    token,
  };
};

/**
 * Authenticates user credentials and issues token
 * @param {string} email
 * @param {string} password
 */
const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.');
  }

  const token = generateToken(user);

  // Exclude passwordHash from returned object
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
  return user;
};

module.exports = {
  generateToken,
  registerUser,
  loginUser,
  getUserById,
};
