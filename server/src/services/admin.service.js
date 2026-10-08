/**
 * Admin & Operations Domain Service
 * Encapsulates administrative user management, operational inspection of bookings/jobs,
 * aggregation-driven platform analytics, and cross-domain audit logic.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const Dispute = require('../models/Dispute');
const SupportTicket = require('../models/SupportTicket');
const Invoice = require('../models/Invoice');

const { ROLES } = require('../constants/roles');
const {
  BOOKING_STATUS,
  JOB_STATUS,
  DISPUTE_STATUS,
  SUPPORT_TICKET_STATUS,
  INVOICE_STATUS,
  PROVIDER_VERIFICATION_STATUS,
  NOTIFICATION_TYPE,
} = require('../constants/status');
const { ApiError } = require('../utils/apiError');

/**
 * Lists platform users with filtering, search, and pagination
 * @param {Object} queryParams
 */
const listUsers = async (queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (queryParams.role) {
    filter.role = queryParams.role;
  }

  if (queryParams.status) {
    filter.status = queryParams.status;
  }

  const searchTerm = queryParams.search || queryParams.q;
  if (searchTerm && searchTerm.trim()) {
    const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single user profile without sensitive credentials
 * @param {string} userId
 */
const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest('Invalid user ID format');
  }

  const user = await User.findById(userId).select('-passwordHash -__v').lean();
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
};

/**
 * Updates a user's account status with strict RBAC boundary checks
 * @param {Object} actorUser - Authenticated caller
 * @param {string} targetUserId - Target user ID
 * @param {Object} payload - { status, reason }
 */
const updateUserStatus = async (actorUser, targetUserId, { status, reason }) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.badRequest('Invalid user ID format');
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  // Prevent Operations Manager from modifying Platform Admin accounts
  if (actorUser.role === ROLES.OPERATIONS_MANAGER) {
    if (targetUser.role === ROLES.PLATFORM_ADMIN) {
      throw ApiError.forbidden('Operations managers cannot modify platform administrator accounts');
    }
  }

  // Verify actor has permission to update status
  if (
    actorUser.role !== ROLES.PLATFORM_ADMIN &&
    actorUser.role !== ROLES.OPERATIONS_MANAGER
  ) {
    throw ApiError.forbidden('You do not have permission to update user account status');
  }

  targetUser.status = status;
  await targetUser.save();

  // Send asynchronous notification
  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: targetUser._id,
      type: NOTIFICATION_TYPE.ACCOUNT_STATUS_CHANGED,
      title: 'Account Status Updated',
      message: `Your account status has been updated to ${status}.${reason ? ` Reason: ${reason}` : ''}`,
    });
  } catch {
    // Non-blocking notification
  }

  const sanitized = targetUser.toObject();
  delete sanitized.passwordHash;
  delete sanitized.__v;

  return sanitized;
};

/**
 * Operational read: Lists bookings with filtering and pagination
 * @param {Object} queryParams
 */
