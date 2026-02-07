/**
 * Auth Hooks
 * React Query hooks for authentication operations
 * NOW CONNECTED TO NODE.JS BACKEND!
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BackendAuthService } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useAppStatsStore } from '@/lib/state/app-stats-store';

// Request types for backward compatibility
interface SignInRequest {
  email: string;
  password: string;
}

interface SignUpRequest {
  email: string;
  username: string;
  password: string;
  dateOfBirth: string;
  confirmAge18: boolean;
}

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

/**
 * Hook for signing in
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: SignInRequest) => {
      const response = await BackendAuthService.signIn(credentials.email, credentials.password);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Sign in failed');
      }

      return response.data;
    },
    onSuccess: async (data) => {
      // Update auth store
      useAuthStore.setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect to lottery store
      useLotteryStore.getState().setUser(
        data.user.id,
        data.user.username,
        data.user.email
      );

      // Load user transactions
      await useAppStatsStore.getState().loadUserTransactions(data.user.id);

      // Invalidate queries that depend on auth
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['lottery'] });
    },
  });
}

/**
 * Hook for signing up
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: SignUpRequest) => {
      const response = await BackendAuthService.signUp(
        credentials.email,
        credentials.username,
        credentials.password,
        credentials.dateOfBirth,
        credentials.confirmAge18
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Sign up failed');
      }

      return response.data;
    },
    onSuccess: async (data) => {
      // Update auth store
      useAuthStore.setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect to lottery store
      useLotteryStore.getState().setUser(
        data.user.id,
        data.user.username,
        data.user.email
      );

      // Increment global user count
      await useAppStatsStore.getState().incrementUserCount();

      // Load user transactions
      await useAppStatsStore.getState().loadUserTransactions(data.user.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Hook for signing out
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await BackendAuthService.signOut();

      if (!response.success) {
        throw new Error(response.error || 'Sign out failed');
      }

      return response;
    },
    onSuccess: () => {
      // Clear auth store
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Clear lottery store user data
      useLotteryStore.getState().clearUser();

      // Clear all cached queries
      queryClient.clear();
    },
  });
}

/**
 * Hook for password reset - requests code via email
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { BackendAuthService } = await import('@/lib/api/backend');
      const { isApiConfigured } = await import('@/lib/api/config');
      if (!isApiConfigured()) {
        throw new Error('Unable to send reset email. Please try again later.');
      }
      const result = await BackendAuthService.requestPasswordReset(email);
      if (!result.success) throw new Error(result.error || 'Failed to send reset email');
      return result.data!;
    },
  });
}

/**
 * Hook for confirming password reset with code
 */
export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async ({ email, code, newPassword }: { email: string; code: string; newPassword: string }) => {
      const { BackendAuthService } = await import('@/lib/api/backend');
      const { isApiConfigured } = await import('@/lib/api/config');
      if (!isApiConfigured()) {
        throw new Error('Unable to reset password. Please try again later.');
      }
      const result = await BackendAuthService.confirmPasswordReset(email, code, newPassword);
      if (!result.success) throw new Error(result.error || 'Failed to reset password');
      return result.data!;
    },
  });
}
