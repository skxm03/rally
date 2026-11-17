import { Platform } from 'react-native';
import Constants from 'expo-constants';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:5001/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api';
  }

  return 'http://localhost:5001/api';
}

class ApiClient {
  private baseUrl = resolveBaseUrl();
  private authToken: string | null = null;
  private unauthorizedListeners: Array<() => void> = [];

  setToken(token: string | null) {
    this.authToken = token;
  }

  getToken(): string | null {
    return this.authToken;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getMediaUrl(mediaPath: string | null | undefined): string | null {
    if (!mediaPath) return null;
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return mediaPath;
    }
    const origin = this.baseUrl.replace(/\/api$/, '');
    const cleanPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
    return `${origin}${cleanPath}`;
  }

  onUnauthorized(callback: () => void): () => void {
    this.unauthorizedListeners.push(callback);
    return () => {
      this.unauthorizedListeners = this.unauthorizedListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyUnauthorized() {
    this.unauthorizedListeners.forEach((cb) => cb());
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { requiresAuth?: boolean } = {}
  ): Promise<T> {
    const { requiresAuth = false, headers = {}, ...rest } = options;
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    if (!(rest.body instanceof FormData) && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...rest,
        headers: requestHeaders,
      });
    } catch (networkError: any) {
      throw new ApiError(
        networkError?.message || 'Unable to connect to the server. Please check your network.',
        0
      );
    }

    let json: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        json = await response.json();
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && requiresAuth) {
        this.notifyUnauthorized();
      }
      const message = json?.message || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, json);
    }

    return json as T;
  }

  get<T>(endpoint: string, options?: RequestInit & { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  post<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit & { requiresAuth?: boolean }
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    });
  }

  put<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit & { requiresAuth?: boolean }
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit & { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

export const api = new ApiClient();
