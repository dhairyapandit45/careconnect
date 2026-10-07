/**
 * Support Ticket Service
 * Manages ticket lifecycle, conversations, related resource verification,
 * atomic sequential numbering, staff assignment, and role-based permissions.
 */

const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const Dispute = require('../models/Dispute');
const User = require('../models/User');
const {
  SUPPORT_TICKET_STATUS,
  VALID_SUPPORT_TICKET_TRANSITIONS,
  isValidTransition,
  NOTIFICATION_TYPE,
} = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { ApiError } = require('../utils/apiError');

const STAFF_ROLES = [
  ROLES.SUPPORT_AGENT,
  ROLES.OPERATIONS_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

const isStaff = (user) => STAFF_ROLES.includes(user.role);

/**
 * Generates an atomic sequential ticket number (CC-TKT-YYYY-XXXXXX)
 */
async function generateTicketNumber() {
  const Counter =
    mongoose.models.Counter ||
    mongoose.model(
      'Counter',
      new mongoose.Schema({
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 },
      })
    );

  const result = await Counter.findOneAndUpdate(
    { _id: 'supportTicketNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(result.seq).padStart(6, '0');
  return `CC-TKT-${new Date().getFullYear()}-${seqStr}`;
}

/**
 * Creates a new support ticket with server-derived participant identities
 * @param {object} user - Authenticated creator
 * @param {object} payload - Validated ticket data
 */
async function createTicket(user, payload) {
  const bookingId = payload.relatedBookingId || payload.bookingId || payload.relatedBooking;
  const jobId = payload.relatedJobId || payload.jobId || payload.relatedJob;
  const disputeId = payload.relatedDisputeId || payload.disputeId || payload.relatedDispute;

  let booking = null;
  let job = null;
  let dispute = null;

  // 1. Verify related booking if provided
  if (bookingId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest('Invalid booking ID format');
    }
    booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Referenced Booking not found');
    }

    if (user.role === ROLES.CUSTOMER && String(booking.customer) !== String(user._id)) {
      throw ApiError.forbidden('You are not authorized to attach this booking to your ticket');
    }
    if (user.role === ROLES.SERVICE_PROVIDER && String(booking.provider) !== String(user._id)) {
      throw ApiError.forbidden('You are not authorized to attach this booking to your ticket');
    }
  }

  // 2. Verify related job if provided
  if (jobId) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw ApiError.badRequest('Invalid job ID format');
    }
    job = await Job.findById(jobId);
    if (!job) {
      throw ApiError.notFound('Referenced Job not found');
    }

    if (user.role === ROLES.CUSTOMER && String(job.customer) !== String(user._id)) {
      throw ApiError.forbidden('You are not authorized to attach this job to your ticket');
    }
    if (user.role === ROLES.SERVICE_PROVIDER && String(job.provider) !== String(user._id)) {
      throw ApiError.forbidden('You are not authorized to attach this job to your ticket');
    }

    // Cross-check: Job must match Booking if both are supplied
    if (booking && String(job.booking) !== String(booking._id)) {
      throw ApiError.badRequest('Referenced Job does not belong to the referenced Booking');
    }
  }

  // 3. Verify related dispute if provided
  if (disputeId) {
    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      throw ApiError.badRequest('Invalid dispute ID format');
    }
    dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw ApiError.notFound('Referenced Dispute not found');
    }

    if (
      user.role === ROLES.CUSTOMER &&
      String(dispute.customer) !== String(user._id) &&
      String(dispute.raisedBy) !== String(user._id)
    ) {
      throw ApiError.forbidden('You are not authorized to attach this dispute to your ticket');
    }
    if (
      user.role === ROLES.SERVICE_PROVIDER &&
      String(dispute.provider) !== String(user._id) &&
      String(dispute.raisedBy) !== String(user._id)
    ) {
      throw ApiError.forbidden('You are not authorized to attach this dispute to your ticket');
    }

    // Cross-check: Dispute must match Job if both are supplied
    if (job && String(dispute.job) !== String(job._id)) {
      throw ApiError.badRequest('Referenced Dispute does not match the referenced Job');
    }
  }

  // Derive participant identities server-side
  let customerId = null;
  let providerId = null;

  if (user.role === ROLES.CUSTOMER) {
    customerId = user._id;
  } else if (user.role === ROLES.SERVICE_PROVIDER) {
    providerId = user._id;
  }

  // Fallback participant derivation from related resources
  if (!customerId) {
    customerId = booking?.customer || job?.customer || dispute?.customer || null;
  }
  if (!providerId) {
    providerId = booking?.provider || job?.provider || dispute?.provider || null;
  }

  const ticketNumber = await generateTicketNumber();

  const ticket = new SupportTicket({
    ticketNumber,
    createdBy: user._id,
    customer: customerId,
    provider: providerId,
    subject: payload.subject,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    status: SUPPORT_TICKET_STATUS.OPEN,
    relatedBooking: booking?._id || null,
    relatedJob: job?._id || null,
    relatedDispute: dispute?._id || null,
    messages: [
      {
        sender: user._id,
        senderRole: user.role,
        message: payload.description,
        isInternal: false,
        createdAt: new Date(),
      },
    ],
  });

  await ticket.save();

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: user._id,
      type: NOTIFICATION_TYPE.SUPPORT_TICKET_CREATED,
      title: 'Support Ticket Created',
      message: `Your ticket ${ticket.ticketNumber} has been received and opened.`,
      relatedBooking: ticket.relatedBooking,
      relatedJob: ticket.relatedJob,
      relatedDispute: ticket.relatedDispute,
      relatedSupportTicket: ticket._id,
    });
  } catch {
    // Non-blocking notification
  }

  return ticket;
}

