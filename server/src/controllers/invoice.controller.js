// src/controllers/invoice.controller.js

/**
 * Invoice Controller
 * Handles invoice retrieval, listings for different roles, and status transitions.
 */

const invoiceService = require('../services/invoice.service');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/apiError');

/** Get a single invoice by ID */
const getInvoiceById = async (req, res, next) => {
  try {
    // Populate optional related fields if needed (e.g., booking, job)
    const populate = [];
    const invoice = await invoiceService.getInvoiceById(req.params.id, populate);
    // Ownership checks based on role
    const userId = req.user._id;
    const role = req.user.role;
    if (role === 'CUSTOMER' && String(invoice.customer) !== String(userId)) {
      throw ApiError.forbidden('Customers can only access their own invoices');
    }
    if (role === 'SERVICE_PROVIDER' && String(invoice.provider) !== String(userId)) {
      throw ApiError.forbidden('Providers can only access their own invoices');
    }
    // Admin can access any invoice
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Invoice retrieved successfully',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

/** List invoices for the authenticated customer */
const listCustomerInvoices = async (req, res, next) => {
  try {
    const result = await invoiceService.listCustomerInvoices(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer invoices retrieved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** List invoices for the authenticated service provider */
const listProviderInvoices = async (req, res, next) => {
  try {
    const result = await invoiceService.listProviderInvoices(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider invoices retrieved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** List all invoices for admin (no ownership filter) */
const listAdminInvoices = async (req, res, next) => {
  try {
    const result = await invoiceService.listAdminInvoices(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'All invoices retrieved (admin)',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** Patch invoice status – admin only */
const patchInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      throw ApiError.badRequest('New status is required');
    }
    const invoice = await invoiceService.transitionInvoiceStatus(req.params.id, status);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Invoice status updated',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoiceById,
  listCustomerInvoices,
  listProviderInvoices,
  listAdminInvoices,
  patchInvoiceStatus,
};
