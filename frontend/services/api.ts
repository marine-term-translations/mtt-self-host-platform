

import { CONFIG } from '../config';
import { ApiTerm, ApiUserActivity, ApiPublicUser, ApiAppeal } from '../types';

interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string>;
}

class ApiService {
  public baseUrl: string;

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
          else if (errorBody.error) errorMessage = errorBody.error;
          else if (errorBody.details) errorMessage = errorBody.details;
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
  
  public patch<T>(endpoint: string, body: any, token?: string) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), token });
  }

  public delete<T>(endpoint: string, token?: string) {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }

  // --- Domain Specific Methods ---

  public async getTerms(limit?: number, offset?: number): Promise<{ terms: ApiTerm[], total: number }> {
    const params: Record<string, string> = {};
    if (limit !== undefined) params.limit = limit.toString();
    if (offset !== undefined) params.offset = offset.toString();
    return this.get<{ terms: ApiTerm[], total: number }>('/terms', params);
  }

  public async getTerm(id: number | string): Promise<ApiTerm> {
    // Use the paginated /terms endpoint with offset to fetch the specific term
    // Assumes term IDs are sequential starting from 1
    const termId = typeof id === 'string' ? parseInt(id, 10) : id;
    const offset = termId - 1; // Zero-based offset (term ID 1 is at offset 0)
    
    const response = await this.getTerms(1, offset);
    
    if (response.terms.length === 0) {
      throw new Error(`Term with ID ${id} not found`);
    }
    
    return response.terms[0];
  }

  public async getTermByUri(uri: string): Promise<ApiTerm> {
    // Use the new term-by-uri endpoint with query parameter for direct lookup
    return this.get<ApiTerm>('/term-by-uri', { uri });
  }

  public async getTermsByIds(ids: number[]): Promise<ApiTerm[]> {
    // Use the new by-ids endpoint to fetch multiple terms efficiently
    if (ids.length === 0) return [];
    return this.post<ApiTerm[]>('/terms/by-ids', { ids });
  }

  public async getUserTeams(username: string, org: string): Promise<any[]> {
    return this.get<any[]>('/user-teams', { username, org });
  }

  public async updateTerm(id: number | string, data: any): Promise<any> {
    return this.put<any>(`/terms/${id}`, data);
  }

  public async getUserHistory(userId: number | string): Promise<ApiUserActivity[]> {
    return this.get<ApiUserActivity[]>(`/user-history/${userId}`);
  }

  // Fetch history for a specific term (mocked or real endpoint)
  public async getTermHistory(termId: number | string): Promise<ApiUserActivity[]> {
    try {
        return await this.get<ApiUserActivity[]>(`/term-history/${termId}`);
    } catch (e) {
        console.warn("Term history endpoint not found, returning empty array");
        return [];
    }
  }

  public async getUsers(): Promise<ApiPublicUser[]> {
    return this.get<ApiPublicUser[]>('/users');
  }

  public async getUser(id: number | string): Promise<ApiPublicUser> {
    return this.get<ApiPublicUser>(`/user/${id}`);
  }

  // --- Appeals ---

  public async getAppeals(translation_id?: number): Promise<ApiAppeal[]> {
    const params = translation_id ? { translation_id: translation_id.toString() } : undefined;
    return this.get<ApiAppeal[]>('/appeals', params);
  }

  public async getAppealsByTerm(termId: number): Promise<ApiAppeal[]> {
    return this.get<ApiAppeal[]>(`/appeals/by-term/${termId}`);
  }

  public async createAppeal(data: { translation_id: number; opened_by: string; resolution: string; token: string }): Promise<any> {
    return this.post<any>('/appeals', data);
  }

  public async updateAppeal(id: number, data: { status?: string, resolution?: string, username: string, token: string }): Promise<any> {
    return this.patch<any>(`/appeals/${id}`, data);
  }

  public async createAppealMessage(appealId: number, data: { author: string, message: string, token: string }): Promise<any> {
    return this.post<any>(`/appeals/${appealId}/messages`, data);
  }
  
  public async getAppealMessages(appealId: number): Promise<any[]> {
    return this.get<any[]>(`/appeals/${appealId}/messages`);
  }

  // --- Stats ---

  public async getStats(): Promise<{
    totalTerms: number;
    totalTranslations: number;
    byLanguage: Record<string, { total: number; byStatus: Record<string, number> }>;
    byStatus: Record<string, number>;
    byUser: Record<string, number>;
  }> {
    return this.get('/stats');
  }

  // --- Harvesting ---

  public async harvestCollection(collectionUri: string, token?: string): Promise<any> {
    return this.request<any>('/harvest', { 
      method: 'POST', 
      body: JSON.stringify({ collectionUri }), 
      token,
      credentials: 'include' 
    });
  }

  public async harvestCollectionStream(collectionUri: string, token?: string): Promise<Response> {
    const url = `${this.baseUrl}/harvest/stream`;
    return fetch(url, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ collectionUri }),
      credentials: 'include'
    });
  }

  // --- Browse (Search & Faceted Filtering) ---

  public async browse(params: {
    query?: string;
    limit?: number;
    offset?: number;
    language?: string;
    status?: string;
    field_uri?: string;
    facets?: string[];
  }): Promise<{
    results: any[];
    total: number;
    limit: number;
    offset: number;
    facets: Record<string, Record<string, number>>;
  }> {
    const queryParams: Record<string, string> = {};
    
    if (params.query) queryParams.query = params.query;
    if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params.offset !== undefined) queryParams.offset = params.offset.toString();
    if (params.language) queryParams.language = params.language;
    if (params.status) queryParams.status = params.status;
    if (params.field_uri) queryParams.field_uri = params.field_uri;
    if (params.facets && params.facets.length > 0) {
      queryParams.facets = params.facets.join(',');
    }
    
    return this.get('/browse', queryParams);
  }

  // LDES Feeds
  public async getLdesFeeds(): Promise<{
    feeds: Array<{
      sourceId: string;
      latestUrl: string;
      fragmentCount: number;
      fragments: Array<{ name: string; url: string }>;
    }>;
  }> {
    return this.get('/ldes/feeds');
  }
}

// Export pre-configured instances
export const backendApi = new ApiService(CONFIG.API_URL);
