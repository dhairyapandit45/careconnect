/**
 * Booking & Scheduling Engine Service
 * Implements transactional booking creation, provider availability verification,
 * double-booking conflict detection, and booking lifecycle state management.
 */

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ServiceRequest = require('../models/ServiceRequest');
const Quote = require('../models/Quote');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Availability = require('../models/Availability');
const Job = require('../models/Job');
const {
  BOOKING_STATUS,
  SERVICE_REQUEST_STATUS,
  QUOTE_STATUS,
  JOB_STATUS,
  USER_STATUS,
  PROVIDER_VERIFICATION_STATUS,
  VALID_BOOKING_TRANSITIONS,
  DAYS_OF_WEEK,
  NOTIFICATION_TYPE,
  isValidTransition,
} = require('../constants/status');
const { ApiError } = require('../utils/apiError');

const DAY_NAMES = [
  DAYS_OF_WEEK.SUNDAY,
  DAYS_OF_WEEK.MONDAY,
  DAYS_OF_WEEK.TUESDAY,
  DAYS_OF_WEEK.WEDNESDAY,
  DAYS_OF_WEEK.THURSDAY,
  DAYS_OF_WEEK.FRIDAY,
  DAYS_OF_WEEK.SATURDAY,
];

/**
 * Checks whether the active MongoDB connection supports multi-document transactions
 */
const isReplicaSet = () => {
  try {
    const type = mongoose.connection.client?.topology?.description?.type;
    return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
  } catch {
    return false;
  }
};

/**
 * Validates that requested appointment schedule completely fits inside provider's active shift
 * @param {string|ObjectId} providerId
 * @param {Date} startDate - UTC Date
 * @param {Date} endDate - UTC Date
 */
const validateProviderAvailability = async (providerId, startDate, endDate) => {
  // Reject multi-day spans
  if (
    startDate.getUTCFullYear() !== endDate.getUTCFullYear() ||
    startDate.getUTCMonth() !== endDate.getUTCMonth() ||
    startDate.getUTCDate() !== endDate.getUTCDate()
  ) {
    throw ApiError.badRequest('Requested booking schedule cannot span across multiple calendar days');
  }

  const dayOfWeek = DAY_NAMES[startDate.getUTCDay()];
  const reqStart =
    String(startDate.getUTCHours()).padStart(2, '0') +
    ':' +
    String(startDate.getUTCMinutes()).padStart(2, '0');
  const reqEnd =
    String(endDate.getUTCHours()).padStart(2, '0') +
    ':' +
    String(endDate.getUTCMinutes()).padStart(2, '0');

  // Check for date-specific blackout blocks
  const bookingDateStr = startDate.toISOString().split('T')[0];
  const dayStart = new Date(bookingDateStr + 'T00:00:00.000Z');
  const dayEnd = new Date(bookingDateStr + 'T23:59:59.999Z');

  const blocked = await Availability.findOne({
    provider: providerId,
    isBlocked: true,
    blockedDate: { $gte: dayStart, $lte: dayEnd },
  });

  if (blocked) {
    throw ApiError.badRequest('Provider is unavailable or has blocked appointments on the requested date');
  }

  // If provider has configured active shifts, enforce them strictly
  const totalConfiguredShifts = await Availability.countDocuments({
    provider: providerId,
    isBlocked: { $ne: true },
  });

  if (totalConfiguredShifts > 0) {
    const shifts = await Availability.find({
      provider: providerId,
      dayOfWeek,
      isAvailable: true,
      isBlocked: { $ne: true },
    });

    if (shifts.length === 0) {
      throw ApiError.badRequest(
        `Provider does not have active working availability configured for ${dayOfWeek}`
      );
    }

    // The requested interval must fit completely within at least one active shift
    const fitsWithinShift = shifts.some(
      (shift) => shift.startTime <= reqStart && shift.endTime >= reqEnd
    );

    if (!fitsWithinShift) {
      throw ApiError.badRequest(
        'Requested booking time is outside the provider\'s active working availability'
      );
    }
  }

  return true;
};

