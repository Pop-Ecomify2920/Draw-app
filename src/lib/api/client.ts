/**
 * HTTP Client
 * Handles all HTTP requests with token management, auto-refresh, and retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  API_KEY,
  ENDPOINTS,
  REQUEST_TIMEOUT,
  RETRY_CONFIG,
  TOKEN_KEYS,
  isApiConfigured,
} from './config';

// Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestBody = Record<string, any>;

interface RequestOptions {
  method?: HttpMethod;
  body?: RequestBody;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  skipRetry?: boolean;
}

// Token management
let cachedTokens: AuthTokens | null = null;
let isRefreshing = false;
let refreshPromise: Promise<AuthTokens | null> | null = null;

/**
 * Get stored tokens from AsyncStorage
 */
export const getStoredTokens = async (): Promise<AuthTokens | null> => {
  if (cachedTokens) {
    return cachedTokens;
  }

  try {
    const [accessToken, refreshToken, expiryStr] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN),
      AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN),
      AsyncStorage.getItem(TOKEN_KEYS.TOKEN_EXPIRY),
    ]);

    if (accessToken && refreshToken && expiryStr) {
      cachedTokens = {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiryStr, 10),
      };
      return cachedTokens;
    }
  } catch (error) {
    console.log('Error getting stored tokens:', error);
  }

  return null;
};

/**
 * Store tokens in AsyncStorage
 */
export const storeTokens = async (tokens: AuthTokens): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, tokens.accessToken),
      AsyncStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      AsyncStorage.setItem(TOKEN_KEYS.TOKEN_EXPIRY, tokens.expiresAt.toString()),
    ]);
    cachedTokens = tokens;
  } catch (error) {
    console.log('Error storing tokens:', error);
  }
};

/**
 * Clear stored tokens
 */
export const clearTokens = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(TOKEN_KEYS.TOKEN_EXPIRY),
    ]);
    cachedTokens = null;
  } catch (error) {
    console.log('Error clearing tokens:', error);
  }
};

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
const isTokenExpired = (expiresAt: number): boolean => {
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minutes buffer
  return now >= expiresAt - buffer;
};

/**
 * Refresh the access token using the backend API
 */
const refreshAccessToken = async (): Promise<AuthTokens | null> => {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const tokens = await getStoredTokens();
      if (!tokens?.refreshToken) {
        return null;
      }

      // Call backend refresh endpoint
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        await clearTokens();
        return null;
      }

      const data = await response.json();
      
      if (data.tokens) {
        const newTokens: AuthTokens = {
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes (matching backend JWT expiry)
        };

        await storeTokens(newTokens);
        return newTokens;
      }

      return null;
    } catch (error) {
      console.log('Error refreshing token:', error);
      await clearTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Get valid access token (refresh if needed)
 */
const getValidAccessToken = async (): Promise<string | null> => {
  const tokens = await getStoredTokens();

  if (!tokens) {
    return null;
  }

  if (isTokenExpired(tokens.expiresAt)) {
    const newTokens = await refreshAccessToken();
    return newTokens?.accessToken || null;
  }

  return tokens.accessToken;
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Main request function with retry logic
 */
export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    requiresAuth = true,
    skipRetry = false,
  } = options;

  // If API is not configured, this should not be called
  // The calling code should use mock data instead
  if (!isApiConfigured()) {
    return {
      success: false,
      error: 'API not configured. Using mock data.',
      statusCode: 0,
    };
  }

  let lastError: string = 'Unknown error';
  let retries = skipRetry ? 0 : RETRY_CONFIG.maxRetries;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...headers,
      };

      // Add auth token if required
      if (requiresAuth) {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          return {
            success: false,
            error: 'Not authenticated',
            statusCode: 401,
          };
        }
        requestHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      // Make request
      const url = `${API_BASE_URL}${endpoint}`;
      
      // Debug logging
      if (typeof window !== 'undefined') {
        console.log('🌐 API Request:', {
          method,
          url,
          hasAuth: !!requestHeaders['Authorization'],
        });
      }
      
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      // Debug logging
      if (typeof window !== 'undefined') {
        console.log('📥 API Response:', {
          method,
          url,
          status: response.status,
          ok: response.ok,
        });
      }

      // Parse response
      const responseData = await response.json().catch(() => ({}));

      // Handle success
      if (response.ok) {
        return {
          success: true,
          data: responseData as T,
          statusCode: response.status,
        };
      }

      // Handle 401 - try to refresh token and retry once
      if (response.status === 401 && requiresAuth && attempt === 0) {
        const newTokens = await refreshAccessToken();
        if (newTokens) {
          continue; // Retry with new token
        }
        return {
          success: false,
          error: 'Session expired. Please sign in again.',
          statusCode: 401,
        };
      }

      // Check if should retry
      if (RETRY_CONFIG.retryStatusCodes.includes(response.status) && attempt < retries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt); // Exponential backoff
        await sleep(delay);
        continue;
      }

      // Return error
      return {
        success: false,
        error: responseData.message || responseData.error || `Request failed with status ${response.status}`,
        statusCode: response.status,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = 'Request timed out';
        } else {
          lastError = error.message;
        }
      }

      // Retry on network errors
      if (attempt < retries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError,
    statusCode: 0,
  };
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: RequestBody, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: RequestBody, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: RequestBody, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
