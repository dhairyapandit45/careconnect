/**
 * Standard API Response Builder
 * Ensures uniform response payloads across all REST endpoints.
 */

const sendSuccess = (res, { statusCode = 200, message = 'Operation successful', data = {} }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, { statusCode = 500, message = 'Something went wrong', code = 'INTERNAL_SERVER_ERROR', details = [] }) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