/**
 * Checks for overlapping active bookings for the specified provider (Double-booking prevention)
 * Conflicting condition: existingStart < requestedEnd AND existingEnd > requestedStart
 * Active statuses that conflict: CONFIRMED, IN_PROGRESS, PENDING
 * Cancelled and Completed bookings do NOT conflict.
 * @param {string|ObjectId} providerId
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string|ObjectId} [excludeBookingId=null]
 */
const checkBookingConflict = async (providerId, startDate, endDate, excludeBookingId = null) => {
  const conflictQuery = {
    provider: providerId,
    status: {
      $in: [
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.PENDING,
      ],
    },
    scheduledStart: { $lt: endDate },
    scheduledEnd: { $gt: startDate },
  };

  if (excludeBookingId) {
    conflictQuery._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(conflictQuery);
  if (conflictingBooking) {
    throw ApiError.conflict(
      'Booking conflict detected: The provider already has an active booking during this time slot',
      'BOOKING_CONFLICT'
    );
  }

  return true;
};

/**
 * Transactionally creates a Booking from an accepted Quote with schedule selection.
 * Transitions:
 * - Selected Quote -> ACCEPTED
 * - Other active quotes for request -> REJECTED
 * - ServiceRequest -> BOOKED
 * - New Booking -> CONFIRMED
 * @param {Object} customerUser
 * @param {string} requestId
 * @param {string} quoteId
 * @param {Object} scheduleData - { scheduledStart, scheduledEnd }
 */
const createBookingFromQuote = async (
  customerUser,
  requestId,
  quoteId,
  scheduleData = {}
) => {
  // 1. Verify ServiceRequest
  const serviceRequest = await ServiceRequest.findById(requestId);
  if (!serviceRequest) {
    throw ApiError.notFound('Service request not found');
  }

  if (!serviceRequest.customer.equals(customerUser._id)) {
    throw ApiError.forbidden('Access denied: You do not own this service request');
  }

  // Idempotency: If an active confirmed booking already exists for this request/customer, return it
  const existingBooking = await Booking.findOne({
    serviceRequest: serviceRequest._id,
    customer: customerUser._id,
    status: { $ne: BOOKING_STATUS.CANCELLED },
  })
    .populate('serviceRequest')
    .populate('provider')
    .populate('providerProfile')
    .populate('quote');

  if (existingBooking) {
    const quote = (await Quote.findById(quoteId)) || existingBooking.quote;
    return { booking: existingBooking, quote, serviceRequest };
  }

  if (
    [
      SERVICE_REQUEST_STATUS.COMPLETED,
      SERVICE_REQUEST_STATUS.CANCELLED,
    ].includes(serviceRequest.status)
  ) {
    throw ApiError.badRequest(
      `Cannot accept quote for service request with current status "${serviceRequest.status}"`
    );
  }

  // 2. Verify Quote
  const quote = await Quote.findById(quoteId);
  if (!quote || !quote.serviceRequest.equals(requestId)) {
    throw ApiError.notFound('Quote not found for this service request');
  }

  if (![QUOTE_STATUS.SUBMITTED, QUOTE_STATUS.VIEWED, QUOTE_STATUS.ACCEPTED].includes(quote.status)) {
    throw ApiError.badRequest(
      `Cannot accept quote: Quote is not in an active state (current status: "${quote.status}")`
    );
  }

  if (
    quote.validUntil &&
    new Date(quote.validUntil).getTime() <= Date.now() &&
    quote.status !== QUOTE_STATUS.ACCEPTED
  ) {
    throw ApiError.badRequest('Quote has expired and can no longer be accepted');
  }

  // 3. Resolve Schedule Dates (explicit or derived fallback)
  let startDate;
  let endDate;

  if (scheduleData && scheduleData.scheduledStart && scheduleData.scheduledEnd) {
    startDate = new Date(scheduleData.scheduledStart);
    endDate = new Date(scheduleData.scheduledEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw ApiError.unprocessableEntity('Invalid schedule dates provided');
    }

    if (startDate.getTime() <= Date.now()) {
      throw ApiError.unprocessableEntity('Booking scheduledStart must be in the future');
    }

    if (startDate >= endDate) {
      throw ApiError.unprocessableEntity('scheduledEnd must be after scheduledStart');
    }
  } else {
    // Derive fallback schedule from serviceRequest preferred date & time
    const reqDate = serviceRequest.preferredDate ? new Date(serviceRequest.preferredDate) : new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const baseDate = reqDate.getTime() > Date.now() ? reqDate : tomorrow;

    let startHour = 10;
    let startMin = 0;
    if (serviceRequest.preferredTime?.start) {
      const parts = serviceRequest.preferredTime.start.split(':').map(Number);
      if (!isNaN(parts[0])) startHour = parts[0];
      if (!isNaN(parts[1])) startMin = parts[1];
    }

    startDate = new Date(baseDate);
    startDate.setUTCHours(startHour, startMin, 0, 0);

    const durationHours = quote.estimatedDuration || 2;
    endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  }

  // 3. Verify Provider Account & Profile
  const providerUser = await User.findById(quote.provider);
  if (!providerUser || providerUser.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Provider account is not active');
  }

  const providerProfile = await ProviderProfile.findOne({ user: quote.provider });
  if (
    !providerProfile ||
    providerProfile.verificationStatus !== PROVIDER_VERIFICATION_STATUS.APPROVED
  ) {
    throw ApiError.forbidden('Provider is not approved to perform services');
  }

  // 4. Verify Recurring Shift Availability
  await validateProviderAvailability(quote.provider, startDate, endDate);

  // 5. Verify No Booking Conflicts (Double-Booking Prevention)
  await checkBookingConflict(quote.provider, startDate, endDate);

  // 6. Execute Transactional Creation & State Transitions
  const executeWrites = async (sessionOpt) => {
    const booking = new Booking({
      serviceRequest: serviceRequest._id,
      customer: customerUser._id,
      provider: quote.provider,
      providerProfile: quote.providerProfile || providerProfile._id,
      quote: quote._id,
      scheduledStart: startDate,
      scheduledEnd: endDate,
      price: quote.amount !== undefined ? quote.amount : (quote.pricing?.totalAmount || 0),
      currency: quote.currency || 'INR',
      status: BOOKING_STATUS.CONFIRMED,
    });

    await booking.save(sessionOpt);

    // Accept selected quote
    quote.status = QUOTE_STATUS.ACCEPTED;
    await quote.save(sessionOpt);

    // Reject other active quotes for this request
    await Quote.updateMany(
      {
        serviceRequest: serviceRequest._id,
        _id: { $ne: quote._id },
        status: { $in: [QUOTE_STATUS.SUBMITTED, QUOTE_STATUS.VIEWED] },
      },
      { status: QUOTE_STATUS.REJECTED },
      sessionOpt
    );

    // Update service request
    serviceRequest.status = SERVICE_REQUEST_STATUS.BOOKED;
    serviceRequest.assignedProvider = quote.provider;
    await serviceRequest.save(sessionOpt);

    // After booking persisted, create associated Job (idempotent)
    const { createJobForBooking } = require('../services/job.service');
    await createJobForBooking(booking);

    // In-app notifications for customer and provider
    try {
      const notificationService = require('./notification.service');
      await notificationService.createNotification({
        recipient: customerUser._id,
        type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: 'Your booking has been successfully confirmed.',
        relatedBooking: booking._id,
      });
      await notificationService.createNotification({
        recipient: quote.provider,
        type: NOTIFICATION_TYPE.BOOKING_CREATED,
        title: 'New Booking Assigned',
        message: 'You have a new scheduled booking.',
        relatedBooking: booking._id,
      });
    } catch {
      // Notification errors must not fail the booking transaction
    }

    // Populate booking with related references
    const populatedBooking = await Booking.findById(booking._id, null, sessionOpt)
      .populate('serviceRequest')
      .populate('provider')
      .populate('providerProfile')
      .populate('quote');
    // Return object expected by controller/tests
    return { booking: populatedBooking || booking, quote, serviceRequest };
  };

  try {
    if (isReplicaSet()) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const result = await executeWrites({ session });
        await session.commitTransaction();
        return result;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      // Standalone MongoDB (e.g. MongoMemoryServer in local test environment)
      return await executeWrites({});
    }
  } catch (err) {
    const isConflict =
      err.code === 11000 ||
      err.code === 112 ||
      err.message?.includes('E11000') ||
      err.message?.includes('duplicate key') ||
      err.message?.includes('WriteConflict') ||
      err.message?.includes('Please retry your operation or multi-document transaction') ||
      (typeof err.hasErrorLabel === 'function' && err.hasErrorLabel('TransientTransactionError'));

    if (isConflict) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await Booking.findOne({
          serviceRequest: requestId,
          customer: customerUser._id,
          status: { $ne: BOOKING_STATUS.CANCELLED },
        })
          .populate('serviceRequest')
          .populate('provider')
          .populate('providerProfile')
          .populate('quote');
        if (existing) {
          const quoteDoc = (await Quote.findById(quoteId)) || existing.quote;
          return { booking: existing, quote: quoteDoc, serviceRequest };
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    throw err;
  }
};

/**
 * Lists bookings belonging to the authenticated Customer
 * @param {string} customerId
 * @param {Object} queryParams
 */
const listCustomerBookings = async (customerId, queryParams = {}) => {
  const query = { customer: customerId };

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate({
      path: 'serviceRequest',
      select: 'title category location preferredDate status description',
      populate: {
        path: 'category',
        select: 'name slug icon',
      },
    })
    .populate({
      path: 'provider',
      select: 'name email phone',
    })
    .populate({
      path: 'providerProfile',
      select: 'businessName rating reviewCount experienceYears skills',
    })
    .populate({
      path: 'quote',
      select: 'amount currency estimatedDuration description',
    })
    .sort({ scheduledStart: -1 })
    .skip(skip)
    .limit(limit);

  return {
    items: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single booking owned by the Customer
 * @param {string} customerId
 * @param {string} bookingId
 */
const getCustomerBookingById = async (customerId, bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'serviceRequest',
      select: 'title category location preferredDate status description',
      populate: {
        path: 'category',
        select: 'name slug icon',
      },
    })
    .populate({
      path: 'provider',
      select: 'name email phone',
    })
    .populate({
      path: 'providerProfile',
      select: 'businessName rating reviewCount experienceYears skills',
    })
    .populate({
      path: 'quote',
      select: 'amount currency estimatedDuration description',
    });

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (!booking.customer.equals(customerId)) {
    throw ApiError.forbidden('Access denied: You do not own this booking');
  }

  return booking;
};

/**
 * Customer cancels their own booking
 * @param {string} customerId
 * @param {string} bookingId
 * @param {string} reason
 */
const cancelCustomerBooking = async (customerId, bookingId, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (!booking.customer.equals(customerId)) {
    throw ApiError.forbidden('Access denied: You do not own this booking');
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw ApiError.badRequest('Cannot cancel booking: Booking is already cancelled');
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    throw ApiError.badRequest('Cannot cancel booking: Booking is already completed');
  }

  if (!isValidTransition(VALID_BOOKING_TRANSITIONS, booking.status, BOOKING_STATUS.CANCELLED)) {
    throw ApiError.badRequest(`Cannot cancel booking with current status "${booking.status}"`);
  }

  const executeCancellation = async (sessionOpt) => {
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledBy = customerId;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save(sessionOpt);

    // Also update associated ServiceRequest
    await ServiceRequest.findByIdAndUpdate(
      booking.serviceRequest,
      {
        status: SERVICE_REQUEST_STATUS.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: customerId,
      },
      sessionOpt
    );

    // Cascade cancellation to associated active Jobs
    await Job.updateMany(
      {
        booking: booking._id,
        status: { $nin: [JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED] },
      },
      {
        status: JOB_STATUS.CANCELLED,
      },
      sessionOpt
    );

    return booking;
  };

  let cancelledBooking;
  if (isReplicaSet()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      cancelledBooking = await executeCancellation({ session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    cancelledBooking = await executeCancellation({});
  }

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: booking.provider,
      type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      message: `Booking has been cancelled by the customer: ${reason || 'No reason provided'}`,
      relatedBooking: booking._id,
    });
  } catch {
    // Non-blocking notification
  }

  return cancelledBooking;
};

