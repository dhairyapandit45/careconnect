/**
 * Authentication Controller
 * Thin controller layer passing requests to AuthService and returning formatted responses.
 */

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile retrieved successfully',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  // In JWT stateless architecture, client destroys stored token.
  // Endpoint allows client confirmation and future server-side token revocation/blacklist.
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logout successful',
    data: {},
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