/**
 * Retrieves a single ticket with role-based access validation and notes filtering
 * @param {string} ticketId
 * @param {object} user
 */
async function getTicketById(ticketId, user) {
  if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
    throw ApiError.badRequest('Invalid ticket ID format');
  }

  const ticket = await SupportTicket.findById(ticketId)
    .populate('createdBy', 'name email role')
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .populate('assignedTo', 'name email role')
    .populate('messages.sender', 'name email role')
    .populate('relatedBooking')
    .populate('relatedJob')
    .populate('relatedDispute');

  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Tenant access verification
  if (!isStaff(user)) {
    const userIdStr = String(user._id);
    const createdByStr = String(ticket.createdBy?._id || ticket.createdBy);
    const customerStr = String(ticket.customer?._id || ticket.customer);
    const providerStr = String(ticket.provider?._id || ticket.provider);

    if (createdByStr !== userIdStr && customerStr !== userIdStr && providerStr !== userIdStr) {
      throw ApiError.forbidden('You do not have permission to access this support ticket');
    }

    // Conceal internal support notes from customers and providers
    ticket.messages = ticket.messages.filter((msg) => !msg.isInternal);
  }

  return ticket;
}

/**
 * Lists tickets scoped to the caller's role with filtering and pagination
 * @param {object} user
 * @param {object} queryParams
 */
