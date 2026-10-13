/**
 * Analytics Controller
 * Handles HTTP requests for platform analytics across bookings, revenue,
 * provider performance, service category demand, disputes, and support tickets.
 */

const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/admin/analytics/overview or /api/v1/operations/analytics/overview
 */
const getOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverviewAnalytics(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Analytics overview retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/bookings or /api/v1/operations/analytics/bookings
 */
const getBookingTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getBookingTrends(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Booking trends retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/revenue or /api/v1/operations/analytics/revenue
 */
const getRevenueTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getRevenueTrends(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Revenue trends retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/providers or /api/v1/operations/analytics/providers
 */
const getProviderPerformance = async (req, res, next) => {
  try {
    const data = await analyticsService.getProviderPerformance(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider performance metrics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/categories or /api/v1/operations/analytics/categories
 */
const getCategoryDemand = async (req, res, next) => {
  try {
    const data = await analyticsService.getCategoryDemand(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Category demand metrics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/disputes or /api/v1/operations/analytics/disputes
 */
const getDisputeTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getDisputeTrends(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dispute analytics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/support or /api/v1/operations/analytics/support
 */
const getSupportTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getSupportTrends(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket analytics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getBookingTrends,
  getRevenueTrends,
  getProviderPerformance,
  getCategoryDemand,
  getDisputeTrends,
  getSupportTrends,
};