/**
 * Lists bookings assigned to the authenticated Provider
 * @param {string} providerId
 * @param {Object} queryParams
 */
const listProviderBookings = async (providerId, queryParams = {}) => {
  const query = { provider: providerId };

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate({
      path: 'serviceRequest',
      // Since booking is confirmed, provider receives full location address to perform the service
      select: 'title category location preferredDate status description requiredSkills',
      populate: {
        path: 'category',
        select: 'name slug icon',
      },
    })
    .populate({
      path: 'customer',
      select: 'name email phone',
    })
    .populate({
      path: 'quote',
      select: 'amount currency estimatedDuration description',
    })
    .sort({ scheduledStart: -1 })
    .skip(skip)
    .limit(limit);

  return {
    items: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single booking assigned to the Provider
 * @param {string} providerId
 * @param {string} bookingId
 */
const getProviderBookingById = async (providerId, bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'serviceRequest',
      select: 'title category location preferredDate status description requiredSkills',
      populate: {
        path: 'category',
        select: 'name slug icon',
      },
    })
    .populate({
      path: 'customer',
      select: 'name email phone',
    })
    .populate({
      path: 'quote',
      select: 'amount currency estimatedDuration description',
    });

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (!booking.provider.equals(providerId)) {
    throw ApiError.forbidden('Access denied: You are not assigned to this booking');
  }

  return booking;
};

