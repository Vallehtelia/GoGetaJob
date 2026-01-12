// API client with authentication and refresh token flow

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  logout,
} from './auth';
import type {
  ApiError,
  AuthResponse,
  JobApplication,
  PaginatedResponse,
  ApplicationFilters,
  CreateApplicationInput,
  UpdateApplicationInput,
  User,
  UserProfile,
  UpdateProfileInput,
  CvDocument,
  CreateCvDocumentInput,
  UpdateCvDocumentInput,
  UserWorkExperience,
  UserEducation,
  UserSkill,
  UserProject,
  CreateWorkExperienceInput,
  UpdateWorkExperienceInput,
  CreateEducationInput,
  UpdateEducationInput,
  CreateSkillInput,
  UpdateSkillInput,
  CreateProjectInput,
  UpdateProjectInput,
  AddInclusionInput,
} from './types';

// Get API base URL from env or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Core request method with automatic token refresh on 401
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options;

    // Prepare headers
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Only set Content-Type for requests with body
    if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    // Attach access token if required
    if (requiresAuth) {
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && requiresAuth) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        } else {
          // Refresh failed, logout
          logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Handle token refresh with request deduplication
   */
  private async handleTokenRefresh(): Promise<string | null> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data: AuthResponse = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }

  /**
   * Parse and handle response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          message: response.statusText || 'An error occurred',
        };
      }
      throw new ApiClientError(
        errorData.message || 'Request failed',
        errorData.statusCode,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ============================================
  // Auth endpoints
  // ============================================

  async register(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      requiresAuth: false,
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      requiresAuth: false,
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/me', {
      method: 'GET',
    });
  }

  // ============================================
  // Profile endpoints
  // ============================================

  async getProfile(): Promise<UserProfile> {
    console.log('API: Fetching user profile');
    const response = await this.request<{ profile: UserProfile }>('/profile', {
      method: 'GET',
    });
    console.log('API: Received profile data:', response.profile);
    return response.profile;
  }

  async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    console.log('API: Updating profile with data:', data);
    const response = await this.request<{ profile: UserProfile }>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    console.log('API: Profile updated:', response.profile);
    return response.profile;
  }

  // ============================================
  // Job Applications endpoints
  // ============================================

  async getApplications(
    filters?: ApplicationFilters
  ): Promise<PaginatedResponse<JobApplication>> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        statuses.forEach((s) => params.append('status', s));
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    }

    const query = params.toString();
    const endpoint = query ? `/applications?${query}` : '/applications';

    return this.request<PaginatedResponse<JobApplication>>(endpoint, {
      method: 'GET',
    });
  }

  async getApplication(id: string): Promise<JobApplication> {
    console.log('API: Fetching application with ID:', id);
    const result = await this.request<JobApplication>(`/applications/${id}`, {
      method: 'GET',
    });
    console.log('API: Received application data:', result);
    return result;
  }

  async createApplication(
    data: CreateApplicationInput
  ): Promise<JobApplication> {
    return this.request<JobApplication>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApplication(
    id: string,
    data: UpdateApplicationInput
  ): Promise<JobApplication> {
    return this.request<JobApplication>(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteApplication(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/applications/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
      },
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          message: response.statusText || 'Failed to delete',
        };
      }
      throw new ApiClientError(
        errorData.message || 'Failed to delete',
        errorData.statusCode,
        errorData
      );
    }

    // DELETE returns 204 No Content, so no body to parse
    return;
  }

  // ============================================
  // Experience Library endpoints (user-level master data)
  // ============================================

  // Work Experience Library
  async listWorkExperiences(): Promise<UserWorkExperience[]> {
    const response = await this.request<{ data: UserWorkExperience[] }>('/profile/library/work', {
      method: 'GET',
    });
    return response.data;
  }

  async createWorkExperience(data: CreateWorkExperienceInput): Promise<UserWorkExperience> {
    const response = await this.request<{ data: UserWorkExperience; message: string }>(
      '/profile/library/work',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateWorkExperience(
    id: string,
    data: UpdateWorkExperienceInput
  ): Promise<UserWorkExperience> {
    const response = await this.request<{ data: UserWorkExperience; message: string }>(
      `/profile/library/work/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async deleteWorkExperience(id: string): Promise<void> {
    await this.request<{ message: string }>(`/profile/library/work/${id}`, {
      method: 'DELETE',
    });
  }

  // Education Library
  async listEducations(): Promise<UserEducation[]> {
    const response = await this.request<{ data: UserEducation[] }>('/profile/library/education', {
      method: 'GET',
    });
    return response.data;
  }

  async createEducation(data: CreateEducationInput): Promise<UserEducation> {
    const response = await this.request<{ data: UserEducation; message: string }>(
      '/profile/library/education',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateEducation(id: string, data: UpdateEducationInput): Promise<UserEducation> {
    const response = await this.request<{ data: UserEducation; message: string }>(
      `/profile/library/education/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async deleteEducation(id: string): Promise<void> {
    await this.request<{ message: string }>(`/profile/library/education/${id}`, {
      method: 'DELETE',
    });
  }

  // Skills Library
  async listSkills(): Promise<UserSkill[]> {
    const response = await this.request<{ data: UserSkill[] }>('/profile/library/skills', {
      method: 'GET',
    });
    return response.data;
  }

  async createSkill(data: CreateSkillInput): Promise<UserSkill> {
    const response = await this.request<{ data: UserSkill; message: string }>(
      '/profile/library/skills',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateSkill(id: string, data: UpdateSkillInput): Promise<UserSkill> {
    const response = await this.request<{ data: UserSkill; message: string }>(
      `/profile/library/skills/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async deleteSkill(id: string): Promise<void> {
    await this.request<{ message: string }>(`/profile/library/skills/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects Library
  async listProjects(): Promise<UserProject[]> {
    const response = await this.request<{ data: UserProject[] }>('/profile/library/projects', {
      method: 'GET',
    });
    return response.data;
  }

  async createProject(data: CreateProjectInput): Promise<UserProject> {
    const response = await this.request<{ data: UserProject; message: string }>(
      '/profile/library/projects',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateProject(id: string, data: UpdateProjectInput): Promise<UserProject> {
    const response = await this.request<{ data: UserProject; message: string }>(
      `/profile/library/projects/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<{ message: string }>(`/profile/library/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // CV endpoints
  // ============================================

  async listCvs(): Promise<CvDocument[]> {
    const response = await this.request<{ data: CvDocument[] }>('/cv', {
      method: 'GET',
    });
    return response.data;
  }

  async getCv(id: string): Promise<CvDocument> {
    const response = await this.request<{ data: CvDocument }>(`/cv/${id}`, {
      method: 'GET',
    });
    return response.data;
  }

  async createCv(data: CreateCvDocumentInput): Promise<CvDocument> {
    const response = await this.request<{ data: CvDocument; message: string }>('/cv', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateCv(id: string, data: UpdateCvDocumentInput): Promise<CvDocument> {
    const response = await this.request<{ data: CvDocument; message: string }>(`/cv/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteCv(id: string): Promise<void> {
    await this.request<{ message: string }>(`/cv/${id}`, {
      method: 'DELETE',
    });
  }

  // CV Inclusions (add library items to CV)
  async addWorkToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/work`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeWorkFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/work/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateWorkOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/work/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  async addEducationToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/education`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeEducationFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/education/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateEducationOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/education/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  async addSkillToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/skills`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeSkillFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/skills/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateSkillOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/skills/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  async addProjectToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeProjectFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/projects/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateProjectOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<{ message: string }>(`/cv/${cvId}/projects/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }
}

// Custom error class
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorData?: ApiError
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
