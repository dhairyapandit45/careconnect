/**
 * Dispute Controller
 * REST HTTP handlers for raising, listing, inspecting, cancelling, and resolving disputes.
 */

const disputeService = require('../services/dispute.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Customer or Provider submits a dispute for a Job
 */
const createDispute = async (req, res, next) => {
  try {
    const dispute = await disputeService.createDispute(req.user, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Dispute submitted successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single dispute by ID with authorized tenant isolation
 */
const getDisputeById = async (req, res, next) => {
  try {
    const dispute = await disputeService.getDisputeById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dispute details retrieved successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List disputes scoped by user role (Customer, Provider, or Operations/Admin)
 */
const listDisputes = async (req, res, next) => {
  try {
    const result = await disputeService.listDisputes(req.user, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Disputes retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an open dispute (Customer or Provider who raised it)
 */
const cancelDispute = async (req, res, next) => {
  try {
    const dispute = await disputeService.cancelDispute(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dispute cancelled successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update dispute status through controlled state transitions (Admin/Operations)
 */
const updateDisputeStatus = async (req, res, next) => {
  try {
    const dispute = await disputeService.updateDisputeStatus(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dispute status updated successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDispute,
  getDisputeById,
  listDisputes,
  cancelDispute,
  updateDisputeStatus,
};
