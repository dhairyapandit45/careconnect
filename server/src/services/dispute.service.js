/**
 * Dispute Service
 * Manages dispute creation, ownership validation, cross-referencing between Job and Booking,
 * finite state machine transitions, and admin/operations resolution auditing.
 */

const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const {
  DISPUTE_STATUS,
  VALID_DISPUTE_TRANSITIONS,
  isValidTransition,
  BOOKING_STATUS,
  NOTIFICATION_TYPE,
} = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { ApiError } = require('../utils/apiError');

const ADMIN_OPS_ROLES = [
  ROLES.PLATFORM_ADMIN,
  ROLES.SUPPORT_AGENT,
  ROLES.OPERATIONS_MANAGER,
];

/**
 * Creates a new dispute for a verified Job and Booking
 * @param {object} user - Authenticated user
 * @param {object} payload - Dispute payload
 */
async function createDispute(user, payload) {
  if (user.role !== ROLES.CUSTOMER && user.role !== ROLES.SERVICE_PROVIDER) {
    throw ApiError.forbidden('Only customers and service providers can raise disputes');
  }

  const jobIdentifier = payload.jobId || payload.job;
  const bookingIdentifier = payload.bookingId || payload.booking;

  let job = null;
  if (jobIdentifier) {
    if (!mongoose.Types.ObjectId.isValid(jobIdentifier)) {
      throw ApiError.badRequest('Invalid job ID format');
    }
    job = await Job.findById(jobIdentifier);
  } else if (bookingIdentifier) {
    if (!mongoose.Types.ObjectId.isValid(bookingIdentifier)) {
      throw ApiError.badRequest('Invalid booking ID format');
    }
    job = await Job.findOne({ booking: bookingIdentifier });
  }

  if (!job) {
    throw ApiError.notFound('Referenced job not found');
  }

  const booking = await Booking.findById(job.booking);
  if (!booking) {
    throw ApiError.notFound('Referenced booking not found');
  }

  // Cross-check: ensure job.booking matches supplied booking identifier if provided
  if (bookingIdentifier && String(job.booking) !== String(bookingIdentifier)) {
    throw ApiError.badRequest('Job does not belong to the specified booking');
  }

  // Enforce role-based ownership boundaries
  if (user.role === ROLES.CUSTOMER) {
    if (String(job.customer) !== String(user._id)) {
      throw ApiError.forbidden('You can only dispute your own bookings/jobs');
    }
  } else if (user.role === ROLES.SERVICE_PROVIDER) {
    if (String(job.provider) !== String(user._id)) {
      throw ApiError.forbidden('You can only dispute jobs assigned to you');
    }
  }

  // Prevent duplicate active disputes for the same Job
  const existingActiveDispute = await Dispute.findOne({
    job: job._id,
    status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.UNDER_REVIEW] },
  });

  if (existingActiveDispute) {
    throw ApiError.conflict('An active dispute already exists for this job');
  }

  // Instantiate dispute with server-derived relations
  const dispute = new Dispute({
    booking: job.booking,
    job: job._id,
    customer: job.customer,
    provider: job.provider,
    raisedBy: user._id,
    reason: payload.reason,
    category: payload.category || 'GENERAL',
    description: payload.description,
    status: DISPUTE_STATUS.OPEN,
  });

  await dispute.save();

  // If booking is in an active state, mark booking as disputed
  if (
    booking.status === BOOKING_STATUS.IN_PROGRESS ||
    booking.status === BOOKING_STATUS.COMPLETED
  ) {
    booking.status = BOOKING_STATUS.DISPUTED;
    await booking.save();
  }

  try {
    const notificationService = require('./notification.service');
    const recipient = String(user._id) === String(dispute.customer) ? dispute.provider : dispute.customer;
    await notificationService.createNotification({
      recipient,
      type: NOTIFICATION_TYPE.DISPUTE_CREATED,
      title: 'Dispute Raised',
      message: `A dispute has been raised regarding your job: ${dispute.reason}`,
      relatedBooking: dispute.booking,
      relatedJob: dispute.job,
      relatedDispute: dispute._id,
    });
  } catch {
    // Non-blocking notification
  }

  return dispute;
}

