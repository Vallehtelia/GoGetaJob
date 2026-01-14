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

// ============================
// AI CV Suggest + Apply schemas
// ============================

export const aiCvSuggestionSchema = z.object({
  summary: z.string().trim().min(30).max(2000),
  selections: z.object({
    workIds: z.array(z.string().uuid()).max(5).default([]),
    projectIds: z.array(z.string().uuid()).max(5).default([]),
    skillIds: z.array(z.string().uuid()).max(12).default([]),
    educationIds: z.array(z.string().uuid()).max(2).default([]),
  }),
}).superRefine((val, ctx) => {
  const uniq = (arr: string[]) => new Set(arr).size === arr.length;
  if (!uniq(val.selections.workIds)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate workIds" });
  if (!uniq(val.selections.projectIds)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate projectIds" });
  if (!uniq(val.selections.skillIds)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate skillIds" });
  if (!uniq(val.selections.educationIds)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate educationIds" });
});

export type AiCvSuggestion = z.infer<typeof aiCvSuggestionSchema>;

export const suggestCvSchema = z.object({
  cvId: z.string().uuid(),
  jobPosting: z.string().trim().min(50).max(12000),
  mode: z.enum(['replace', 'augment']).optional(),
});

export type SuggestCvInput = z.infer<typeof suggestCvSchema>;

export const applyCvSuggestionSchema = z.object({
  cvId: z.string().uuid(),
  suggestion: aiCvSuggestionSchema,
  replaceSelection: z.boolean().optional().default(true),
});

export type ApplyCvSuggestionInput = z.infer<typeof applyCvSuggestionSchema>;
