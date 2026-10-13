/**
 * Analytics Query Validation Schemas
 * Enforces date formats, date ordering (startDate <= endDate), and pagination limits.
 */

const { z } = require('zod');

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

const analyticsQuerySchema = z
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
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  })
  .refine(dateRangeValidation, {
    message: 'startDate must be less than or equal to endDate',
    path: ['startDate'],
  });

module.exports = {
  analyticsQuerySchema,
};
