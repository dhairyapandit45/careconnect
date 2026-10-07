// src/routes/v1/invoice.routes.js

const express = require('express');
const {
  getInvoiceById,
  listCustomerInvoices,
  listProviderInvoices,
  listAdminInvoices,
  patchInvoiceStatus,
} = require('../../controllers/invoice.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

// Provider routes (prefixed with /provider)
router.get('/provider', authenticate, authorize(ROLES.SERVICE_PROVIDER), listProviderInvoices);
router.get('/provider/:id', authenticate, authorize(ROLES.SERVICE_PROVIDER), getInvoiceById);

// Admin routes (prefixed with /admin)
router.get('/admin', authenticate, authorize(ROLES.PLATFORM_ADMIN), listAdminInvoices);
router.get('/admin/:id', authenticate, authorize(ROLES.PLATFORM_ADMIN), getInvoiceById);
router.patch('/:id/status', authenticate, authorize(ROLES.PLATFORM_ADMIN), patchInvoiceStatus);

// Customer list route (requires CUSTOMER role)
router.get('/', authenticate, authorize(ROLES.CUSTOMER), listCustomerInvoices);

// Shared detail route (allows CUSTOMER, SERVICE_PROVIDER, and PLATFORM_ADMIN with ownership check in controller)
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.SERVICE_PROVIDER, ROLES.PLATFORM_ADMIN),
  getInvoiceById
);

module.exports = router;
