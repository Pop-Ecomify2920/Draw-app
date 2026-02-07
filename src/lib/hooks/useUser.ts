/**
 * User Hooks
 * React Query hooks for user profile and wallet operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BackendUserService, BackendWalletService, isApiConfigured } from '@/lib/api';
import { UserService } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';

// Query keys
export const userKeys = {
  all: ['user'] as const,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  transactions: (userId: string) => [...userKeys.all, 'transactions', userId] as const,
  walletBalance: (balance: number) => [...userKeys.all, 'wallet', balance] as const,
};

/**
 * Hook for fetching user profile
 */
export function useUserProfile() {
  const userId = useAuthStore(s => s.user?.id);

  return useQuery({
    queryKey: userKeys.profile(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendUserService.getProfile()
        : await UserService.getProfile(userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch profile');
      }

      const data = response.data as any;
      return isApiConfigured()
        ? { ...(data.user || data), adminStats: data.adminStats }
        : response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating responsible play settings (self-exclusion, spending limits)
 */
export function useUpdateResponsiblePlay() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);

  return useMutation({
    mutationFn: async (data: {
      selfExcludedUntil?: string | null;
      spendingLimitDaily?: number | null;
      spendingLimitMonthly?: number | null;
    }) => {
      if (!isApiConfigured()) throw new Error('Backend not configured');
      const response = await BackendUserService.updateResponsiblePlay(data);
      if (!response.success) throw new Error(response.error);
      return response.data?.user ?? data;
    },
    onSuccess: () => {
      if (userId) queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook for updating user profile
 * Note: Mock implementation since Xano doesn't have auth endpoints
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);

  return useMutation({
    mutationFn: async (updates: { username?: string; email?: string }) => {
      // Mock update - update local auth store
      await new Promise(resolve => setTimeout(resolve, 400));
      return updates;
    },
    onSuccess: (data) => {
      // Update auth store
      useAuthStore.setState(state => ({
        user: state.user ? { ...state.user, ...data } : null,
      }));

      // Update lottery store if username changed
      if (data.username && userId) {
        useLotteryStore.getState().setUser(userId, data.username, data.email || '');
      }

      // Invalidate profile query
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      }
    },
  });
}

/**
 * Hook for adding funds to wallet
 */
export function useAddFunds() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);

  return useMutation({
    mutationFn: async ({ amount }: { amount: number; paymentMethod: string }) => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendWalletService.deposit(amount, 'manual')
        : await UserService.addFunds(userId, amount);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to add funds');
      }

      return isApiConfigured()
        ? { newBalance: (response.data as any).balance, transactionId: `dep-${Date.now()}` }
        : response.data;
    },
    onSuccess: async (data, variables) => {
      // Update lottery store wallet balance
      await useLotteryStore.getState().addToWallet(variables.amount);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userKeys.transactions(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      }
    },
  });
}

/**
 * Hook for withdrawing funds
 */
export function useWithdraw() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);

  return useMutation({
    mutationFn: async ({ amount, paymentMethod }: { amount: number; paymentMethod: string }) => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendWalletService.withdraw(amount, paymentMethod === 'paypal' ? 'paypal' : 'stripe', {})
        : await UserService.withdraw(userId, amount);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to process withdrawal');
      }

      return isApiConfigured()
        ? { transactionId: (response.data as any).transactionId, estimatedArrival: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] }
        : response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userKeys.transactions(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      }
    },
  });
}

/**
 * Hook for fetching transaction history
 */
export function useTransactions() {
  const userId = useAuthStore(s => s.user?.id);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  return useQuery({
    queryKey: userKeys.transactions(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendWalletService.getTransactions(50, 0)
        : await UserService.getTransactions(userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch transactions');
      }

      return isApiConfigured() ? (response.data as any).transactions : response.data;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching wallet balance
 * Note: Uses lottery store since Xano doesn't have a dedicated endpoint
 */
export function useWalletBalance() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const walletBalance = useLotteryStore(s => s.walletBalance);
  const userId = useAuthStore(s => s.user?.id);

  return useQuery({
    queryKey: [...userKeys.all, 'wallet', userId || ''],
    queryFn: async () => {
      if (isApiConfigured() && userId) {
        const response = await BackendWalletService.getWallet();
        if (response.success && response.data) {
          return {
            balance: parseFloat(String(response.data.balance)),
            pendingWithdrawals: parseFloat(String(response.data.pending_balance || 0)),
          };
        }
      }
      return {
        balance: walletBalance,
        pendingWithdrawals: 0,
      };
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  });
}
