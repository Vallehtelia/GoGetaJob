// Shared types matching backend API responses

export type ApplicationStatus = 'DRAFT' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
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
