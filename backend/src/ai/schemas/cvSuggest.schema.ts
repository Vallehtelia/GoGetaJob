import { z } from 'zod';

export const cvSuggestResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', minLength: 30, maxLength: 2000 },
    selections: {
      type: 'object',
      additionalProperties: false,
      properties: {
        workIds: {
          type: 'array',
          maxItems: 5,
          items: { type: 'string', minLength: 36, maxLength: 36 },
        },
        projectIds: {
          type: 'array',
          maxItems: 5,
          items: { type: 'string', minLength: 36, maxLength: 36 },
        },
        skillIds: {
          type: 'array',
          maxItems: 12,
          items: { type: 'string', minLength: 36, maxLength: 36 },
        },
        educationIds: {
          type: 'array',
          maxItems: 2,
          items: { type: 'string', minLength: 36, maxLength: 36 },
        },
      },
      required: ['workIds', 'projectIds', 'skillIds', 'educationIds'],
    },
  },
  required: ['summary', 'selections'],
} as const;

export const cvSuggestResponseZodSchema = z.object({
  summary: z.string().trim().min(30).max(2000),
  selections: z.object({
    workIds: z.array(z.string().uuid()).max(5),
    projectIds: z.array(z.string().uuid()).max(5),
    skillIds: z.array(z.string().uuid()).max(12),
    educationIds: z.array(z.string().uuid()).max(2),
  }),
});

export type CvSuggestResponse = z.infer<typeof cvSuggestResponseZodSchema>;

