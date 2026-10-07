/**
 * Review Zod Validation Schemas
 * Enforces strict input validation for review submission and updates.
 */

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createReviewSchema = z
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
    rating: z
      .number({ required_error: 'Rating is required' })
      .int('Rating must be an integer between 1 and 5')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z
      .string()
      .trim()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional()
      .default(''),
  })
  .refine(
    (data) => Boolean(data.jobId || data.bookingId || data.job || data.booking),
    {
      message: 'Either jobId or bookingId is required',
      path: ['jobId'],
    }
  );

const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .int('Rating must be an integer between 1 and 5')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5')
      .optional(),
    comment: z
      .string()
      .trim()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional(),
  })
  .refine(
    (data) => data.rating !== undefined || data.comment !== undefined,
    {
      message: 'At least one field (rating or comment) must be provided for update',
    }
  );

module.exports = {
  createReviewSchema,
  updateReviewSchema,
};
