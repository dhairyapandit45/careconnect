// Job Controller - handles Job endpoints
const jobService = require('../services/job.service');
const { sendSuccess } = require('../utils/apiResponse');

// Get a single Job by ID (accessible by both customer and provider)
const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id, ['booking', 'provider', 'customer']);
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
