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
} from './types';

// Get API base URL from env or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

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
