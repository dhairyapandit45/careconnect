/**
 * AI Service Request Validation Schemas
 * Validates inputs for category classification and provider matching endpoints.
 */

const { z } = require('zod');

// Helper to check valid Mongo ObjectId format
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const classifyRequestSchema = z
  .object({
    title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional(),
    description: z.string().trim().max(3000, 'Description cannot exceed 3000 characters').optional(),
    text: z.string().trim().max(3000, 'Text cannot exceed 3000 characters').optional(),
  })
  .refine(
    (data) => Boolean((data.title && data.title.length > 0) || (data.description && data.description.length > 0) || (data.text && data.text.length > 0)),
    {
      message: 'At least one of title, description, or text must be provided for classification',
      path: ['text'],
    }
  );

const matchProvidersSchema = z.object({
  categoryId: z
    .string()
    .trim()
    .regex(objectIdRegex, 'categoryId must be a valid 24-character hexadecimal ObjectId'),
  city: z.string().trim().max(100).optional(),
  preferredDate: z.string().trim().optional(),
  urgency: z.enum(['STANDARD', 'URGENT', 'SAME_DAY']).optional().default('STANDARD'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(5),
});

module.exports = {
  classifyRequestSchema,
  matchProvidersSchema,
};
