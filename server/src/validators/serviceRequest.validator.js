/**
 * Service Request Input Validation Schemas
 */

const { z } = require('zod');

const isNotPastDate = (dateVal) => {
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate >= today;
};

const createServiceRequestSchema = z.object({
  categoryId: z
    .string({ required_error: 'Service category is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID format'),
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters long')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string({ required_error: 'Problem description is required' })
    .trim()
    .min(15, 'Description must be at least 15 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  address: z
    .string({ required_error: 'Street address is required' })
    .trim()
    .min(3, 'Address must be at least 3 characters long')
    .max(200, 'Address cannot exceed 200 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters long')
    .max(100, 'City cannot exceed 100 characters'),
  postalCode: z
    .string({ required_error: 'Postal code is required' })
    .trim()
    .min(3, 'Postal code must be at least 3 characters long')
    .max(20, 'Postal code cannot exceed 20 characters'),
  state: z
    .string()
    .trim()
    .optional()
    .default(''),
  preferredDate: z
    .string({ required_error: 'Preferred date is required' })
    .refine(isNotPastDate, {
      message: 'Preferred date cannot be in the past',
    }),
  preferredTime: z
    .object({
      start: z.string().optional().default('09:00'),
      end: z.string().optional().default('12:00'),
    })
    .optional()
    .default({ start: '09:00', end: '12:00' }),
  preferredTimeSlot: z
    .string()
    .optional()
    .default('MORNING'),
  requiredSkills: z
    .array(z.string().trim())
    .optional()
    .default([]),
});

module.exports = {
  createServiceRequestSchema,
};
