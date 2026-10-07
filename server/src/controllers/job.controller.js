// Job Controller - handles Job endpoints
const jobService = require('../services/job.service');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/apiError');

// Get a single Job by ID (accessible by both customer and provider)
const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id, ['booking', 'provider', 'customer']);

    // Multi-tenant authorization boundary
    const userId = String(req.user._id);
    const customerId = String(job.customer?._id || job.customer);
    const providerId = String(job.provider?._id || job.provider);

    if (req.user.role === 'CUSTOMER') {
      if (customerId !== userId) {
        throw ApiError.forbidden('Access denied: You do not own this job');
      }
    } else if (req.user.role === 'SERVICE_PROVIDER') {
      if (providerId !== userId) {
        throw ApiError.forbidden('Access denied: You are not assigned to this job');
      }
    } else if (!['PLATFORM_ADMIN', 'OPERATIONS_MANAGER', 'SUPPORT_AGENT'].includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to access this job');
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job retrieved successfully',
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

// Customer: list their jobs
const listCustomerJobs = async (req, res, next) => {
  try {
    const result = await jobService.getCustomerJobs(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer jobs retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// Provider: list their jobs
const listProviderJobs = async (req, res, next) => {
  try {
    const result = await jobService.getProviderJobs(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider jobs retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// Provider actions
const checkIn = async (req, res, next) => {
  try {
    const job = await jobService.checkIn(req.params.id, req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider checked in successfully',
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

const start = async (req, res, next) => {
  try {
    const job = await jobService.start(req.params.id, req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job started successfully',
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

const complete = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const job = await jobService.complete(req.params.id, req.user._id, notes);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job completed successfully',
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

// Customer confirms job completion
const confirm = async (req, res, next) => {
  try {
    const job = await jobService.customerConfirm(req.params.id, req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer confirmed job completion',
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getJobById,
  listCustomerJobs,
  listProviderJobs,
  checkIn,
  start,
  complete,
  confirm,
};
