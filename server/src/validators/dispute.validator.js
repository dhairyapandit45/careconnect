/**
 * Dispute Input Validation Schemas
 * Enforces strict input validation for dispute submission, state transitions, and cancellation.
 */

const { z } = require('zod');
const { DISPUTE_STATUS } = require('../constants/status');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createDisputeSchema = z
  .object({
    jobId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Invalid jobId format')
      .optional(),
    bookingId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Invalid bookingId format')
      .optional(),
    job: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Invalid job ID format')
      .optional(),
    booking: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Invalid booking ID format')
      .optional(),
    reason: z
      .string({ required_error: 'Dispute reason is required' })
      .trim()
      .min(3, 'Reason must be at least 3 characters long')
      .max(100, 'Reason cannot exceed 100 characters'),
    category: z
      .string()
      .trim()
      .max(50, 'Category cannot exceed 50 characters')
      .optional()
      .default('GENERAL'),
    description: z
      .string({ required_error: 'Dispute description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters'),
  })
  .refine(
    (data) => Boolean(data.jobId || data.bookingId || data.job || data.booking),
    {
      message: 'Either jobId or bookingId is required',
      path: ['jobId'],
    }
  );

const updateDisputeStatusSchema = z.object({
  status: z.enum(
    [
      DISPUTE_STATUS.UNDER_REVIEW,
      DISPUTE_STATUS.RESOLVED,
      DISPUTE_STATUS.REJECTED,
      DISPUTE_STATUS.CANCELLED,
    ],
    {
      errorMap: () => ({
        message: 'Invalid status. Permitted values: UNDER_REVIEW, RESOLVED, REJECTED, CANCELLED',
      }),
    }
  ),
  resolutionNotes: z
    .string()
    .trim()
    .max(2000, 'Resolution notes cannot exceed 2000 characters')
    .optional(),
  refundApproved: z.boolean().optional(),
  refundAmount: z
    .number()
    .min(0, 'Refund amount cannot be negative')
    .optional(),
});

const cancelDisputeSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, 'Cancellation reason cannot exceed 1000 characters')
    .optional(),
});

module.exports = {
  createDisputeSchema,
  updateDisputeStatusSchema,
  cancelDisputeSchema,
};
