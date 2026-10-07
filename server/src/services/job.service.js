// Job Service - handles Job lifecycle and creation
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Invoice = require('../models/Invoice');
const {
  JOB_STATUS,
  VALID_JOB_TRANSITIONS,
  isValidTransition,
  INVOICE_STATUS,
  NOTIFICATION_TYPE,
} = require('../constants/status');
const { ApiError } = require('../utils/apiError');

/**
 * Creates a Job for a given confirmed Booking.
 * Ensures idempotency via unique index on booking.
 */
async function createJobForBooking(booking) {
  if (!booking) throw ApiError.badRequest('Booking is required');
  // Check if Job already exists
  const existing = await Job.findOne({ booking: booking._id });
  if (existing) return existing;

  const job = new Job({
    booking: booking._id,
    provider: booking.provider,
    customer: booking.customer,
    status: JOB_STATUS.ASSIGNED,
  });
  await job.save();

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: job.customer,
      type: NOTIFICATION_TYPE.JOB_ASSIGNED,
      title: 'Job Assigned',
      message: 'Your service job has been assigned to a provider.',
      relatedBooking: job.booking,
      relatedJob: job._id,
    });
  } catch {
    // Non-blocking notification
  }

  return job;
}

/**
 * Validates and performs a status transition.
 * actorId is used for ownership checks by caller.
 */
async function transitionStatus(jobId, newStatus, actorId) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');

  // Validate transition
  if (!isValidTransition(VALID_JOB_TRANSITIONS, job.status, newStatus)) {
    throw ApiError.badRequest(`Invalid job status transition from ${job.status} to ${newStatus}`);
  }

  // Ownership checks are performed by callers (provider or customer) based on route.
  job.status = newStatus;

  // Record timestamps for specific statuses
  if (newStatus === JOB_STATUS.ON_THE_WAY) job.startedAt = new Date();
  if (newStatus === JOB_STATUS.CHECKED_IN) job.checkedInAt = new Date();
  if (newStatus === JOB_STATUS.COMPLETED) job.completedAt = new Date();

  await job.save();

  // Trigger in-app notifications based on new status
  try {
    const notificationService = require('./notification.service');
    let notifType = null;
    let notifTitle = null;
    let notifMessage = null;

    if (newStatus === JOB_STATUS.ON_THE_WAY) {
      notifType = NOTIFICATION_TYPE.JOB_ON_THE_WAY;
      notifTitle = 'Provider On The Way';
      notifMessage = 'Your service provider is on the way to the service location.';
    } else if (newStatus === JOB_STATUS.CHECKED_IN) {
      notifType = NOTIFICATION_TYPE.JOB_CHECKED_IN;
      notifTitle = 'Provider Checked In';
      notifMessage = 'Your service provider has checked in at the location.';
    } else if (newStatus === JOB_STATUS.IN_PROGRESS) {
      notifType = NOTIFICATION_TYPE.JOB_IN_PROGRESS;
      notifTitle = 'Job In Progress';
      notifMessage = 'Your service job is currently in progress.';
    } else if (newStatus === JOB_STATUS.COMPLETED) {
      notifType = NOTIFICATION_TYPE.JOB_COMPLETED;
      notifTitle = 'Job Completed';
      notifMessage = 'Your service job has been marked as completed.';
    }

    if (notifType) {
      await notificationService.createNotification({
        recipient: job.customer,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        relatedBooking: job.booking,
        relatedJob: job._id,
      });
    }
  } catch {
    // Non-blocking notification
  }

  // If completed, trigger invoice generation
  if (newStatus === JOB_STATUS.COMPLETED) {
    await generateInvoiceFromJob(job);
  }

  return job;
}

async function checkIn(jobId, providerId) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.provider.equals(providerId)) throw ApiError.forbidden('Provider does not own this job');
  return transitionStatus(jobId, JOB_STATUS.CHECKED_IN, providerId);
}

async function start(jobId, providerId) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.provider.equals(providerId)) throw ApiError.forbidden('Provider does not own this job');
  return transitionStatus(jobId, JOB_STATUS.IN_PROGRESS, providerId);
}

async function complete(jobId, providerId, notes) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.provider.equals(providerId)) throw ApiError.forbidden('Provider does not own this job');
  job.notes = notes;
  await job.save();
  return transitionStatus(jobId, JOB_STATUS.COMPLETED, providerId);
}

async function customerConfirm(jobId, customerId) {
  const job = await Job.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.customer.equals(customerId)) throw ApiError.forbidden('Customer does not own this job');
  if (job.customerConfirmation) throw ApiError.badRequest('Job already confirmed by customer');
  if (job.status !== JOB_STATUS.COMPLETED) throw ApiError.badRequest('Job must be completed before confirmation');
  job.customerConfirmation = true;
  await job.save();

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: job.provider,
      type: NOTIFICATION_TYPE.JOB_CONFIRMED,
      title: 'Job Confirmed by Customer',
      message: 'The customer has confirmed completion of the service job.',
      relatedBooking: job.booking,
      relatedJob: job._id,
    });
  } catch {
    // Non-blocking notification
  }

  return job;
}

/**
 * Generates an Invoice from a completed Job.
 * Uses integer cents for monetary calculations.
 */
async function generateInvoiceFromJob(job) {
  // Delegate invoice creation to the Invoice Service. The service ensures idempotency and correct calculations.
  const invoiceService = require('../services/invoice.service');
  return invoiceService.generateInvoiceFromJob(job);
}

// Getter: fetch a single job by ID with optional population
async function getJobById(jobId, populate = []) {
  if (!jobId) throw ApiError.badRequest('Job ID is required');
  const query = Job.findById(jobId);
  populate.forEach((path) => query.populate(path));
  const job = await query;
  if (!job) throw ApiError.notFound('Job not found');
  return job;
}

// Getter: list jobs for a customer with pagination
async function getCustomerJobs(customerId, queryParams = {}) {
  const query = { customer: customerId };
  if (queryParams.status) query.status = queryParams.status;
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const total = await Job.countDocuments(query);
  const items = await Job.find(query)
    .populate('booking')
    .populate('provider', 'name email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

// Getter: list jobs for a provider with pagination
async function getProviderJobs(providerId, queryParams = {}) {
  const query = { provider: providerId };
  if (queryParams.status) query.status = queryParams.status;
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const total = await Job.countDocuments(query);
  const items = await Job.find(query)
    .populate('booking')
    .populate('customer', 'name email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

module.exports = {
  createJobForBooking,
  transitionStatus,
  checkIn,
  start,
  complete,
  customerConfirm,
  generateInvoiceFromJob,
  getJobById,
  getCustomerJobs,
  getProviderJobs,
};

