import { z } from 'zod';

// Application status enum
export const applicationStatusSchema = z.enum([
  'DRAFT',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

// Create application schema
export const createApplicationSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(200),
  position: z.string().min(1, 'Position is required').max(200),
  link: z
    .string()
    .url('Invalid URL format')
    .max(500)
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  status: applicationStatusSchema.optional().default('APPLIED'),
  appliedAt: z
    .string()
    .datetime()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  lastContactAt: z
    .string()
    .datetime()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  notes: z.string().max(10000, 'Notes must not exceed 10,000 characters').optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// Update application schema (all fields optional)
export const updateApplicationSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  link: z
    .union([
      z.string().url('Invalid URL format').max(500),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === '' || val === null ? undefined : val)),
  status: applicationStatusSchema.optional(),
  appliedAt: z
    .union([
      z.string().datetime(),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === '' || val === null ? undefined : val)),
  lastContactAt: z
    .union([
      z.string().datetime(),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === '' || val === null ? undefined : val)),
  notes: z
    .union([
      z.string().max(10000, 'Notes must not exceed 10,000 characters'),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

// Application ID param schema
export const applicationIdParamSchema = z.object({
  id: z.string().uuid('Invalid application ID'),
});

export type ApplicationIdParam = z.infer<typeof applicationIdParamSchema>;

// List applications query schema
export const listApplicationsQuerySchema = z.object({
  status: z
    .union([
      z.string(),
      z.array(z.string()),
    ])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      // Handle array of statuses
      if (Array.isArray(val)) {
        return val;
      }
      // Handle comma-separated string
      return val.split(',').map((s) => s.trim());
    }),
  q: z.string().max(200).optional(), // Search query (q param)
  search: z.string().max(200).optional(), // Search query (search param - frontend uses this)
  sort: z.enum(['createdAt', 'updatedAt', 'appliedAt']).optional().default('createdAt'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'appliedAt']).optional(), // Frontend uses this
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  pageSize: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(parseInt(val, 10), 100)), // Max 100
})
.transform((val) => ({
  ...val,
  // Prefer search over q
  q: val.search || val.q,
  // Prefer sortBy over sort
  sort: val.sortBy || val.sort,
}));

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;


