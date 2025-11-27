
import { CONFIG } from '../config';
import { ApiTerm } from '../types';

interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
  }

  /**
   * Helper to construct headers with Auth token
   */
  private getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // 1. Prefer explicitly passed token
    // 2. Fallback to localStorage token
    let authToken = token;
    if (!authToken) {
      const storedUser = localStorage.getItem('marineterm_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user.token) authToken = user.token;
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  /**
   * Internal request handler
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, params, ...fetchOptions } = options;
    
    // Build URL with query params
    let url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...this.getHeaders(token),
          ...fetchOptions.headers as Record<string, string>,
        },
      });

      if (!response.ok) {
        // Try to parse error message from JSON, fallback to status text
        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody.message) errorMessage = errorBody.message;
        } catch (e) {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Call Failed [${url}]:`, error);
      throw error;
    }
  }

  // --- Public Methods ---

  public get<T>(endpoint: string, params?: Record<string, string>, token?: string) {
    return this.request<T>(endpoint, { method: 'GET', params, token });
  }

  public post<T>(endpoint: string, body: any, token?: string) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), token });
  }

  public put<T>(endpoint: string, body: any, token?: string) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), token });
  }

  public delete<T>(endpoint: string, token?: string) {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }

  // --- Domain Specific Methods ---

  public async getTerms(): Promise<ApiTerm[]> {
    return this.get<ApiTerm[]>('/terms');
  }

  public async getUserTeams(username: string, org: string): Promise<any[]> {
    return this.get<any[]>('/user-teams', { username, org });
  }
}

// Export pre-configured instances
export const backendApi = new ApiService(CONFIG.API_URL);
export const giteaApi = new ApiService(CONFIG.GITEA_URL);