async function listTickets(user, queryParams = {}) {
  let filter = {};

  if (!isStaff(user)) {
    filter = {
      $or: [{ createdBy: user._id }, { customer: user._id }, { provider: user._id }],
    };
  } else {
    if (queryParams.status) filter.status = queryParams.status;
    if (queryParams.priority) filter.priority = queryParams.priority;
    if (queryParams.category) filter.category = queryParams.category;
    if (queryParams.assignedTo) filter.assignedTo = queryParams.assignedTo;
    if (queryParams.assignedToMe === 'true') filter.assignedTo = user._id;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await SupportTicket.countDocuments(filter);
  const items = await SupportTicket.find(filter)
    .populate('createdBy', 'name email role')
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .populate('assignedTo', 'name email role')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Strip internal notes if caller is not staff
  if (!isStaff(user)) {
    items.forEach((item) => {
      if (item.messages) {
        item.messages = item.messages.filter((m) => !m.isInternal);
      }
    });
  }

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
 * Appends a conversation message or staff note to a support ticket
 * @param {string} ticketId
 * @param {object} user - Authenticated author
 * @param {object} payload - Message data
 */
async function addMessage(ticketId, user, payload) {
  if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
    throw ApiError.badRequest('Invalid ticket ID format');
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Closed tickets cannot be modified
  if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
    throw ApiError.badRequest('Cannot add messages to a closed support ticket');
  }

  // Authorization check
  if (!isStaff(user)) {
    const userIdStr = String(user._id);
    const createdByStr = String(ticket.createdBy);
    const customerStr = String(ticket.customer);
    const providerStr = String(ticket.provider);

    if (createdByStr !== userIdStr && customerStr !== userIdStr && providerStr !== userIdStr) {
      throw ApiError.forbidden('You do not have permission to reply to this support ticket');
    }
  }

  // Only staff can author internal notes
  const isInternal = Boolean(payload.isInternal && isStaff(user));

  const newMessage = {
    sender: user._id,
    senderRole: user.role,
    message: payload.message,
    isInternal,
    createdAt: new Date(),
  };

  ticket.messages.push(newMessage);

  // If customer replies while waiting for customer, automatically progress ticket
  if (
    user.role === ROLES.CUSTOMER &&
    ticket.status === SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER
  ) {
    ticket.status = SUPPORT_TICKET_STATUS.IN_PROGRESS;
  }
  // If provider replies while waiting for provider, automatically progress ticket
  if (
    user.role === ROLES.SERVICE_PROVIDER &&
    ticket.status === SUPPORT_TICKET_STATUS.WAITING_FOR_PROVIDER
  ) {
    ticket.status = SUPPORT_TICKET_STATUS.IN_PROGRESS;
  }

  await ticket.save();

  if (!isInternal) {
    try {
      const notificationService = require('./notification.service');
      const isCreator = String(user._id) === String(ticket.createdBy);
      const recipient = isCreator ? ticket.assignedTo : ticket.createdBy;
      if (recipient) {
        await notificationService.createNotification({
          recipient,
          type: NOTIFICATION_TYPE.SUPPORT_TICKET_MESSAGE,
          title: 'New Support Ticket Message',
          message: `New message on ticket ${ticket.ticketNumber}: ${payload.message.substring(0, 60)}...`,
          relatedBooking: ticket.relatedBooking,
          relatedJob: ticket.relatedJob,
          relatedDispute: ticket.relatedDispute,
          relatedSupportTicket: ticket._id,
        });
      }
    } catch {
      // Non-blocking notification
    }
  }

  return ticket;
}

/**
 * Updates support ticket status through controlled state transitions
 * @param {string} ticketId
 * @param {object} user
 * @param {object} payload
 */
async function updateTicketStatus(ticketId, user, payload) {
  if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
    throw ApiError.badRequest('Invalid ticket ID format');
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Closed tickets cannot be modified
  if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
    throw ApiError.badRequest('Closed support tickets cannot be modified');
  }

  const targetStatus = payload.status;

  if (!isStaff(user)) {
    // Customers/providers can only close their own ticket
    if (targetStatus === SUPPORT_TICKET_STATUS.CLOSED) {
      const userIdStr = String(user._id);
      const createdByStr = String(ticket.createdBy);
      const customerStr = String(ticket.customer);
      const providerStr = String(ticket.provider);

      if (createdByStr !== userIdStr && customerStr !== userIdStr && providerStr !== userIdStr) {
        throw ApiError.forbidden('You can only close your own support ticket');
      }
    } else {
      throw ApiError.forbidden('Only support and operations staff can update ticket status');
    }
  }

  // Validate finite state machine transition
  if (!isValidTransition(VALID_SUPPORT_TICKET_TRANSITIONS, ticket.status, targetStatus)) {
    throw ApiError.badRequest(
      `Invalid ticket status transition from ${ticket.status} to ${targetStatus}`
    );
  }

  ticket.status = targetStatus;

  if (targetStatus === SUPPORT_TICKET_STATUS.CLOSED) {
    ticket.closedAt = new Date();
  }
  if (
    targetStatus === SUPPORT_TICKET_STATUS.RESOLVED ||
    targetStatus === SUPPORT_TICKET_STATUS.CLOSED
  ) {
    ticket.resolution = {
      resolvedBy: user._id,
      resolvedAt: new Date(),
      resolutionNotes: payload.resolutionNotes || '',
    };
  }

  await ticket.save();

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: ticket.createdBy,
      type: NOTIFICATION_TYPE.SUPPORT_TICKET_STATUS_CHANGED,
      title: 'Support Ticket Status Updated',
      message: `Your ticket ${ticket.ticketNumber} status changed to ${targetStatus}.`,
      relatedBooking: ticket.relatedBooking,
      relatedJob: ticket.relatedJob,
      relatedDispute: ticket.relatedDispute,
      relatedSupportTicket: ticket._id,
    });
  } catch {
    // Non-blocking notification
  }

  return ticket;
}

