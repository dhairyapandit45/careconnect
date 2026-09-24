/**
 * Provider Eligible Requests Controller
 * Provides feed and detail views of service requests matching provider capabilities and territory.
 */

const { sendSuccess } = require('../utils/apiResponse');
const providerEligibilityService = require('../services/providerEligibility.service');

const getEligibleRequests = async (req, res, next) => {
  try {
    const result = await providerEligibilityService.listEligibleRequestsForProvider(
      req.user._id,
      req.query
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Eligible service requests retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getEligibleRequestById = async (req, res, next) => {
  try {
    const request = await providerEligibilityService.getEligibleRequestDetail(
      req.user._id,
      req.params.id
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Eligible service request details retrieved successfully',
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEligibleRequests,
  getEligibleRequestById,
};
