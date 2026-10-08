/**
 * Administrative & Operations Zod Validation Schemas
 * Enforces input sanitation, enum constraints, pagination limits, and date range validity.
 */

const { z } = require('zod');
const { ALL_ROLES } = require('../constants/roles');
const {
  USER_STATUS,
  BOOKING_STATUS,
  JOB_STATUS,
} = require('../constants/status');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates that string can be parsed into a real Date
 */
const isValidDateString = (val) => {
  if (!val) return true;
  const d = new Date(val);
  return !isNaN(d.getTime());
};

const dateRangeValidation = (data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate).getTime() <= new Date(data.endDate).getTime();
  }
  return true;
};

/**
 * Update user account status
 */
const updateUserStatusSchema = z.object({
  status: z.enum(Object.values(USER_STATUS), {
    errorMap: () => ({
      message: `Status must be one of: ${Object.values(USER_STATUS).join(', ')}`,
    }),
  }),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

/**
 * Query schema for listing users
 */
const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  role: z.enum(ALL_ROLES).optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  search: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

/**
 * Query schema for operational bookings
 */
const bookingQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    status: z.enum(Object.values(BOOKING_STATUS)).optional(),
    startDate: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'startDate must be a valid date' })
      .optional(),
    endDate: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'endDate must be a valid date' })
      .optional(),
    provider: z.string().regex(objectIdRegex, 'Invalid provider ID format').optional(),
    customer: z.string().regex(objectIdRegex, 'Invalid customer ID format').optional(),
    category: z.string().trim().optional(),
  })
  .refine(dateRangeValidation, {
    message: 'startDate must be less than or equal to endDate',
    path: ['startDate'],
  });

/**
 * Query schema for operational jobs
 */
const jobQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    status: z.enum(Object.values(JOB_STATUS)).optional(),
    startDate: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'startDate must be a valid date' })
      .optional(),
    endDate: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'endDate must be a valid date' })
      .optional(),
    provider: z.string().regex(objectIdRegex, 'Invalid provider ID format').optional(),
    customer: z.string().regex(objectIdRegex, 'Invalid customer ID format').optional(),
  })
  .refine(dateRangeValidation, {
    message: 'startDate must be less than or equal to endDate',
    path: ['startDate'],
  });

/**
 * Query schema for platform dashboard and analytics
 */
const statsQuerySchema = z
  .object({
    startDate: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'startDate must be a valid date' })
      .optional(),
    endDate: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'endDate must be a valid date' })
      .optional(),
  })
  .refine(dateRangeValidation, {
    message: 'startDate must be less than or equal to endDate',
    path: ['startDate'],
  });

module.exports = {
  updateUserStatusSchema,
  userQuerySchema,
  bookingQuerySchema,
  jobQuerySchema,
  statsQuerySchema,
};