/**
 * Updates ticket priority (Staff only)
 * @param {string} ticketId
 * @param {object} user
 * @param {string} priority
 */
async function updateTicketPriority(ticketId, user, priority) {
  if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
    throw ApiError.badRequest('Invalid ticket ID format');
  }

  if (!isStaff(user)) {
    throw ApiError.forbidden('Only support and operations staff can update ticket priority');
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
    throw ApiError.badRequest('Closed support tickets cannot be modified');
  }

  ticket.priority = priority;
  await ticket.save();
  return ticket;
}

/**
 * Assigns or reassigns a support ticket to an authorized staff member (Staff only)
 * @param {string} ticketId
 * @param {object} user
 * @param {string} assignedToUserId
 */
async function assignTicket(ticketId, user, assignedToUserId) {
  if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
    throw ApiError.badRequest('Invalid ticket ID format');
  }

  if (!isStaff(user)) {
    throw ApiError.forbidden('Only support and operations staff can assign tickets');
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
    throw ApiError.badRequest('Closed support tickets cannot be modified');
  }

  if (!mongoose.Types.ObjectId.isValid(assignedToUserId)) {
    throw ApiError.badRequest('Invalid assignedTo user ID format');
  }

  const targetAgent = await User.findById(assignedToUserId);
  if (!targetAgent) {
    throw ApiError.notFound('Assigned user not found');
  }

  if (!isStaff(targetAgent)) {
    throw ApiError.badRequest(
      'Tickets can only be assigned to support staff or platform administrators'
    );
  }

  ticket.assignedTo = targetAgent._id;

  // If ticket is open, automatically move to IN_PROGRESS upon assignment
  if (ticket.status === SUPPORT_TICKET_STATUS.OPEN) {
    ticket.status = SUPPORT_TICKET_STATUS.IN_PROGRESS;
  }

  await ticket.save();

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: assignedToUserId,
      type: NOTIFICATION_TYPE.SUPPORT_TICKET_ASSIGNED,
      title: 'Support Ticket Assigned',
      message: `You have been assigned to support ticket ${ticket.ticketNumber}.`,
      relatedBooking: ticket.relatedBooking,
      relatedJob: ticket.relatedJob,
      relatedDispute: ticket.relatedDispute,
      relatedSupportTicket: ticket._id,
    });
  } catch {
    // Non-blocking notification
  }

  return ticket;
}

/**
 * Closes an open support ticket
 * @param {string} ticketId
 * @param {object} user
 * @param {object} payload
 */
async function closeTicket(ticketId, user, payload = {}) {
  return updateTicketStatus(ticketId, user, {
    status: SUPPORT_TICKET_STATUS.CLOSED,
    resolutionNotes: payload.resolutionNotes,
  });
}

module.exports = {
  createTicket,
  getTicketById,
  listTickets,
  addMessage,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  closeTicket,
};
