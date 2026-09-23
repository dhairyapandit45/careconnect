/**
 * Service Category Input Validation Schemas
 */

const { z } = require('zod');
const { PRICING_UNITS } = require('../models/ServiceCategory');

const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters long')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .default(''),
  icon: z
    .string()
    .trim()
    .optional()
    .default('Wrench'),
  startingPrice: z
    .coerce
    .number()
    .min(0, 'Starting price cannot be negative')
    .optional()
    .default(0),
  pricingUnit: z
    .enum(PRICING_UNITS)
    .optional()
    .default('STARTING_FROM'),
  requiredSkills: z
    .array(z.string().trim())
    .optional()
    .default([]),
  isActive: z
    .boolean()
    .optional()
    .default(true),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
