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

// ============ Canvas State Schemas (Freeform CV editor) ============

const canvasBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(['HEADER', 'SUMMARY', 'WORK', 'PROJECTS', 'SKILLS', 'EDUCATION']),
  x: z.number().min(0).max(5000),
  y: z.number().min(0).max(5000),
  w: z.number().min(50).max(5000),
  h: z.number().min(30).max(5000),
  fontScale: z.number().min(0.5).max(2.5).default(1),
  content: z.object({
    text: z.string().max(8000),
  }),
});

export const canvasStateSchema = z.object({
  version: z.number().int().min(1).max(10),
  page: z.object({
    format: z.enum(['A4']).default('A4'),
    width: z.number().int().min(300).max(2000),
    height: z.number().int().min(300).max(3000),
  }),
  blocks: z.array(canvasBlockSchema).min(1).max(12),
});

export const updateCvDocumentSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  template: cvTemplateSchema.optional(),
  isDefault: z.boolean().optional(),
  overrideSummary: z
    .string()
    .trim()
    .max(2000, 'Summary must not exceed 2000 characters')
    .optional()
    .nullable(),
  canvasState: canvasStateSchema.optional().nullable(),
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
