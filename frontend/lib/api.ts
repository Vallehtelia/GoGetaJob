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
  CvSnapshot,
  CreateSnapshotInput,
  OpenAiKeyStatus,
  SetOpenAiKeyInput,
  SetOpenAiKeyResponse,
  OptimizeCvInput,
  OptimizeCvResponse,
  AiCvSuggestion,
  AiSuggestCvResponse,
  AiApplyCvResponse,
  ChatMessageInput,
  ChatMessageResponse,
  Feedback,
  SubmitFeedbackInput,
  AdminFeedbackListData,
} from './types';

// Get API base URL from env or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

type ApiEnvelope<T> = { data: T; message?: string };

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

      type RefreshResponseData = { accessToken: string; refreshToken: string };
      const data = await this.handleResponse<RefreshResponseData>(response);
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
        const body: any = await response.json();
        // Standard format: { statusCode, message, error? }
        if (body && typeof body === 'object' && typeof body.message === 'string') {
          if (typeof body.statusCode === 'number') {
            errorData = body as ApiError;
          } else {
            // Legacy-ish: { error, message } (no statusCode)
            errorData = {
              statusCode: response.status,
              message: body.message,
              error: typeof body.error === 'string' ? body.error : undefined,
            };
          }
        } else {
          errorData = {
            statusCode: response.status,
            message: response.statusText || 'An error occurred',
          };
        }
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
      return undefined as T;
    }

    const body: any = await response.json();
    // Standard success envelope: { data: T, message?: string }
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiEnvelope<T>).data;
    }
    // Temporary safety for any legacy endpoints
    return body as T;
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

  async logout(refreshToken: string): Promise<void> {
    await this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logoutAll(): Promise<void> {
    await this.request<void>('/auth/logout-all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(): Promise<void> {
    await this.request<void>('/account', {
      method: 'DELETE',
    });
  }

  // ============================================
  // Feedback
  // ============================================

  async submitFeedback(input: SubmitFeedbackInput): Promise<Feedback> {
    return this.request<Feedback>('/feedback', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listMyFeedback(): Promise<Feedback[]> {
    return this.request<Feedback[]>('/feedback', {
      method: 'GET',
    });
  }

  async adminListFeedback(params?: {
    type?: 'bug' | 'feature' | 'other';
    q?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
    sort?: 'newest' | 'oldest';
  }): Promise<AdminFeedbackListData> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.q) qs.set('q', params.q);
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.sort) qs.set('sort', params.sort);

    const endpoint = qs.toString() ? `/admin/feedback?${qs.toString()}` : '/admin/feedback';
    return this.request<AdminFeedbackListData>(endpoint, { method: 'GET' });
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
    const profile = await this.request<UserProfile>('/profile', {
      method: 'GET',
    });
    console.log('API: Received profile data:', profile);
    return profile;
  }

  async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    console.log('API: Updating profile with data:', data);
    const profile = await this.request<UserProfile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    console.log('API: Profile updated:', profile);
    return profile;
  }

  async uploadProfilePicture(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${this.baseUrl}/profile/picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let error: ApiError;
      try {
        const body: any = await response.json();
        if (body && typeof body === 'object' && typeof body.message === 'string') {
          error = {
            statusCode: typeof body.statusCode === 'number' ? body.statusCode : response.status,
            message: body.message,
            error: typeof body.error === 'string' ? body.error : undefined,
          };
        } else {
          error = { statusCode: response.status, message: response.statusText || 'Failed to upload profile picture' };
        }
      } catch {
        error = { statusCode: response.status, message: response.statusText || 'Failed to upload profile picture' };
      }
      throw new ApiClientError(
        error.message || 'Failed to upload profile picture',
        response.status,
        error
      );
    }

    const json: any = await response.json();
    return json?.data ?? json;
  }

  async deleteProfilePicture(): Promise<UserProfile> {
    const profile = await this.request<UserProfile>('/profile/picture', {
      method: 'DELETE',
    });
    return profile;
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
    await this.request<void>(`/applications/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // Experience Library endpoints (user-level master data)
  // ============================================

  // Work Experience Library
  async listWorkExperiences(): Promise<UserWorkExperience[]> {
    const response = await this.request<UserWorkExperience[]>('/profile/library/work', {
      method: 'GET',
    });
    return response;
  }

  async createWorkExperience(data: CreateWorkExperienceInput): Promise<UserWorkExperience> {
    const response = await this.request<UserWorkExperience>(
      '/profile/library/work',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async updateWorkExperience(
    id: string,
    data: UpdateWorkExperienceInput
  ): Promise<UserWorkExperience> {
    const response = await this.request<UserWorkExperience>(
      `/profile/library/work/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async deleteWorkExperience(id: string): Promise<void> {
    await this.request<void>(`/profile/library/work/${id}`, {
      method: 'DELETE',
    });
  }

  // Education Library
  async listEducations(): Promise<UserEducation[]> {
    const response = await this.request<UserEducation[]>('/profile/library/education', {
      method: 'GET',
    });
    return response;
  }

  async createEducation(data: CreateEducationInput): Promise<UserEducation> {
    const response = await this.request<UserEducation>(
      '/profile/library/education',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async updateEducation(id: string, data: UpdateEducationInput): Promise<UserEducation> {
    const response = await this.request<UserEducation>(
      `/profile/library/education/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async deleteEducation(id: string): Promise<void> {
    await this.request<void>(`/profile/library/education/${id}`, {
      method: 'DELETE',
    });
  }

  // Skills Library
  async listSkills(): Promise<UserSkill[]> {
    const response = await this.request<UserSkill[]>('/profile/library/skills', {
      method: 'GET',
    });
    return response;
  }

  async createSkill(data: CreateSkillInput): Promise<UserSkill> {
    const response = await this.request<UserSkill>(
      '/profile/library/skills',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async updateSkill(id: string, data: UpdateSkillInput): Promise<UserSkill> {
    const response = await this.request<UserSkill>(
      `/profile/library/skills/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async deleteSkill(id: string): Promise<void> {
    await this.request<void>(`/profile/library/skills/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects Library
  async listProjects(): Promise<UserProject[]> {
    const response = await this.request<UserProject[]>('/profile/library/projects', {
      method: 'GET',
    });
    return response;
  }

  async createProject(data: CreateProjectInput): Promise<UserProject> {
    const response = await this.request<UserProject>(
      '/profile/library/projects',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async updateProject(id: string, data: UpdateProjectInput): Promise<UserProject> {
    const response = await this.request<UserProject>(
      `/profile/library/projects/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response;
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/profile/library/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // CV endpoints
  // ============================================

  async listCvs(): Promise<CvDocument[]> {
    const response = await this.request<CvDocument[]>('/cv', {
      method: 'GET',
    });
    return response;
  }

  async getCv(id: string): Promise<CvDocument> {
    const response = await this.request<CvDocument>(`/cv/${id}`, {
      method: 'GET',
    });
    return response;
  }

  async createCv(data: CreateCvDocumentInput): Promise<CvDocument> {
    const response = await this.request<CvDocument>('/cv', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateCv(id: string, data: UpdateCvDocumentInput): Promise<CvDocument> {
    const response = await this.request<CvDocument>(`/cv/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteCv(id: string): Promise<void> {
    await this.request<void>(`/cv/${id}`, {
      method: 'DELETE',
    });
  }

  // CV Inclusions (add library items to CV)
  async addWorkToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<void>(`/cv/${cvId}/work`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeWorkFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<void>(`/cv/${cvId}/work/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateWorkOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<void>(`/cv/${cvId}/work/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  async addEducationToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<void>(`/cv/${cvId}/education`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeEducationFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<void>(`/cv/${cvId}/education/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateEducationOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<void>(`/cv/${cvId}/education/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  async addSkillToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<void>(`/cv/${cvId}/skills`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeSkillFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<void>(`/cv/${cvId}/skills/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateSkillOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<void>(`/cv/${cvId}/skills/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  async addProjectToCv(cvId: string, data: AddInclusionInput): Promise<void> {
    await this.request<void>(`/cv/${cvId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeProjectFromCv(cvId: string, itemId: string): Promise<void> {
    await this.request<void>(`/cv/${cvId}/projects/${itemId}`, {
      method: 'DELETE',
    });
  }

  async updateProjectOrderInCv(cvId: string, itemId: string, order: number): Promise<void> {
    await this.request<void>(`/cv/${cvId}/projects/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  // ============================================
  // CV Snapshot endpoints (Phase 4B)
  // ============================================

  async createApplicationSnapshot(applicationId: string, cvDocumentId: string): Promise<string> {
    const response = await this.request<{ snapshotId: string }>(
      `/applications/${applicationId}/snapshot`,
      {
        method: 'POST',
        body: JSON.stringify({ cvDocumentId }),
      }
    );
    return response.snapshotId;
  }

  async getApplicationSnapshot(applicationId: string): Promise<CvSnapshot> {
    const response = await this.request<CvSnapshot>(
      `/applications/${applicationId}/snapshot`,
      {
        method: 'GET',
      }
    );
    return response;
  }

  async deleteApplicationSnapshot(applicationId: string): Promise<void> {
    await this.request<void>(`/applications/${applicationId}/snapshot`, {
      method: 'DELETE',
    });
  }

  async getSnapshotById(snapshotId: string): Promise<CvSnapshot> {
    const response = await this.request<CvSnapshot>(`/snapshots/${snapshotId}`, {
      method: 'GET',
    });
    return response;
  }

  // ============================================
  // OpenAI API Key endpoints
  // ============================================

  async getOpenAiKeyStatus(): Promise<OpenAiKeyStatus> {
    return this.request<OpenAiKeyStatus>('/settings/openai', {
      method: 'GET',
    });
  }

  async setOpenAiKey(apiKey: string): Promise<SetOpenAiKeyResponse> {
    return this.request<SetOpenAiKeyResponse>('/settings/openai', {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    });
  }

  async deleteOpenAiKey(): Promise<{ message: string; hasKey: boolean }> {
    await this.request<void>('/settings/openai', {
      method: 'DELETE',
    });
    return { message: 'OpenAI API key deleted successfully', hasKey: false };
  }

  // ============================================
  // AI CV Optimization endpoints
  // ============================================

  async optimizeCvSummary(
    cvId: string,
    jobPostingText: string
  ): Promise<OptimizeCvResponse> {
    return this.request<OptimizeCvResponse>('/ai/cv/optimize', {
      method: 'POST',
      body: JSON.stringify({ cvId, jobPostingText }),
    });
  }

  async aiSuggestCv(cvId: string, jobPosting: string): Promise<AiCvSuggestion> {
    const res = await this.request<AiSuggestCvResponse>('/ai/cv/suggest', {
      method: 'POST',
      body: JSON.stringify({ cvId, jobPosting }),
    });
    return res.suggestion;
  }

  async aiApplyCvSuggestion(
    cvId: string,
    suggestion: AiCvSuggestion,
    replaceSelection: boolean = true
  ): Promise<AiApplyCvResponse> {
    return this.request<AiApplyCvResponse>('/ai/cv/apply', {
      method: 'POST',
      body: JSON.stringify({ cvId, suggestion, replaceSelection }),
    });
  }

  async sendChatMessage(
    message: string,
    conversationId?: string
  ): Promise<ChatMessageResponse> {
    return this.request<ChatMessageResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
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
