/**
 * Health Check Controller
 * Verifies API server responsiveness and operational status.
 */

const { sendSuccess } = require('../utils/apiResponse');

const getHealthStatus = (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'CareConnect API is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

module.exports = {
  getHealthStatus,
};
