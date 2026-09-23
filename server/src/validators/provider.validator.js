/**
 * Provider Profile & Verification Zod Validation Schemas
 */

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const serviceAreaSchema = z.object({
  city: z.string({ required_error: 'City is required' }).trim().min(2, 'City name must be at least 2 characters'),
  areas: z.array(z.string().trim().min(2)).optional().default([]),
});

const pricingSchema = z.object({
  model: z.enum(['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE_REQUIRED'], {
    errorMap: () => ({ message: 'Pricing model must be FIXED, HOURLY, STARTING_FROM, or QUOTE_REQUIRED' }),
  }).default('HOURLY'),
  minimumCharge: z.number().min(0, 'Minimum charge cannot be negative').default(0),
  hourlyRate: z.number().min(0, 'Hourly rate cannot be negative').default(0),
});

const documentSchema = z.object({
  type: z.enum(['IDENTITY', 'ADDRESS_PROOF', 'CERTIFICATION', 'BUSINESS_LICENSE', 'OTHER']).default('OTHER'),
  name: z.string().trim().min(1, 'Document name is required'),
  url: z.string().trim().min(1, 'Document URL is required'),
});

const createProviderProfileSchema = z.object({
  businessName: z
    .string({ required_error: 'Business name is required' })
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(120, 'Business name cannot exceed 120 characters'),
  description: z
    .string({ required_error: 'Business description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  skills: z
    .array(z.string().trim().min(2, 'Skill name must be at least 2 characters'))
    .min(1, 'At least one professional skill must be selected'),
  serviceCategories: z
    .array(
      z.string().regex(objectIdRegex, 'Each category ID must be a valid 24-character hexadecimal ObjectId')
    )
    .min(1, 'At least one service category must be selected'),
  serviceAreas: z
    .array(serviceAreaSchema)
    .min(1, 'At least one service area / city must be specified'),
  experienceYears: z
    .number({ required_error: 'Years of experience is required' })
    .int('Experience years must be an integer')
    .min(0, 'Experience years cannot be negative')
    .max(60, 'Experience years cannot exceed 60'),
  pricing: pricingSchema.optional(),
  hourlyRate: z.number().min(0, 'Hourly rate cannot be negative').optional(),
  documents: z.array(documentSchema).optional().default([]),
});

const updateProviderProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  skills: z.array(z.string().trim().min(2)).optional(),
  serviceCategories: z.array(z.string().regex(objectIdRegex)).optional(),
  serviceAreas: z.array(serviceAreaSchema).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  pricing: pricingSchema.optional(),
  hourlyRate: z.number().min(0).optional(),
  documents: z.array(documentSchema).optional(),
  isAvailable: z.boolean().optional(),
});

const verifyProviderSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REQUEST_REVIEW']).optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'UNDER_REVIEW']).optional(),
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
}).refine((data) => data.action || data.status, {
  message: 'Either action (APPROVE, REJECT, SUSPEND, REQUEST_REVIEW) or status (APPROVED, REJECTED, SUSPENDED, UNDER_REVIEW) must be provided',
});

module.exports = {
  createProviderProfileSchema,
  updateProviderProfileSchema,
  verifyProviderSchema,
};
