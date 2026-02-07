/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

import { Platform } from 'react-native';

/**
 * Get base API URL - use 10.0.2.2 for Android emulator (host machine)
 * so localhost requests from the emulator reach the backend.
 */
function getApiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  // Android emulator: localhost = emulator itself; 10.0.2.2 = host machine
  if (Platform.OS === 'android' && base.includes('localhost')) {
    return base.replace(/localhost/g, '10.0.2.2');
  }
  return base;
}

export const API_BASE_URL = getApiBaseUrl();

// API Key for authentication
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

// Check if API is configured (otherwise use mock data)
export const isApiConfigured = (): boolean => {
  const isConfigured = Boolean(API_BASE_URL && API_BASE_URL.length > 0);
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('🔧 API Configuration:', {
      API_BASE_URL,
      isConfigured,
      env: process.env.EXPO_PUBLIC_API_URL,
    });
  }
  
  return isConfigured;
};

// API Endpoints - Node.js Backend Structure
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    SIGNUP: '/auth/signup',
    SIGNIN: '/auth/signin',
    REFRESH: '/auth/refresh',
    SIGNOUT: '/auth/signout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Draws
  DRAWS: {
    TODAY: '/draws/today',
    LIST: '/draws',
    LAST_WINNER: '/draws/last-winner',
    GET: (id: string) => `/draws/${id}`,
    EXECUTE: '/draws/execute',
    CREATE_NEXT: '/draws/create-next',
  },

  // Tickets
  TICKETS: {
    PURCHASE: '/tickets/purchase',
    MY_TICKETS: '/tickets/my-tickets',
    GET: (id: string) => `/tickets/${id}`,
  },

  // Wallet
  WALLET: {
    GET: '/wallet',
    TRANSACTIONS: '/wallet/transactions',
    DEPOSIT: '/wallet/deposit',
    WITHDRAW: '/wallet/withdraw',
  },

  // Users
  USERS: {
    ME: '/users/me',
  },

  // Admin (requires is_admin) - uses /users/admin-stats for reliable routing
  ADMIN: {
    STATS: '/users/admin-stats',
    USERS: '/admin/users',
    TRANSACTIONS: '/admin/transactions',
    DRAWS: '/admin/draws',
    LOBBIES: '/admin/lobbies',
    PAYMENT_SUMMARY: '/admin/payment-summary',
  },

  // Lobby (Rooms)
  LOBBY: {
    CREATE: '/lobby/create',
    JOIN: '/lobby/join',
    LEAVE: (id: string) => `/lobby/${id}/leave`,
    GET: (id: string) => `/lobby/${id}`,
    MY_ROOMS: '/lobby/my-rooms/list',
    SEED: (id: string) => `/lobby/${id}/seed`,
    DRAW: (id: string) => `/lobby/${id}/draw`,
  },
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // Base delay in ms
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

// Token storage keys
export const TOKEN_KEYS = {
  ACCESS_TOKEN: '@ddl_access_token',
  REFRESH_TOKEN: '@ddl_refresh_token',
  TOKEN_EXPIRY: '@ddl_token_expiry',
};
