/**
 * Quote Input Zod Validation Schemas
 */

const { z } = require('zod');

const isFutureDate = (val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  return d > new Date();
};

const createQuoteSchema = z
  .object({
    amount: z
      .number({ required_error: 'Quote amount is required' })
      .positive('Quote amount must be greater than zero')
      .or(z.undefined()),
    estimatedPrice: z.number().positive().optional(),
    currency: z
      .enum(['INR'], {
        errorMap: () => ({ message: 'Currency must be INR' }),
      })
      .optional()
      .default('INR'),
    estimatedDuration: z
      .number({ required_error: 'Estimated duration in hours is required' })
      .positive('Estimated duration must be positive')
      .or(z.undefined()),
    estimatedDurationHours: z.number().positive().optional(),
    description: z
      .string({ required_error: 'Quote description is required' })
      .trim()
      .min(5, 'Description must be at least 5 characters long')
      .max(2000, 'Description cannot exceed 2000 characters')
      .or(z.undefined()),
    message: z.string().trim().min(5).max(2000).optional(),
    validUntil: z
      .string({ required_error: 'Valid until date/time is required' })
      .refine(isFutureDate, { message: 'validUntil date must be in the future' })
      .or(z.undefined()),
    expiresAt: z
      .string()
      .refine(isFutureDate, { message: 'expiresAt date must be in the future' })
      .optional(),
  })
  .refine((data) => data.amount !== undefined || data.estimatedPrice !== undefined, {
    message: 'Quote amount is required and must be greater than zero',
    path: ['amount'],
  })
  .refine(
    (data) => data.estimatedDuration !== undefined || data.estimatedDurationHours !== undefined,
    {
      message: 'Estimated duration is required and must be positive',
      path: ['estimatedDuration'],
    }
  )
  .refine((data) => data.description !== undefined || data.message !== undefined, {
    message: 'Description must be at least 5 characters long',
    path: ['description'],
  })
  .refine((data) => data.validUntil !== undefined || data.expiresAt !== undefined, {
    message: 'validUntil date is required and must be in the future',
    path: ['validUntil'],
  });

module.exports = {
  createQuoteSchema,
};
