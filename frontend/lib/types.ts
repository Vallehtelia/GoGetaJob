// Shared types matching backend API responses

export type ApplicationStatus = 'DRAFT' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  profilePictureUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
}

export interface JobApplication {
  id: string;
  userId: string;
  company: string;
  position: string;
  link: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  lastContactAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'appliedAt';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface CreateApplicationInput {
  company: string;
  position: string;
  link?: string;
  status?: ApplicationStatus;
  appliedAt?: string;
  lastContactAt?: string;
  notes?: string;
}

export interface UpdateApplicationInput {
  company?: string;
  position?: string;
  link?: string | null;
  status?: ApplicationStatus;
  appliedAt?: string | null;
  lastContactAt?: string | null;
  notes?: string | null;
}

// CV Types
export type CvTemplate = 'CLEAN_NAVY';
export type CvSkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface CvDocument {
  id: string;
  userId: string;
  title: string;
  isDefault: boolean;
  template: CvTemplate;
  overrideSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  workExperiences?: UserWorkExperience[];
  educations?: UserEducation[];
  skills?: UserSkill[];
  projects?: UserProject[];
}

// User-level library types (master data)
export interface UserWorkExperience {
  id: string;
  userId?: string;
  company: string;
  role: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  // When included in a CV:
  inclusionId?: string;
  order?: number;
}

export interface UserEducation {
  id: string;
  userId?: string;
  school: string;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  // When included in a CV:
  inclusionId?: string;
  order?: number;
}

export interface UserSkill {
  id: string;
  userId?: string;
  name: string;
  level: CvSkillLevel | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  // When included in a CV:
  inclusionId?: string;
  order?: number;
}

export interface UserProject {
  id: string;
  userId?: string;
  name: string;
  description: string | null;
  link: string | null;
  tech: string[];
  createdAt: string;
  updatedAt: string;
  // When included in a CV:
  inclusionId?: string;
  order?: number;
}

// CV Input Types
export interface CreateCvDocumentInput {
  title?: string;
  template?: CvTemplate;
}

export interface UpdateCvDocumentInput {
  title?: string;
  template?: CvTemplate;
  isDefault?: boolean;
}

// Library item input types (for creating/updating master library items)
export interface CreateWorkExperienceInput {
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface UpdateWorkExperienceInput {
  company?: string;
  role?: string;
  location?: string | null;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
}

export interface CreateEducationInput {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface UpdateEducationInput {
  school?: string;
  degree?: string | null;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

export interface CreateSkillInput {
  name: string;
  level?: CvSkillLevel;
  category?: string;
}

export interface UpdateSkillInput {
  name?: string;
  level?: CvSkillLevel | null;
  category?: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  link?: string;
  tech?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  link?: string | null;
  tech?: string[];
}

// CV Inclusion types (for adding library items to a CV)
export interface AddInclusionInput {
  itemId: string;
  order?: number;
}

export interface UpdateInclusionOrderInput {
  order: number;
}

// ============================================
// CV Snapshot Types (Phase 4B)
// ============================================

export interface CvSnapshotHeader {
  id: string;
  snapshotId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  profilePictureUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
}

export interface CvSnapshotWorkExperience {
  id: string;
  snapshotId: string;
  company: string;
  role: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  order: number;
}

export interface CvSnapshotEducation {
  id: string;
  snapshotId: string;
  school: string;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  order: number;
}

export interface CvSnapshotSkill {
  id: string;
  snapshotId: string;
  name: string;
  level: CvSkillLevel | null;
  category: string | null;
  order: number;
}

export interface CvSnapshotProject {
  id: string;
  snapshotId: string;
  name: string;
  description: string | null;
  link: string | null;
  tech: string[];
  order: number;
}

export interface CvSnapshot {
  id: string;
  userId: string;
  cvDocumentId: string | null;
  applicationId: string | null;
  title: string;
  template: CvTemplate;
  createdAt: string;
  header: CvSnapshotHeader | null;
  workExperiences: CvSnapshotWorkExperience[];
  educations: CvSnapshotEducation[];
  skills: CvSnapshotSkill[];
  projects: CvSnapshotProject[];
}

export interface CreateSnapshotInput {
  cvDocumentId: string;
}

// ============================================
// OpenAI API Key Types
// ============================================

export interface OpenAiKeyStatus {
  hasKey: boolean;
  last4: string | null;
  updatedAt: string | null;
}

export interface SetOpenAiKeyInput {
  apiKey: string;
}

export interface SetOpenAiKeyResponse {
  message: string;
  hasKey: boolean;
  last4: string;
}

// ============================================
// AI CV Optimization Types
// ============================================

export interface OptimizeCvInput {
  cvId: string;
  jobPostingText: string;
}

export interface OptimizeCvResponse {
  message: string;
  cvId: string;
  summary: string;
  keySkills: string[];
  roleFitBullets: string[];
}

// ============================================
// AI Chat Types
// ============================================

export interface ChatMessageInput {
  message: string;
  conversationId?: string;
}

export interface ChatMessageResponse {
  message: string;
  conversationId: string | null;
}