/**
 * Provider cancels their assigned booking
 * @param {string} providerId
 * @param {string} bookingId
 * @param {string} reason
 */
const cancelProviderBooking = async (providerId, bookingId, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (!booking.provider.equals(providerId)) {
    throw ApiError.forbidden('Access denied: You are not assigned to this booking');
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw ApiError.badRequest('Cannot cancel booking: Booking is already cancelled');
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    throw ApiError.badRequest('Cannot cancel booking: Booking is already completed');
  }

  if (!isValidTransition(VALID_BOOKING_TRANSITIONS, booking.status, BOOKING_STATUS.CANCELLED)) {
    throw ApiError.badRequest(`Cannot cancel booking with current status "${booking.status}"`);
  }

  const executeCancellation = async (sessionOpt) => {
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledBy = providerId;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save(sessionOpt);

    await ServiceRequest.findByIdAndUpdate(
      booking.serviceRequest,
      {
        status: SERVICE_REQUEST_STATUS.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: providerId,
      },
      sessionOpt
    );

    await Job.updateMany(
      {
        booking: booking._id,
        status: { $nin: [JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED] },
      },
      {
        status: JOB_STATUS.CANCELLED,
      },
      sessionOpt
    );

    return booking;
  };

  let cancelledBooking;
  if (isReplicaSet()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      cancelledBooking = await executeCancellation({ session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    cancelledBooking = await executeCancellation({});
  }

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: booking.customer,
      type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      message: `Booking has been cancelled by the provider: ${reason || 'No reason provided'}`,
      relatedBooking: booking._id,
    });
  } catch {
    // Non-blocking notification
  }

  return cancelledBooking;
};

module.exports = {
  validateProviderAvailability,
  checkBookingConflict,
  createBookingFromQuote,
  listCustomerBookings,
  getCustomerBookingById,
  cancelCustomerBooking,
  listProviderBookings,
  getProviderBookingById,
  cancelProviderBooking,
};
