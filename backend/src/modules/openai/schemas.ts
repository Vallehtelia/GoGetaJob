import { z } from 'zod';

// Set OpenAI API Key
export const setApiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, 'API key must be at least 20 characters')
    .refine(
      (key) => key.startsWith('sk-') || key.startsWith('sk-proj-'),
      'API key must start with "sk-" or "sk-proj-"'
    ),
});

export type SetApiKeyInput = z.infer<typeof setApiKeySchema>;
