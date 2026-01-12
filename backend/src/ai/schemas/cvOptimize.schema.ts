/**
 * JSON Schema for OpenAI Structured Outputs
 * Used for CV summary generation with strict validation
 */
export const cvOptimizeResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      minLength: 200,
      maxLength: 1400,
      description: 'Professional summary tailored to the job posting, 600-1200 characters',
    },
    keySkills: {
      type: 'array',
      minItems: 6,
      maxItems: 12,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 60,
        description: 'Key skill that matches the job requirements',
      },
      description: '6-12 key skills relevant to the job posting',
    },
    roleFitBullets: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'string',
        minLength: 8,
        maxLength: 140,
        description: 'Bullet point explaining how candidate fits the role',
      },
      description: '3-6 bullet points mapping candidate experience to job requirements',
    },
  },
  required: ['summary', 'keySkills', 'roleFitBullets'],
} as const;

/**
 * Zod schema for server-side validation of OpenAI response
 */
import { z } from 'zod';

export const cvOptimizeResponseZodSchema = z.object({
  summary: z.string().min(200).max(1400),
  keySkills: z.array(z.string().min(1).max(60)).min(6).max(12),
  roleFitBullets: z.array(z.string().min(8).max(140)).min(3).max(6),
});

export type CvOptimizeResponse = z.infer<typeof cvOptimizeResponseZodSchema>;
