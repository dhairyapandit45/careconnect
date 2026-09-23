/**
 * ServiceRequest Controller
 */

const serviceRequestService = require('../services/serviceRequest.service');
const { sendSuccess } = require('../utils/apiResponse');

const createServiceRequest = async (req, res, next) => {
  try {
    const request = await serviceRequestService.createServiceRequest(req.user._id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Service request created successfully',
      data: { request, serviceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const getServiceRequests = async (req, res, next) => {
  try {
    const result = await serviceRequestService.listServiceRequests(req.user, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Service requests retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getServiceRequestById = async (req, res, next) => {
  try {
    const request = await serviceRequestService.getServiceRequestById(req.user, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Service request details retrieved',
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
};
