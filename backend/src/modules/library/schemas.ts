import { z } from 'zod';

// Skill Level enum
export const skillLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
export type SkillLevel = z.infer<typeof skillLevelSchema>;

// ============ Work Experience Schemas ============

export const createWorkExperienceSchema = z.object({
  company: z.string().min(1, 'Company is required').max(200),
  role: z.string().min(1, 'Role is required').max(200),
  location: z.string().max(120).optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().max(3000, 'Description must not exceed 3000 characters').optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type CreateWorkExperienceInput = z.infer<typeof createWorkExperienceSchema>;

export const updateWorkExperienceSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(200).optional(),
  location: z.union([z.string().max(120), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  isCurrent: z.boolean().optional(),
  description: z.union([z.string().max(3000), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type UpdateWorkExperienceInput = z.infer<typeof updateWorkExperienceSchema>;

export const workIdParamSchema = z.object({
  id: z.string().uuid('Invalid work experience ID'),
});

export type WorkIdParam = z.infer<typeof workIdParamSchema>;

// ============ Education Schemas ============

export const createEducationSchema = z.object({
  school: z.string().min(1, 'School is required').max(200),
  degree: z.string().max(200).optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  field: z.string().max(200).optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  description: z.string().max(1500, 'Description must not exceed 1500 characters').optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type CreateEducationInput = z.infer<typeof createEducationSchema>;

export const updateEducationSchema = z.object({
  school: z.string().min(1).max(200).optional(),
  degree: z.union([z.string().max(200), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  field: z.union([z.string().max(200), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  startDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  endDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  description: z.union([z.string().max(1500), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type UpdateEducationInput = z.infer<typeof updateEducationSchema>;

export const educationIdParamSchema = z.object({
  id: z.string().uuid('Invalid education ID'),
});

export type EducationIdParam = z.infer<typeof educationIdParamSchema>;

// ============ Skill Schemas ============

export const createSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(80),
  level: skillLevelSchema.optional(),
  category: z.string().max(80).optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  level: z.union([skillLevelSchema, z.null()]).optional(),
  category: z.union([z.string().max(80), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
});

export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

export const skillIdParamSchema = z.object({
  id: z.string().uuid('Invalid skill ID'),
});

export type SkillIdParam = z.infer<typeof skillIdParamSchema>;

// ============ Project Schemas ============

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(120),
  description: z.string().max(1500, 'Description must not exceed 1500 characters').optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  link: z.string().url('Invalid URL format').max(300).optional().or(z.literal('')).transform((val) => (val === '' ? undefined : val)),
  tech: z.array(z.string().max(50)).max(20, 'Maximum 20 technologies allowed').optional().default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.union([z.string().max(1500), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  link: z.union([z.string().url().max(300), z.literal(''), z.null()]).optional().transform((val) => (val === '' || val === null ? undefined : val)),
  tech: z.array(z.string().max(50)).max(20).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectIdParamSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
