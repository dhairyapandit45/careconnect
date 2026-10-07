// src/services/invoice.service.js

/**
 * Invoice Service – handles creation, retrieval and state transitions of invoices.
 * All monetary calculations are performed in integer cents to avoid floating point errors.
 */

const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Job = require('../models/Job');
const Quote = require('../models/Quote');
const {
  INVOICE_STATUS,
  VALID_INVOICE_TRANSITIONS,
  isValidTransition,
  NOTIFICATION_TYPE,
} = require('../constants/status');
const { ApiError } = require('../utils/apiError');

/**
 * Generates a unique invoice number.
 * Format: CC-INV-YYYY-XXXXXX where XXXXXX is a zero‑padded incremental counter.
 * Uses a MongoDB collection "counters" to store the next sequence value.
 */
async function generateInvoiceNumber() {
  const Counter = mongoose.models.Counter || mongoose.model('Counter', new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  }));

  const result = await Counter.findOneAndUpdate(
    { _id: 'invoiceNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  const seqStr = String(result.seq).padStart(6, '0');
  return `CC-INV-${new Date().getFullYear()}-${seqStr}`;
}

/**
 * Creates an invoice for a completed job.
 * Idempotent – if an invoice already exists for the job, it is returned.
 */
async function generateInvoiceFromJob(job) {
  if (!job) throw ApiError.badRequest('Job is required');
  if (job.status !== 'COMPLETED') return null; // safety

  // Ensure one‑to‑one relationship
  const existing = await Invoice.findOne({ job: job._id });
  if (existing) return existing;

  // Load related data
  const bookingId = job.booking?._id || job.booking;
  const booking = await Booking.findById(bookingId).populate('quote');
  if (!booking) throw ApiError.internal('Related booking not found');
  const quote = booking.quote;
  const quoteId = quote ? (quote._id || quote) : null;

  // Amounts are stored as decimal in Quote/Booking. Convert to integer cents safely.
  const amountToBill = (quote && (quote.amount || quote.estimatedPrice)) !== undefined
    ? (quote.amount || quote.estimatedPrice)
    : booking.price;

  if (amountToBill === undefined || amountToBill === null) {
    throw ApiError.internal('Price missing for invoice calculation');
  }

  const subtotalCents = Math.round(Number(amountToBill) * 100);
  const taxCents = 0; // placeholder – can be extended with tax rules
  const platformFeeCents = 0; // placeholder – platform fee logic can be added
  const totalCents = subtotalCents + taxCents + platformFeeCents;

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = new Invoice({
    invoiceNumber,
    booking: booking._id,
    quote: quoteId,
    job: job._id,
    customer: booking.customer,
    provider: booking.provider,
    subtotal: subtotalCents,
    tax: taxCents,
    platformFee: platformFeeCents,
    totalAmount: totalCents,
    status: INVOICE_STATUS.ISSUED,
  });

  try {
    await invoice.save();

    try {
      const notificationService = require('./notification.service');
      await notificationService.createNotification({
        recipient: booking.customer,
        type: NOTIFICATION_TYPE.INVOICE_GENERATED,
        title: 'Invoice Issued',
        message: `An invoice (${invoice.invoiceNumber}) has been generated for your completed job.`,
        relatedBooking: booking._id,
        relatedJob: job._id,
        relatedInvoice: invoice._id,
      });
    } catch {
      // Non-blocking notification
    }

    return invoice;
  } catch (err) {
    if (err.code === 11000 && (err.keyPattern?.job || String(err.message).includes('job'))) {
      return Invoice.findOne({ job: job._id });
    }
    throw err;
  }
}

/** Retrieve a single invoice by its ID */
async function getInvoiceById(id, populate = []) {
  if (!id) throw ApiError.badRequest('Invoice ID required');
  const query = Invoice.findById(id);
  populate.forEach((p) => query.populate(p));
  const invoice = await query;
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

/** List invoices for a customer */
async function listCustomerInvoices(customerId, queryParams = {}) {
  const filter = { customer: customerId };
  if (queryParams.status) filter.status = queryParams.status;
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const total = await Invoice.countDocuments(filter);
  const items = await Invoice.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

/** List invoices for a provider */
async function listProviderInvoices(providerId, queryParams = {}) {
  const filter = { provider: providerId };
  if (queryParams.status) filter.status = queryParams.status;
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const total = await Invoice.countDocuments(filter);
  const items = await Invoice.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

/** List invoices for admin (no ownership filter) */
async function listAdminInvoices(queryParams = {}) {
  const filter = {};
  if (queryParams.status) filter.status = queryParams.status;
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const total = await Invoice.countDocuments(filter);
  const items = await Invoice.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

/** Transition invoice status – server‑side validation against VALID_INVOICE_TRANSITIONS */
async function transitionInvoiceStatus(invoiceId, newStatus) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (!isValidTransition(VALID_INVOICE_TRANSITIONS, invoice.status, newStatus)) {
    throw ApiError.badRequest(`Invalid invoice status transition from ${invoice.status} to ${newStatus}`);
  }
  invoice.status = newStatus;
  if (newStatus === INVOICE_STATUS.PAID) invoice.paidAt = new Date();
  await invoice.save();

  if (newStatus === INVOICE_STATUS.PAID) {
    try {
      const notificationService = require('./notification.service');
      await notificationService.createNotification({
        recipient: invoice.customer,
        type: NOTIFICATION_TYPE.INVOICE_PAID,
        title: 'Invoice Paid',
        message: `Your payment for invoice ${invoice.invoiceNumber} has been received.`,
        relatedBooking: invoice.booking,
        relatedJob: invoice.job,
        relatedInvoice: invoice._id,
      });
    } catch {
      // Non-blocking notification
    }
  }

  return invoice;
}

module.exports = {
  generateInvoiceFromJob,
  getInvoiceById,
  listCustomerInvoices,
  listProviderInvoices,
  listAdminInvoices,
  transitionInvoiceStatus,
};
