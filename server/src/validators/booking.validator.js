/**
 * Booking Zod Validation Schemas
 */

const { z } = require('zod');

const isIsoDate = (val) => {
  const d = new Date(val);
  return !isNaN(d.getTime());
};

const isFutureDate = (val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
};

const acceptQuoteAndBookSchema = z
  .object({
    scheduledStart: z
      .string({ required_error: 'scheduledStart is required' })
      .refine(isIsoDate, { message: 'scheduledStart must be a valid ISO date string' })
      .refine(isFutureDate, { message: 'scheduledStart must be in the future' }),
    scheduledEnd: z
      .string({ required_error: 'scheduledEnd is required' })
      .refine(isIsoDate, { message: 'scheduledEnd must be a valid ISO date string' }),
  })
  .refine(
    (data) => {
      const start = new Date(data.scheduledStart);
      const end = new Date(data.scheduledEnd);
      return end > start;
    },
    {
      message: 'scheduledEnd must be after scheduledStart',
      path: ['scheduledEnd'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.scheduledStart);
      const end = new Date(data.scheduledEnd);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return diffHours <= 24;
    },
    {
      message: 'Booking duration cannot exceed 24 hours',
      path: ['scheduledEnd'],
    }
  );

const cancelBookingSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .trim()
    .min(5, 'Cancellation reason must be at least 5 characters long')
    .max(1000, 'Cancellation reason cannot exceed 1000 characters'),
});

module.exports = {
  acceptQuoteAndBookSchema,
  cancelBookingSchema,
};
