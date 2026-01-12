import { z } from 'zod';

// CV Template enum
export const cvTemplateSchema = z.enum(['CLEAN_NAVY']);
export type CvTemplate = z.infer<typeof cvTemplateSchema>;

// ============ CV Document Schemas ============

export const createCvDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title must not exceed 120 characters').optional(),
  template: cvTemplateSchema.optional().default('CLEAN_NAVY'),
});

export type CreateCvDocumentInput = z.infer<typeof createCvDocumentSchema>;

export const updateCvDocumentSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  template: cvTemplateSchema.optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateCvDocumentInput = z.infer<typeof updateCvDocumentSchema>;

export const cvIdParamSchema = z.object({
  id: z.string().uuid('Invalid CV ID'),
});

export type CvIdParam = z.infer<typeof cvIdParamSchema>;

// ============ Inclusion Schemas ============

export const addInclusionSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  order: z.number().int().min(0).optional().default(0),
});

export type AddInclusionInput = z.infer<typeof addInclusionSchema>;

export const updateInclusionOrderSchema = z.object({
  order: z.number().int().min(0),
});

export type UpdateInclusionOrderInput = z.infer<typeof updateInclusionOrderSchema>;

export const inclusionIdParamSchema = z.object({
  id: z.string().uuid('Invalid CV ID'),
  itemId: z.string().uuid('Invalid item ID'),
});

export type InclusionIdParam = z.infer<typeof inclusionIdParamSchema>;
