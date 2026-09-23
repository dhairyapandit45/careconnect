/**
 * Authentication Input Validation Schemas
 */

const { z } = require('zod');
const { ALL_ROLES, ROLES } = require('../constants/roles');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long'),
  phone: z.string().trim().optional().default(''),
  role: z
    .enum(ALL_ROLES, {
      errorMap: () => ({ message: `Role must be one of: ${ALL_ROLES.join(', ')}` }),
    })
    .optional()
    .default(ROLES.CUSTOMER),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