const listBookingsOperational = async (queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (queryParams.status) {
    filter.status = queryParams.status;
  }

  if (queryParams.provider) {
    if (!mongoose.Types.ObjectId.isValid(queryParams.provider)) {
      throw ApiError.badRequest('Invalid provider ID format');
    }
    filter.provider = queryParams.provider;
  }

  if (queryParams.customer) {
    if (!mongoose.Types.ObjectId.isValid(queryParams.customer)) {
      throw ApiError.badRequest('Invalid customer ID format');
    }
    filter.customer = queryParams.customer;
  }

  if (queryParams.startDate || queryParams.endDate) {
    filter.createdAt = {};
    if (queryParams.startDate) {
      filter.createdAt.$gte = new Date(queryParams.startDate);
    }
    if (queryParams.endDate) {
      const end = new Date(queryParams.endDate);
      if (queryParams.endDate.length === 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      filter.createdAt.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('serviceRequest', 'title category description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Operational read: Retrieves single booking details
 * @param {string} bookingId
 */
const getBookingByIdOperational = async (bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw ApiError.badRequest('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId)
    .populate('customer', 'name email phone')
    .populate('provider', 'name email phone')
    .populate('serviceRequest')
    .populate('quote')
    .lean();

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  return booking;
};

/**
 * Operational read: Lists jobs with filtering and pagination
 * @param {Object} queryParams
 */
const listJobsOperational = async (queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (queryParams.status) {
    filter.status = queryParams.status;
  }

  if (queryParams.provider) {
    if (!mongoose.Types.ObjectId.isValid(queryParams.provider)) {
      throw ApiError.badRequest('Invalid provider ID format');
    }
    filter.provider = queryParams.provider;
  }

  if (queryParams.customer) {
    if (!mongoose.Types.ObjectId.isValid(queryParams.customer)) {
      throw ApiError.badRequest('Invalid customer ID format');
    }
    filter.customer = queryParams.customer;
  }

  if (queryParams.startDate || queryParams.endDate) {
    filter.createdAt = {};
    if (queryParams.startDate) {
      filter.createdAt.$gte = new Date(queryParams.startDate);
    }
    if (queryParams.endDate) {
      const end = new Date(queryParams.endDate);
      if (queryParams.endDate.length === 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      filter.createdAt.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    Job.find(filter)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('booking')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Operational read: Retrieves single job details
 * @param {string} jobId
 */
const getJobByIdOperational = async (jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job ID format');
  }

  const job = await Job.findById(jobId)
    .populate('customer', 'name email phone')
    .populate('provider', 'name email phone')
    .populate('booking')
    .lean();

  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  return job;
};

/**
 * Aggregates platform statistics and dashboard indicators
 * Uses MongoDB aggregation pipelines rather than loading collections into memory.
 * @param {Object} filterOptions - { startDate, endDate }
 */
const getPlatformStatistics = async ({ startDate, endDate } = {}) => {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      if (endDate.length === 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      dateFilter.createdAt.$lte = end;
    }
  }

  // 1. User metrics
  const [totalUsers, userRoleCounts] = await Promise.all([
    User.countDocuments(),
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  let customers = 0;
  let serviceProviders = 0;
  let supportAgents = 0;

  userRoleCounts.forEach((roleGroup) => {
    if (roleGroup._id === ROLES.CUSTOMER) customers = roleGroup.count;
    if (roleGroup._id === ROLES.SERVICE_PROVIDER) serviceProviders = roleGroup.count;
    if (roleGroup._id === ROLES.SUPPORT_AGENT) supportAgents = roleGroup.count;
  });

  // 2. Provider verification metrics
  const [activeProviders, pendingProviderVerification] = await Promise.all([
    ProviderProfile.countDocuments({
      verificationStatus: PROVIDER_VERIFICATION_STATUS.APPROVED,
      isAvailable: true,
    }),
    ProviderProfile.countDocuments({
      verificationStatus: PROVIDER_VERIFICATION_STATUS.PENDING,
    }),
  ]);

  // 3. Bookings metrics (with date range support)
  const bookingAgg = await Booking.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0] },
        },
      },
    },
  ]);

  const totalBookings = bookingAgg[0]?.totalBookings || 0;
  const completedBookings = bookingAgg[0]?.completedBookings || 0;
  const cancelledBookings = bookingAgg[0]?.cancelledBookings || 0;

  // 4. Job metrics (active jobs with date range support)
  const activeJobStatuses = [
    JOB_STATUS.ASSIGNED,
    JOB_STATUS.ON_THE_WAY,
    JOB_STATUS.CHECKED_IN,
    JOB_STATUS.IN_PROGRESS,
  ];
  const activeJobs = await Job.countDocuments({
    ...dateFilter,
    status: { $in: activeJobStatuses },
  });

  // 5. Dispute metrics (open disputes with date range support)
  const openDisputeStatuses = [
    DISPUTE_STATUS.OPEN,
    DISPUTE_STATUS.UNDER_REVIEW,
  ];
  const openDisputes = await Dispute.countDocuments({
    ...dateFilter,
    status: { $in: openDisputeStatuses },
  });

  // 6. Support ticket metrics (unresolved tickets with date range support)
  const unresolvedTicketStatuses = [
    SUPPORT_TICKET_STATUS.OPEN,
    SUPPORT_TICKET_STATUS.IN_PROGRESS,
    SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER,
    SUPPORT_TICKET_STATUS.WAITING_FOR_PROVIDER,
  ];
  const unresolvedSupportTickets = await SupportTicket.countDocuments({
    ...dateFilter,
    status: { $in: unresolvedTicketStatuses },
  });

  // 7. Invoice & financial revenue metrics (with date range support)
  // All Invoice totalAmount fields are stored in integer cents.
  const invoiceAgg = await Invoice.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        paidInvoices: {
          $sum: { $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, 1, 0] },
        },
        totalRevenueCents: {
          $sum: {
            $cond: [{ $eq: ['$status', INVOICE_STATUS.PAID] }, '$totalAmount', 0],
          },
        },
      },
    },
  ]);

  const totalInvoices = invoiceAgg[0]?.totalInvoices || 0;
  const paidInvoices = invoiceAgg[0]?.paidInvoices || 0;
  const totalRevenueCents = invoiceAgg[0]?.totalRevenueCents || 0;
  const totalRevenue = totalRevenueCents / 100;

  return {
    totalUsers,
    customers,
    serviceProviders,
    supportAgents,
    activeProviders,
    pendingProviderVerification,
    totalBookings,
    completedBookings,
    cancelledBookings,
    activeJobs,
    openDisputes,
    unresolvedSupportTickets,
    totalInvoices,
    paidInvoices,
    totalRevenueCents,
    totalRevenue,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
  listBookingsOperational,
  getBookingByIdOperational,
  listJobsOperational,
  getJobByIdOperational,
  getPlatformStatistics,
};
