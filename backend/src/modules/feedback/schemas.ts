import { z } from 'zod';

export const feedbackTypeSchema = z.enum(['bug', 'feature', 'other']);

export const submitFeedbackSchema = z.object({
  type: feedbackTypeSchema,
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message too long'),
  pagePath: z.string().max(500, 'pagePath too long').optional(),
  userAgent: z.string().max(500, 'userAgent too long').optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

