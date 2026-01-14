import { z } from 'zod';

export const adminFeedbackQuerySchema = z.object({
  type: z.enum(['bug', 'feature', 'other']).optional(),
  q: z.string().max(100).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export type AdminFeedbackQuery = z.infer<typeof adminFeedbackQuerySchema>;

