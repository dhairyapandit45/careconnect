// Jobs Routes - defines API endpoints for Job resource
const express = require('express');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');
const jobController = require('../../controllers/job.controller');

const router = express.Router();

// All job routes require authentication
router.use(authenticate);

// Customer routes
router.get('/my', authorize(ROLES.CUSTOMER), requirePermission('jobs:track:own'), jobController.listCustomerJobs);
router.get('/:id', authorize(ROLES.CUSTOMER, ROLES.SERVICE_PROVIDER), jobController.getJobById);
router.post('/:id/confirm', authorize(ROLES.CUSTOMER), requirePermission('jobs:track:own'), jobController.confirm);

// Provider routes
router.post('/:id/checkin', authorize(ROLES.SERVICE_PROVIDER), requirePermission('jobs:manage:assigned'), jobController.checkIn);
router.post('/:id/start', authorize(ROLES.SERVICE_PROVIDER), requirePermission('jobs:manage:assigned'), jobController.start);
router.post('/:id/complete', authorize(ROLES.SERVICE_PROVIDER), requirePermission('jobs:manage:assigned'), jobController.complete);

module.exports = router;