/**
 * Retrieves a single dispute by ID with role-based access validation
 * @param {string} disputeId
 * @param {object} user
 */
async function getDisputeById(disputeId, user) {
  if (!disputeId || !mongoose.Types.ObjectId.isValid(disputeId)) {
    throw ApiError.badRequest('Invalid dispute ID format');
  }

  const dispute = await Dispute.findById(disputeId)
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .populate('raisedBy', 'name email role')
    .populate('job')
    .populate('booking')
    .populate('resolution.resolvedBy', 'name email role');

  if (!dispute) {
    throw ApiError.notFound('Dispute not found');
  }

  // Operations and Platform Admins can inspect any dispute
  if (ADMIN_OPS_ROLES.includes(user.role)) {
    return dispute;
  }

  const userIdStr = String(user._id);
  const customerIdStr = String(dispute.customer?._id || dispute.customer);
  const providerIdStr = String(dispute.provider?._id || dispute.provider);
  const raisedByIdStr = String(dispute.raisedBy?._id || dispute.raisedBy);

  if (user.role === ROLES.CUSTOMER) {
    if (customerIdStr !== userIdStr && raisedByIdStr !== userIdStr) {
      throw ApiError.forbidden('You do not have permission to access this dispute');
    }
    return dispute;
  }

  if (user.role === ROLES.SERVICE_PROVIDER) {
    if (providerIdStr !== userIdStr && raisedByIdStr !== userIdStr) {
      throw ApiError.forbidden('You do not have permission to access this dispute');
    }
    return dispute;
  }

  throw ApiError.forbidden('You do not have permission to access this dispute');
}

/**
 * Lists disputes scoped to the authenticated caller's role
 * @param {object} user
 * @param {object} queryParams
 */
