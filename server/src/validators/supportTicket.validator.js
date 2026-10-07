/**
 * Support Ticket Input Validation Schemas
 * Enforces strict input validation for ticket submission, conversations, priority, assignment, and status.
 */

const { z } = require('zod');
const {
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_CATEGORY,
} = require('../constants/status');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createTicketSchema = z.object({
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(5, 'Subject must be at least 5 characters long')
    .max(150, 'Subject cannot exceed 150 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters long')
    .max(3000, 'Description cannot exceed 3000 characters'),
  category: z
    .enum(Object.values(SUPPORT_TICKET_CATEGORY), {
      errorMap: () => ({
        message: `Invalid category. Permitted values: ${Object.values(SUPPORT_TICKET_CATEGORY).join(', ')}`,
      }),
    })
    .optional()
    .default(SUPPORT_TICKET_CATEGORY.OTHER),
  priority: z
    .enum(Object.values(SUPPORT_TICKET_PRIORITY), {
      errorMap: () => ({
        message: `Invalid priority. Permitted values: ${Object.values(SUPPORT_TICKET_PRIORITY).join(', ')}`,
      }),
    })
    .optional()
    .default(SUPPORT_TICKET_PRIORITY.MEDIUM),
  relatedBookingId: z.string().trim().regex(objectIdRegex, 'Invalid relatedBookingId format').optional(),
  bookingId: z.string().trim().regex(objectIdRegex, 'Invalid bookingId format').optional(),
  relatedBooking: z.string().trim().regex(objectIdRegex, 'Invalid relatedBooking format').optional(),
  relatedJobId: z.string().trim().regex(objectIdRegex, 'Invalid relatedJobId format').optional(),
  jobId: z.string().trim().regex(objectIdRegex, 'Invalid jobId format').optional(),
  relatedJob: z.string().trim().regex(objectIdRegex, 'Invalid relatedJob format').optional(),
  relatedDisputeId: z.string().trim().regex(objectIdRegex, 'Invalid relatedDisputeId format').optional(),
  disputeId: z.string().trim().regex(objectIdRegex, 'Invalid disputeId format').optional(),
  relatedDispute: z.string().trim().regex(objectIdRegex, 'Invalid relatedDispute format').optional(),
});

const addMessageSchema = z.object({
  message: z
    .string({ required_error: 'Message body is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
  isInternal: z.boolean().optional().default(false),
});

const updateTicketStatusSchema = z.object({
  status: z.enum(Object.values(SUPPORT_TICKET_STATUS), {
    errorMap: () => ({
      message: `Invalid status. Permitted values: ${Object.values(SUPPORT_TICKET_STATUS).join(', ')}`,
    }),
  }),
  resolutionNotes: z
    .string()
    .trim()
    .max(2000, 'Resolution notes cannot exceed 2000 characters')
    .optional(),
});

const updateTicketPrioritySchema = z.object({
  priority: z.enum(Object.values(SUPPORT_TICKET_PRIORITY), {
    errorMap: () => ({
      message: `Invalid priority. Permitted values: ${Object.values(SUPPORT_TICKET_PRIORITY).join(', ')}`,
    }),
  }),
});

const assignTicketSchema = z.object({
  assignedTo: z
    .string({ required_error: 'assignedTo user ID is required' })
    .trim()
    .regex(objectIdRegex, 'Invalid assignedTo user ID format'),
});

const closeTicketSchema = z.object({
  resolutionNotes: z
    .string()
    .trim()
    .max(2000, 'Resolution notes cannot exceed 2000 characters')
    .optional(),
});

module.exports = {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
  updateTicketPrioritySchema,
  assignTicketSchema,
  closeTicketSchema,
};
