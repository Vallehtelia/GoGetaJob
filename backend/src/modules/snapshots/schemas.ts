import { z } from 'zod';

// Create snapshot request
export const createSnapshotSchema = z.object({
  cvDocumentId: z.string().uuid('Invalid CV document ID'),
});

export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;

// Application ID param
export const applicationIdParamSchema = z.object({
  id: z.string().uuid('Invalid application ID'),
});

export type ApplicationIdParam = z.infer<typeof applicationIdParamSchema>;

// Snapshot ID param
export const snapshotIdParamSchema = z.object({
  id: z.string().uuid('Invalid snapshot ID'),
});

export type SnapshotIdParam = z.infer<typeof snapshotIdParamSchema>;