async function listDisputes(user, queryParams = {}) {
  let filter = {};

  if (user.role === ROLES.CUSTOMER) {
    filter = {
      $or: [{ customer: user._id }, { raisedBy: user._id }],
    };
  } else if (user.role === ROLES.SERVICE_PROVIDER) {
    filter = {
      $or: [{ provider: user._id }, { raisedBy: user._id }],
    };
  } else if (ADMIN_OPS_ROLES.includes(user.role)) {
    if (queryParams.status) filter.status = queryParams.status;
    if (queryParams.job) filter.job = queryParams.job;
    if (queryParams.customer) filter.customer = queryParams.customer;
    if (queryParams.provider) filter.provider = queryParams.provider;
  } else {
    throw ApiError.forbidden('You do not have permission to list disputes');
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Dispute.countDocuments(filter);
  const items = await Dispute.find(filter)
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .populate('raisedBy', 'name email role')
    .populate('job')
    .populate('booking')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Cancels an open dispute (Customer or Provider who raised it)
 * @param {string} disputeId
 * @param {object} user
 * @param {object} payload
 */
async function cancelDispute(disputeId, user, payload = {}) {
  if (!disputeId || !mongoose.Types.ObjectId.isValid(disputeId)) {
    throw ApiError.badRequest('Invalid dispute ID format');
  }

  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw ApiError.notFound('Dispute not found');
  }

  // Caller must be the user who raised the dispute or associated customer
  const userIdStr = String(user._id);
  const raisedByStr = String(dispute.raisedBy);
  const customerStr = String(dispute.customer);

  if (raisedByStr !== userIdStr && customerStr !== userIdStr && !ADMIN_OPS_ROLES.includes(user.role)) {
    throw ApiError.forbidden('You can only cancel disputes created by you');
  }

  if (dispute.status !== DISPUTE_STATUS.OPEN) {
    throw ApiError.badRequest('Disputes can only be cancelled while in OPEN status');
  }

  if (!isValidTransition(VALID_DISPUTE_TRANSITIONS, dispute.status, DISPUTE_STATUS.CANCELLED)) {
    throw ApiError.badRequest(`Invalid dispute status transition from ${dispute.status} to CANCELLED`);
  }

  dispute.status = DISPUTE_STATUS.CANCELLED;
  if (payload.reason) {
    dispute.resolution = {
      resolvedBy: user._id,
      resolvedAt: new Date(),
      resolutionNotes: payload.reason,
    };
  }

  await dispute.save();

  try {
    const notificationService = require('./notification.service');
    const recipient = String(user._id) === String(dispute.customer) ? dispute.provider : dispute.customer;
    await notificationService.createNotification({
      recipient,
      type: NOTIFICATION_TYPE.DISPUTE_CANCELLED,
      title: 'Dispute Cancelled',
      message: `Dispute has been cancelled: ${payload.reason || 'No reason provided'}`,
      relatedBooking: dispute.booking,
      relatedJob: dispute.job,
      relatedDispute: dispute._id,
    });
  } catch {
    // Non-blocking notification
  }

  return dispute;
}

/**
 * Updates dispute status through controlled finite state machine transitions (Admin/Ops)
 * @param {string} disputeId
 * @param {object} user
 * @param {object} payload
 */
async function updateDisputeStatus(disputeId, user, payload) {
  if (!disputeId || !mongoose.Types.ObjectId.isValid(disputeId)) {
    throw ApiError.badRequest('Invalid dispute ID format');
  }

  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw ApiError.notFound('Dispute not found');
  }

  const targetStatus = payload.status;

  // Customers/providers cannot resolve or reject disputes
  if (!ADMIN_OPS_ROLES.includes(user.role)) {
    if (
      targetStatus === DISPUTE_STATUS.CANCELLED &&
      (String(dispute.raisedBy) === String(user._id) || String(dispute.customer) === String(user._id))
    ) {
      return cancelDispute(disputeId, user, { reason: payload.resolutionNotes });
    }
    throw ApiError.forbidden('Customers and providers cannot perform dispute resolution actions');
  }

  // Validate state machine transition
  if (!isValidTransition(VALID_DISPUTE_TRANSITIONS, dispute.status, targetStatus)) {
    throw ApiError.badRequest(
      `Invalid dispute status transition from ${dispute.status} to ${targetStatus}`
    );
  }

  dispute.status = targetStatus;

  // If transitioning to resolution states, record audit details
  if (targetStatus === DISPUTE_STATUS.RESOLVED || targetStatus === DISPUTE_STATUS.REJECTED) {
    dispute.resolution = {
      resolvedBy: user._id,
      resolvedAt: new Date(),
      resolutionNotes: payload.resolutionNotes || '',
      refundApproved: Boolean(payload.refundApproved),
      refundAmount: payload.refundAmount || 0,
    };
  }

  await dispute.save();

  try {
    const notificationService = require('./notification.service');
    let notifType = NOTIFICATION_TYPE.OTHER;
    if (targetStatus === DISPUTE_STATUS.UNDER_REVIEW) notifType = NOTIFICATION_TYPE.DISPUTE_UNDER_REVIEW;
    else if (targetStatus === DISPUTE_STATUS.RESOLVED) notifType = NOTIFICATION_TYPE.DISPUTE_RESOLVED;
    else if (targetStatus === DISPUTE_STATUS.REJECTED) notifType = NOTIFICATION_TYPE.DISPUTE_REJECTED;

    for (const partyId of [dispute.customer, dispute.provider]) {
      if (partyId) {
        await notificationService.createNotification({
          recipient: partyId,
          type: notifType,
          title: `Dispute ${targetStatus}`,
          message: `Dispute status has been updated to ${targetStatus}.`,
          relatedBooking: dispute.booking,
          relatedJob: dispute.job,
          relatedDispute: dispute._id,
        });
      }
    }
  } catch {
    // Non-blocking notification
  }

  return dispute;
}

module.exports = {
  createDispute,
  getDisputeById,
  listDisputes,
  cancelDispute,
  updateDisputeStatus,
};
