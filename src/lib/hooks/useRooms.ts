/**
 * Rooms Hooks
 * React Query hooks for lobby room operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BackendLobbyService, RoomsService, isApiConfigured } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLobbyStore } from '@/lib/state/lobby-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { userKeys } from './useUser';

// Query keys
export const roomsKeys = {
  all: ['rooms'] as const,
  list: (userId: string) => [...roomsKeys.all, 'list', userId] as const,
  details: (roomId: string) => [...roomsKeys.all, 'details', roomId] as const,
};

/**
 * Hook for fetching user's rooms list
 */
export function useRoomsList() {
  const userId = useAuthStore(s => s.user?.id);

  return useQuery({
    queryKey: roomsKeys.list(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLobbyService.getMyRooms()
        : await RoomsService.getRooms(userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch rooms');
      }

      return isApiConfigured() ? (response.data as any).lobbies : response.data;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching room details
 */
export function useRoomDetails(roomId: string) {
  return useQuery({
    queryKey: roomsKeys.details(roomId),
    queryFn: async () => {
      const response = isApiConfigured()
        ? await BackendLobbyService.getRoom(roomId)
        : await RoomsService.getRoomDetails(roomId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch room details');
      }

      return isApiConfigured() ? (response.data as any).lobby : response.data;
    },
    enabled: !!roomId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for live updates
  });
}

/**
 * Hook for creating a new room
 */
export function useCreateRoom() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const username = useAuthStore(s => s.user?.username);

  return useMutation({
    mutationFn: async ({ name, maxParticipants = 50 }: { name: string; maxParticipants?: number }) => {
      if (!userId || !username) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLobbyService.createRoom(name, maxParticipants)
        : await RoomsService.createRoom(name, userId, username, maxParticipants);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create room');
      }

      return isApiConfigured() ? (response.data as any).lobby : response.data;
    },
    onSuccess: (data) => {
      if (!data) return;
      // Normalize API response: map snake_case to camelCase, ensure participants/tickets exist
      const raw = data as any;
      const normalized = {
        id: raw.id,
        code: raw.code || '------',
        name: raw.name || 'Room',
        hostId: raw.host_id || raw.hostId || userId || '',
        hostUsername: raw.host_username || raw.hostUsername || username || 'Host',
        createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
        status: (raw.status || 'open') as 'open' | 'waiting' | 'locked' | 'drawn',
        participants: Array.isArray(raw.participants) ? raw.participants : Array.isArray(raw.members) ? raw.members.map((m: any) => ({ id: m.user_id, username: m.username, joinedAt: m.joined_at, hasTicket: m.has_ticket })) : [],
        tickets: Array.isArray(raw.tickets) ? raw.tickets : [],
        prizePool: typeof raw.prize_pool !== 'undefined' ? parseFloat(raw.prize_pool) : parseFloat(raw.prizePool || 0),
        maxParticipants: raw.max_participants ?? raw.maxParticipants ?? 10,
      };

      // Update lobby store
      if (userId && username) {
        useLobbyStore.setState(state => ({
          hostedRooms: [normalized, ...state.hostedRooms],
          currentRoom: normalized,
        }));

        useLobbyStore.getState().saveToStorage(userId);
      }

      // Invalidate rooms list and room details so RoomDetailScreen fetches fresh data
      if (userId) {
        queryClient.invalidateQueries({ queryKey: roomsKeys.list(userId) });
      }
      if (normalized.id) {
        queryClient.invalidateQueries({ queryKey: roomsKeys.details(normalized.id) });
      }
    },
  });
}

/**
 * Hook for joining a room
 */
export function useJoinRoom() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const username = useAuthStore(s => s.user?.username);

  return useMutation({
    mutationFn: async (code: string) => {
      if (!userId || !username) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLobbyService.joinRoom(code)
        : await RoomsService.joinRoom(code, userId, username);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to join room');
      }

      return isApiConfigured() ? (response.data as any).lobby : response.data;
    },
    onSuccess: (data) => {
      // Update lobby store
      useLobbyStore.setState(state => {
        const alreadyJoined = state.joinedRooms.some(r => r.id === data.id);
        return {
          joinedRooms: alreadyJoined
            ? state.joinedRooms.map(r => r.id === data.id ? data : r)
            : [data, ...state.joinedRooms],
          currentRoom: data,
        };
      });

      if (userId) {
        useLobbyStore.getState().saveToStorage(userId);
        queryClient.invalidateQueries({ queryKey: roomsKeys.list(userId) });
      }
    },
  });
}

/**
 * Hook for leaving a room
 */
export function useLeaveRoom() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const response = isApiConfigured()
        ? await BackendLobbyService.leaveRoom(roomId)
        : await RoomsService.leaveRoom(roomId, userId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to leave room');
      }

      return roomId;
    },
    onSuccess: (roomId) => {
      // Update lobby store
      if (userId) {
        useLobbyStore.getState().leaveRoom(roomId, userId);
        useLobbyStore.getState().saveToStorage(userId);
        queryClient.invalidateQueries({ queryKey: roomsKeys.list(userId) });
      }

      // Clear room details cache
      queryClient.removeQueries({ queryKey: roomsKeys.details(roomId) });
    },
  });
}

/**
 * Hook for purchasing a ticket in a room
 */
export function useRoomPurchaseTicket() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const username = useAuthStore(s => s.user?.username);

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!userId || !username) {
        throw new Error('Not authenticated');
      }

      const response = await RoomsService.purchaseRoomTicket(roomId, userId, username);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to purchase ticket');
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Update lottery store wallet balance
      useLotteryStore.setState(state => ({
        walletBalance: state.walletBalance - 1,
      }));

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: roomsKeys.details(data.roomId) });
      queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'wallet'] });

      if (userId) {
        queryClient.invalidateQueries({ queryKey: roomsKeys.list(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      }
    },
  });
}

/**
 * Hook for seeding room pot (host only, Model A)
 */
export function useSeedPot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, amount }: { roomId: string; amount: number }) => {
      const response = await BackendLobbyService.seedPot(roomId, amount);
      if (!response.success || !response.data) throw new Error(response.error);
      return { roomId, ...response.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: roomsKeys.details(data.roomId) });
      queryClient.invalidateQueries({ queryKey: roomsKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook for starting a draw (host only)
 */
export function useStartDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = isApiConfigured()
        ? await BackendLobbyService.triggerDraw(roomId)
        : await RoomsService.startDraw(roomId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to start draw');
      }

      return { roomId, ...(response.data as object) };
    },
    onSuccess: (data) => {
      // Invalidate room details to get updated status
      queryClient.invalidateQueries({ queryKey: roomsKeys.details(data.roomId) });
    },
  });
}

/**
 * Hook for executing a draw
 */
export function useExecuteDraw() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);

  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = isApiConfigured()
        ? await BackendLobbyService.triggerDraw(roomId)
        : await RoomsService.executeDraw(roomId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to execute draw');
      }

      return { roomId, ...(response.data as object) };
    },
    onSuccess: (data) => {
      // Check if current user won
      if (data.winnerId === userId) {
        // Add winnings to wallet
        useLotteryStore.setState(state => ({
          walletBalance: state.walletBalance + data.prizeAmount,
        }));

        // Invalidate wallet balance
        queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'wallet'] });
      }

      // Invalidate room details
      queryClient.invalidateQueries({ queryKey: roomsKeys.details(data.roomId) });

      if (userId) {
        queryClient.invalidateQueries({ queryKey: roomsKeys.list(userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
      }
    },
  });
}
