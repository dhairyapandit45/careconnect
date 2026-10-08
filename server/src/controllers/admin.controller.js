/**
 * Admin & Operations Controller
 * Handles administrative and operational actions across users, providers, bookings,
 * jobs, disputes, support tickets, and platform metrics.
 */

const adminService = require('../services/admin.service');
const providerService = require('../services/provider.service');
const disputeService = require('../services/dispute.service');
const supportTicketService = require('../services/supportTicket.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/v1/admin/stats or /api/v1/operations/stats or /api/v1/admin/dashboard
 * Aggregates platform operational & financial statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getPlatformStatistics(req.query);
    stats.systemStatus = 'HEALTHY';
    stats.activeRole = req.user?.role;
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Platform statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/users
 * Lists platform users with filters, search, and pagination
 */
const listUsers = async (req, res, next) => {
  try {
    const result = await adminService.listUsers(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/users/:id
 * Retrieves a single user profile without passwordHash
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/status
 * Updates user account status with role checks
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const user = await adminService.updateUserStatus(req.user, req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: `User status updated to ${user.status}`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/providers or /api/v1/operations/providers
 * Lists service providers
 */
const listProviders = async (req, res, next) => {
  try {
    const result = await providerService.listProvidersAdmin(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider list retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/providers/:id or /api/v1/operations/providers/:id
 * Retrieves provider profile details
 */
const getProviderById = async (req, res, next) => {
  try {
    const profile = await providerService.getProviderProfileById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider profile retrieved successfully',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/providers/:id/verification or /api/v1/operations/providers/:id/verification
 * Reviews and updates provider verification status
 */
const verifyProvider = async (req, res, next) => {
  try {
    const profile = await providerService.verifyProviderAdmin(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Provider verification status updated to ${profile.verificationStatus}`,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/bookings or /api/v1/operations/bookings
 * Operational inspection of bookings
 */
const listBookings = async (req, res, next) => {
  try {
    const result = await adminService.listBookingsOperational(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Operational bookings retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/bookings/:id or /api/v1/operations/bookings/:id
 * Operational inspection of single booking
 */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await adminService.getBookingByIdOperational(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Booking details retrieved successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/jobs or /api/v1/operations/jobs
 * Operational inspection of jobs
 */
const listJobs = async (req, res, next) => {
  try {
    const result = await adminService.listJobsOperational(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Operational jobs retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/jobs/:id or /api/v1/operations/jobs/:id
 * Operational inspection of single job
 */
const getJobById = async (req, res, next) => {
  try {
    const job = await adminService.getJobByIdOperational(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job details retrieved successfully',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/disputes or /api/v1/operations/disputes
 * Lists disputes for operations & support staff
 */
const listDisputes = async (req, res, next) => {
  try {
    const result = await disputeService.listDisputes(req.user, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Disputes retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/disputes/:id or /api/v1/operations/disputes/:id
 * Retrieves dispute details
 */
const getDisputeById = async (req, res, next) => {
  try {
    const dispute = await disputeService.getDisputeById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dispute retrieved successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/tickets or /api/v1/operations/tickets
 * Lists support tickets for operations & support staff
 */
const listTickets = async (req, res, next) => {
  try {
    const result = await supportTicketService.listTickets(req.user, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support tickets retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/tickets/:id or /api/v1/operations/tickets/:id
 * Retrieves support ticket details
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.getTicketById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket retrieved successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  listUsers,
  getUserById,
  updateUserStatus,
  listProviders,
  getProviderById,
  verifyProvider,
  listBookings,
  getBookingById,
  listJobs,
  getJobById,
  listDisputes,
  getDisputeById,
  listTickets,
  getTicketById,
};
