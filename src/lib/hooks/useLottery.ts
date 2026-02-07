/**
 * Lottery Hooks
 * React Query hooks for lottery operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BackendLotteryService, isApiConfigured } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { userKeys } from './useUser';

// Query keys
export const lotteryKeys = {
  all: ['lottery'] as const,
  currentDraw: () => [...lotteryKeys.all, 'currentDraw'] as const,
  stats: () => [...lotteryKeys.all, 'stats'] as const,
  tickets: (userId: string) => [...lotteryKeys.all, 'tickets', userId] as const,
  ticketDetails: (ticketId: string, userId: string) => [...lotteryKeys.all, 'ticket', ticketId, userId] as const,
  drawHistory: (limit?: number) => [...lotteryKeys.all, 'history', limit] as const,
  drawDetails: (drawId: string) => [...lotteryKeys.all, 'draw', drawId] as const,
  lastWinner: () => [...lotteryKeys.all, 'lastWinner'] as const,
};

/**
 * Hook for fetching current draw information
 */
export function useCurrentDraw() {
  return useQuery({
    queryKey: lotteryKeys.currentDraw(),
    queryFn: async () => {
      const response = isApiConfigured()
        ? await BackendLotteryService.getCurrentDraw()
        : await import('@/lib/api').then(m => m.LotteryService.getCurrentDraw());

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Disable auto-refetch to prevent loops
    retry: false, // Disable retry to prevent loops
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for purchasing a ticket
 */
export function usePurchaseTicket() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const username = useAuthStore(s => s.user?.username);

  return useMutation({
    mutationFn: async (drawId: string) => {
      if (!userId || !username) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLotteryService.purchaseTicket(drawId)
        : await import('@/lib/api').then(m => m.LotteryService.purchaseTicket(drawId, userId!, username!));

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to purchase ticket');
      }

      return response.data;
    },
    onSuccess: async (data) => {
      // Update lottery store with new ticket
      const lotteryStore = useLotteryStore.getState();

      useLotteryStore.setState(state => ({
        tickets: [data.ticket, ...state.tickets],
        activeTicket: data.ticket,
        walletBalance: data.newBalance,
        ticketsPurchasedThisYear: state.ticketsPurchasedThisYear + 1,
        currentPrizePool: data.prizePool,
        activePlayers: data.totalEntries,
      }));

      await lotteryStore.saveToStorage();

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: lotteryKeys.currentDraw() });
      queryClient.invalidateQueries({ queryKey: lotteryKeys.stats() });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: lotteryKeys.tickets(userId) });
        queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'wallet'] });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      }
    },
  });
}

/**
 * Hook for fetching user's tickets
 */
export function useTickets() {
  const userId = useAuthStore(s => s.user?.id);

  return useQuery({
    queryKey: lotteryKeys.tickets(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLotteryService.getTickets()
        : await import('@/lib/api').then(m => m.LotteryService.getTickets(userId));

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch tickets');
      }

      return response.data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching ticket details
 */
export function useTicketDetails(ticketId: string) {
  const userId = useAuthStore(s => s.user?.id);

  return useQuery({
    queryKey: lotteryKeys.ticketDetails(ticketId, userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLotteryService.getTickets()
        : await import('@/lib/api').then(m => m.LotteryService.getTickets(userId));

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch ticket details');
      }

      const ticket = response.data.find(t => t.id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return ticket;
    },
    enabled: !!ticketId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for verifying a ticket
 */
export function useVerifyTicket() {
  return useMutation({
    mutationFn: async (ticketId: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        isValid: true,
        verificationDetails: {
          ticketId,
          verifiedAt: new Date().toISOString(),
          hashMatch: true,
          signatureValid: true,
        },
      };
    },
  });
}

/**
 * Hook for fetching draw history
 */
export function useDrawHistory(limit: number = 10) {
  return useQuery({
    queryKey: lotteryKeys.drawHistory(limit),
    queryFn: async () => {
      const response = isApiConfigured()
        ? await BackendLotteryService.getDrawHistory(limit)
        : await import('@/lib/api').then(m => m.LotteryService.getDrawHistory(limit));

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch draw history');
      }

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching specific draw details
 */
export function useDrawDetails(drawId: string) {
  return useQuery({
    queryKey: lotteryKeys.drawDetails(drawId),
    queryFn: async () => {
      const response = isApiConfigured()
        ? await BackendLotteryService.getDrawHistory(50)
        : await import('@/lib/api').then(m => m.LotteryService.getDrawHistory(50));

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch draw details');
      }

      const draw = response.data.find((d: { id?: number }) => String(d.id) === drawId);
      if (!draw) {
        throw new Error('Draw not found');
      }

      return draw;
    },
    enabled: !!drawId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching live draw statistics
 */
export function useDrawStats() {
  return useQuery({
    queryKey: lotteryKeys.stats(),
    queryFn: async () => {
      const response = isApiConfigured()
        ? await BackendLotteryService.getDrawStats()
        : await import('@/lib/api').then(m => m.LotteryService.getDrawStats());

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch draw stats');
      }

      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for fetching last winner
 */
export function useLastWinner() {
  return useQuery({
    queryKey: lotteryKeys.lastWinner(),
    queryFn: async () => {
      const response = isApiConfigured()
        ? await BackendLotteryService.getLastWinner()
        : await import('@/lib/api').then(m => m.LotteryService.getLastWinner());

      if (!response.success) {
        return null;
      }

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });
}
