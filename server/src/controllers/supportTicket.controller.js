/**
 * Support Ticket Controller
 * REST HTTP endpoints for ticket lifecycle, conversation threads, assignments, and priorities.
 */

const supportTicketService = require('../services/supportTicket.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Customer or Provider submits a support ticket
 */
const createTicket = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.createTicket(req.user, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Support ticket created successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single ticket detail with role-authorized messages
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.getTicketById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket details retrieved successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List support tickets scoped to caller role
 */
const listTickets = async (req, res, next) => {
  try {
    const result = await supportTicketService.listTickets(req.user, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support tickets retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Post reply or staff internal note to a ticket
 */
const addMessage = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.addMessage(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Message added to support ticket successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket state machine status
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.updateTicketStatus(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket status updated successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket priority (Staff only)
 */
const updateTicketPriority = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.updateTicketPriority(
      req.params.id,
      req.user,
      req.body.priority
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket priority updated successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign ticket to staff member (Staff only)
 */
const assignTicket = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.assignTicket(
      req.params.id,
      req.user,
      req.body.assignedTo
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket assigned successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close an active ticket
 */
const closeTicket = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.closeTicket(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Support ticket closed successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

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
