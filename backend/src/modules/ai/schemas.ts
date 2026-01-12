import { z } from 'zod';

export const optimizeCvSchema = z.object({
  cvId: z.string().uuid('Invalid CV ID format'),
  jobPostingText: z
    .string()
    .trim()
    .min(50, 'Job posting must be at least 50 characters')
    .max(12000, 'Job posting must not exceed 12000 characters'),
});

export type OptimizeCvInput = z.infer<typeof optimizeCvSchema>;

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must not exceed 2000 characters'),
  conversationId: z.string().uuid().optional(), // For maintaining conversation context
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
