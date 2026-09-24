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
const { INVOICE_STATUS, VALID_INVOICE_TRANSITIONS, isValidTransition } = require('../constants/status');
const { ApiError } = require('../utils/apiError');

/**
 * Generates a unique invoice number.
 * Format: CC-INV-YYYY-XXXXXX where XXXXXX is a zero‑padded incremental counter.
 * Uses a MongoDB collection "counters" to store the next sequence value.
 */
async function generateInvoiceNumber() {
  const Counter = mongoose.model('Counter', new mongoose.Schema({
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
  const booking = await Booking.findById(job.booking).populate('quote');
  if (!booking) throw ApiError.internal('Related booking not found');
  const quote = booking.quote;
  if (!quote) throw ApiError.internal('Quote missing for invoice calculation');

  // Amounts are stored in the Quote as a decimal. Convert to cents safely.
  const subtotalCents = Math.round((quote.amount || 0) * 100);
  const taxCents = 0; // placeholder – can be extended with tax rules
  const platformFeeCents = 0; // placeholder – platform fee logic can be added
  const totalCents = subtotalCents + taxCents + platformFeeCents;

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = new Invoice({
    invoiceNumber,
    booking: booking._id,
    job: job._id,
    customer: booking.customer,
    provider: booking.provider,
    subtotal: subtotalCents,
    tax: taxCents,
    platformFee: platformFeeCents,
    totalAmount: totalCents,
    status: INVOICE_STATUS.ISSUED,
  });

  await invoice.save();
  return invoice;
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
