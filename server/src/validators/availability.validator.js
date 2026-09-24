/**
 * Provider Availability Zod Validation Schemas
 */

const { z } = require('zod');
const { DAYS_OF_WEEK } = require('../constants/status');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createAvailabilitySchema = z
  .object({
    dayOfWeek: z.preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.enum(Object.values(DAYS_OF_WEEK), {
        errorMap: () => ({
          message: 'Invalid dayOfWeek. Must be MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, or SUNDAY',
        }),
      })
    ),
    startTime: z
      .string({ required_error: 'Start time is required' })
      .trim()
      .regex(timeRegex, 'Start time must be a valid 24-hour time in HH:mm format (00:00 - 23:59)'),
    endTime: z
      .string({ required_error: 'End time is required' })
      .trim()
      .regex(timeRegex, 'End time must be a valid 24-hour time in HH:mm format (00:00 - 23:59)'),
    isAvailable: z.boolean().optional().default(true),
    isBlocked: z.boolean().optional().default(false),
    blockedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be strictly after start time',
    path: ['endTime'],
  });

const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z.preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.enum(Object.values(DAYS_OF_WEEK)).optional()
    ),
    startTime: z.string().trim().regex(timeRegex, 'Start time must be HH:mm').optional(),
    endTime: z.string().trim().regex(timeRegex, 'End time must be HH:mm').optional(),
    isAvailable: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
    blockedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: 'End time must be strictly after start time',
      path: ['endTime'],
    }
  );

module.exports = {
  createAvailabilitySchema,
  updateAvailabilitySchema,
};
