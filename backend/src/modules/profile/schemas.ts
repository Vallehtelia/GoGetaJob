// Profile validation schemas

import { z } from 'zod';

// Profile response schema (what we return to client)
export const profileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;

// Update profile schema (PATCH /profile)
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .max(100, 'First name must be 100 characters or less')
    .trim()
    .optional()
    .nullable(),
  lastName: z
    .string()
    .max(100, 'Last name must be 100 characters or less')
    .trim()
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(50, 'Phone must be 50 characters or less')
    .trim()
    .optional()
    .nullable(),
  location: z
    .string()
    .max(120, 'Location must be 120 characters or less')
    .trim()
    .optional()
    .nullable(),
  headline: z
    .string()
    .max(160, 'Headline must be 160 characters or less')
    .trim()
    .optional()
    .nullable(),
  summary: z
    .string()
    .max(2000, 'Summary must be 2000 characters or less')
    .trim()
    .optional()
    .nullable(),
  linkedinUrl: z
    .union([
      z.string().url('Invalid URL format').max(300),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === '' || val === null ? null : val)),
  githubUrl: z
    .union([
      z.string().url('Invalid URL format').max(300),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === '' || val === null ? null : val)),
  websiteUrl: z
    .union([
      z.string().url('Invalid URL format').max(300),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === '' || val === null ? null : val)),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
