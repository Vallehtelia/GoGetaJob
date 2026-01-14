import { z } from 'zod';

export const sessionStartSchema = z.object({
  sessionId: z.string().uuid().optional(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export const pageviewSchema = z.object({
  sessionId: z.string().uuid(),
  path: z
    .string()
    .min(1)
    .max(500)
    .refine((p) => p.startsWith('/'), { message: 'path must start with /' }),
});

