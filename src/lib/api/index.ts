/**
 * API Services - Now connected to Node.js Backend!
 * Service functions for Lottery Draws, Tickets, Wallet, and Authentication
 */

import { isApiConfigured, ENDPOINTS } from './config';
import { api, ApiResponse } from './client';
// import { mockData } from './mock';

// Import Node.js backend services
import { 
  BackendAPI,
  BackendAuthService, 
  BackendLotteryService, 
  BackendWalletService 
} from './backend';
import { Ticket } from '@/lib/state/lottery-store';
import { LobbyRoom, LobbyTicket, LobbyParticipant } from '@/lib/state/lobby-store';

// ============================================================================
// XANO TYPES (matching actual Xano schema)
// ============================================================================

export interface XanoLotteryDraw {
  id: number;
  created_at: number;
  draw_date: string;
  prize_pool: number;
  winning_number: string;
  draw_status: string; // 'open' | 'closed' | 'drawn'
  // Computed fields for app compatibility
  total_entries?: number;
  commitment_hash?: string;
  seed?: string;
  winner_ticket_id?: number;
}

export interface XanoLotteryTicket {
  id: number;
  created_at: number;
  user_id: number;
  draw_id: number;
  ticket_number: string;
  cryptographic_hash: string;
  price: number;
  // Computed fields for app compatibility
  status?: 'active' | 'won' | 'lost';
  prize_amount?: number;
}

export interface XanoLobby {
  id: number;
  created_at: number;
  code: string;
  name: string;
  host_id: string;
  host_username: string;
  status: 'waiting' | 'open' | 'locked' | 'drawn';
  prize_pool: number;
  max_participants: number;
  winner_id?: string;
  winner_username?: string;
}

export interface XanoLobbyMember {
  id: number;
  created_at: number;
  lobby_id: number;
  user_id: string;
  username: string;
  has_ticket: boolean;
  ticket_position?: number;
  ticket_hash?: string;
}

export interface XanoTransaction {
  id: number;
  created_at: number;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_win';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
}

// Response types for the app
export interface CurrentDrawResponse {
  drawId: string;
  prizePool: number;
  totalEntries: number;
  commitmentHash: string;
  drawTime: string;
  status: 'open' | 'closed' | 'drawn';
}

export interface DrawStatsResponse {
  totalEntries: number;
  prizePool: number;
  averageEntryTime: number;
  peakHour: number;
  entriesPerHour: number[];
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  walletBalance: number;
  ticketsPurchasedThisYear: number;
  totalWon: number;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_win';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  description: string;
}

export interface PurchaseTicketResponse {
  ticket: Ticket;
  newBalance: number;
  position: number;
  totalEntries: number;
  prizePool: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function xanoDrawToCurrentDraw(draw: XanoLotteryDraw, ticketCount: number = 0): CurrentDrawResponse {
  const status = draw.draw_status as 'open' | 'closed' | 'drawn' || 'open';
  return {
    drawId: String(draw.id),
    prizePool: draw.prize_pool || 0,
    totalEntries: ticketCount,
    commitmentHash: draw.commitment_hash || `HASH-${draw.id}-${draw.draw_date}`,
    drawTime: draw.draw_date,
    status,
  };
}

function xanoTicketToAppTicket(ticket: XanoLotteryTicket, draw?: XanoLotteryDraw, position?: number): Ticket {
  const drawDate = draw?.draw_date || new Date().toISOString().split('T')[0];
  const ticketPosition = position ?? ticket.id;
  const ticketStatus = ticket.status || (draw?.draw_status === 'drawn'
    ? (draw.winning_number === ticket.ticket_number ? 'won' : 'lost')
    : 'active');

  return {
    id: ticket.ticket_number || `DDL-${drawDate.replace(/-/g, '')}-${String(ticketPosition).padStart(5, '0')}`,
    drawId: String(ticket.draw_id),
    drawDate,
    purchasedAt: new Date(ticket.created_at).toISOString(),
    position: ticketPosition,
    totalEntriesAtPurchase: ticketPosition,
    ticketHash: ticket.cryptographic_hash || '',
    status: ticketStatus as 'active' | 'won' | 'lost',
    prizeAmount: ticket.prize_amount,
    prizePool: draw?.prize_pool,
  };
}

function xanoLobbyToAppRoom(lobby: XanoLobby, members: XanoLobbyMember[] = []): LobbyRoom {
  const participants: LobbyParticipant[] = members.map(m => ({
    id: m.user_id,
    username: m.username,
    joinedAt: new Date(m.created_at).toISOString(),
    hasTicket: m.has_ticket,
  }));

  const tickets: LobbyTicket[] = members
    .filter(m => m.has_ticket && m.ticket_position !== undefined)
    .map(m => ({
      id: `LBY-${lobby.id}-${m.id}`,
      roomId: String(lobby.id),
      participantId: m.user_id,
      participantUsername: m.username,
      purchasedAt: new Date(m.created_at).toISOString(),
      position: m.ticket_position!,
      ticketHash: m.ticket_hash || '',
    }));

  return {
    id: String(lobby.id),
    code: lobby.code,
    name: lobby.name,
    hostId: lobby.host_id,
    hostUsername: lobby.host_username,
    createdAt: new Date(lobby.created_at).toISOString(),
    status: lobby.status,
    participants,
    tickets,
    prizePool: lobby.prize_pool,
    maxParticipants: lobby.max_participants,
    winnerId: lobby.winner_id,
    winnerUsername: lobby.winner_username,
  };
}

function xanoTransactionToApp(tx: XanoTransaction): TransactionRecord {
  return {
    id: String(tx.id),
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    createdAt: new Date(tx.created_at).toISOString(),
    description: tx.description,
  };
}

// ============================================================================
// LOTTERY SERVICES
// ============================================================================

export const LotteryService = {
  /**
   * Get current draw information
   */
  getCurrentDraw: async (): Promise<ApiResponse<CurrentDrawResponse>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        success: true,
        data: mockData.getCurrentDraw(),
      };
    }

    // Get the most recent open draw
    const response = await api.get<XanoLotteryDraw[]>(ENDPOINTS.LOTTERY_DRAW.LIST, { requiresAuth: false });

    if (response.success && response.data) {
      const openDraw = response.data.find(d => d.draw_status === 'open') || response.data[0];
      if (openDraw) {
        // Get ticket count for this draw
        const ticketsResponse = await api.get<XanoLotteryTicket[]>(ENDPOINTS.LOTTERY_TICKET.LIST, { requiresAuth: false });
        const ticketCount = ticketsResponse.data?.filter(t => t.draw_id === openDraw.id).length || 0;

        return {
          success: true,
          data: xanoDrawToCurrentDraw(openDraw, ticketCount),
        };
      }
    }

    return {
      success: false,
      error: response.error || 'No active draw found',
    };
  },

  /**
   * Purchase a ticket for the current draw
   */
  purchaseTicket: async (drawId: string, userId: string, username: string): Promise<ApiResponse<PurchaseTicketResponse>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const position = Math.floor(Math.random() * 500) + 100;
      const totalEntries = position + Math.floor(Math.random() * 100);

      const ticket: Ticket = {
        id: `DDL-${dateStr}-${String(position).padStart(5, '0')}`,
        drawId,
        drawDate: now.toISOString().split('T')[0],
        purchasedAt: now.toISOString(),
        position,
        totalEntriesAtPurchase: totalEntries,
        ticketHash: Math.random().toString(36).substring(2).toUpperCase().padStart(32, '0'),
        status: 'active',
        prizePool: totalEntries * 0.95,
      };

      return {
        success: true,
        data: {
          ticket,
          newBalance: 24.00,
          position,
          totalEntries,
          prizePool: totalEntries * 0.95,
        },
      };
    }

    // First get current draw info
    const drawResponse = await api.get<XanoLotteryDraw>(ENDPOINTS.LOTTERY_DRAW.GET(drawId), { requiresAuth: false });
    const currentEntries = drawResponse.data?.total_entries || 0;
    const newPosition = currentEntries + 1;

    // Create ticket in Xano
    const ticketResponse = await api.post<XanoLotteryTicket>(ENDPOINTS.LOTTERY_TICKET.CREATE, {
      lottery_draw_id: parseInt(drawId),
      user_id: userId,
      username,
      position: newPosition,
      ticket_hash: Math.random().toString(36).substring(2).toUpperCase().padStart(32, '0'),
      status: 'active',
    }, { requiresAuth: false });

    if (!ticketResponse.success || !ticketResponse.data) {
      return {
        success: false,
        error: ticketResponse.error || 'Failed to purchase ticket',
      };
    }

    // Update draw totals
    const newPrizePool = (drawResponse.data?.prize_pool || 0) + 0.95;
    await api.patch(ENDPOINTS.LOTTERY_DRAW.UPDATE(drawId), {
      total_entries: newPosition,
      prize_pool: newPrizePool,
    }, { requiresAuth: false });

    const ticket = xanoTicketToAppTicket(ticketResponse.data, drawResponse.data);

    return {
      success: true,
      data: {
        ticket,
        newBalance: 24.00, // Would come from user service
        position: newPosition,
        totalEntries: newPosition,
        prizePool: newPrizePool,
      },
    };
  },

  /**
   * Get user's tickets
   */
  getTickets: async (userId: string): Promise<ApiResponse<Ticket[]>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        data: mockData.getTickets(userId),
      };
    }

    const response = await api.get<XanoLotteryTicket[]>(ENDPOINTS.LOTTERY_TICKET.LIST, { requiresAuth: false });

    if (response.success && response.data) {
      const userTickets = response.data.filter(t => String(t.user_id) === String(userId));
      return {
        success: true,
        data: userTickets.map((t, index) => xanoTicketToAppTicket(t, undefined, index + 1)),
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get tickets',
    };
  },

  /**
   * Get draw history
   */
  getDrawHistory: async (limit: number = 10): Promise<ApiResponse<XanoLotteryDraw[]>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        data: mockData.getDrawHistory(limit) as unknown as XanoLotteryDraw[],
      };
    }

    return api.get<XanoLotteryDraw[]>(ENDPOINTS.LOTTERY_DRAW.LIST, { requiresAuth: false });
  },

  /**
   * Get live draw statistics
   */
  getDrawStats: async (): Promise<ApiResponse<DrawStatsResponse>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        success: true,
        data: mockData.getDrawStats(),
      };
    }

    // Get current draw for stats
    const response = await api.get<XanoLotteryDraw[]>(ENDPOINTS.LOTTERY_DRAW.LIST, { requiresAuth: false });

    if (response.success && response.data && response.data.length > 0) {
      const currentDraw = response.data.find(d => d.draw_status === 'open') || response.data[0];

      // Get ticket count for this draw
      const ticketsResponse = await api.get<XanoLotteryTicket[]>(ENDPOINTS.LOTTERY_TICKET.LIST, { requiresAuth: false });
      const ticketCount = ticketsResponse.data?.filter(t => t.draw_id === currentDraw.id).length || 0;

      return {
        success: true,
        data: {
          totalEntries: ticketCount,
          prizePool: currentDraw.prize_pool || 0,
          averageEntryTime: 45,
          peakHour: 20,
          entriesPerHour: Array(24).fill(0).map(() => Math.floor(Math.random() * 50)),
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get stats',
    };
  },

  /**
   * Get last winner info
   */
  getLastWinner: async (): Promise<ApiResponse<{ username: string; amount: number; ticketId: string } | null>> => {
    if (!isApiConfigured()) {
      return {
        success: true,
        data: mockData.getLastWinner(),
      };
    }

    const response = await api.get<XanoLotteryDraw[]>(ENDPOINTS.LOTTERY_DRAW.LIST, { requiresAuth: false });

    if (response.success && response.data) {
      const drawnDraw = response.data.find(d => d.draw_status === 'drawn' && d.winning_number);
      if (drawnDraw && drawnDraw.winning_number) {
        // Find the winning ticket by ticket_number
        const ticketsResponse = await api.get<XanoLotteryTicket[]>(ENDPOINTS.LOTTERY_TICKET.LIST, { requiresAuth: false });
        const winningTicket = ticketsResponse.data?.find(t => t.ticket_number === drawnDraw.winning_number);

        if (winningTicket) {
          return {
            success: true,
            data: {
              username: `Player #${winningTicket.user_id}`,
              amount: drawnDraw.prize_pool,
              ticketId: String(winningTicket.id),
            },
          };
        }
      }
    }

    return { success: true, data: null };
  },
};

// ============================================================================
// LOBBY SERVICES (Rooms)
// ============================================================================

export const RoomsService = {
  /**
   * Get list of rooms user is in
   */
  getRooms: async (userId: string): Promise<ApiResponse<LobbyRoom[]>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        data: mockData.getRooms(userId),
      };
    }

    // Get all lobbies
    const lobbyResponse = await api.get<XanoLobby[]>(ENDPOINTS.LOBBY.LIST, { requiresAuth: false });

    if (!lobbyResponse.success || !lobbyResponse.data) {
      return {
        success: false,
        error: lobbyResponse.error || 'Failed to get lobbies',
      };
    }

    // Get all members to find user's rooms
    const memberResponse = await api.get<XanoLobbyMember[]>(ENDPOINTS.LOBBY_MEMBER.LIST, { requiresAuth: false });
    const userMemberships = memberResponse.data?.filter(m => m.user_id === userId) || [];
    const userLobbyIds = new Set(userMemberships.map(m => m.lobby_id));

    // Filter to user's lobbies and include all members
    const userLobbies = lobbyResponse.data.filter(
      l => userLobbyIds.has(l.id) || l.host_id === userId
    );

    const rooms = userLobbies.map(lobby => {
      const members = memberResponse.data?.filter(m => m.lobby_id === lobby.id) || [];
      return xanoLobbyToAppRoom(lobby, members);
    });

    return {
      success: true,
      data: rooms,
    };
  },

  /**
   * Get room details
   */
  getRoomDetails: async (roomId: string): Promise<ApiResponse<LobbyRoom>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const rooms = mockData.getRooms('mock-user');
      const room = rooms.find(r => r.id === roomId) || rooms[0];
      return {
        success: true,
        data: room,
      };
    }

    const lobbyResponse = await api.get<XanoLobby>(ENDPOINTS.LOBBY.GET(roomId), { requiresAuth: false });

    if (!lobbyResponse.success || !lobbyResponse.data) {
      return {
        success: false,
        error: lobbyResponse.error || 'Room not found',
      };
    }

    // Get members for this lobby
    const memberResponse = await api.get<XanoLobbyMember[]>(ENDPOINTS.LOBBY_MEMBER.LIST, { requiresAuth: false });
    const members = memberResponse.data?.filter(m => m.lobby_id === parseInt(roomId)) || [];

    return {
      success: true,
      data: xanoLobbyToAppRoom(lobbyResponse.data, members),
    };
  },

  /**
   * Create a new room
   */
  createRoom: async (name: string, hostId: string, hostUsername: string, maxParticipants: number = 50): Promise<ApiResponse<LobbyRoom>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const roomId = 'ROOM-' + Date.now().toString(36).toUpperCase();
      const code = 'A' + Math.floor(Math.random() * 9000 + 1000) + 'B';

      const room: LobbyRoom = {
        id: roomId,
        code,
        name,
        hostId,
        hostUsername,
        createdAt: new Date().toISOString(),
        status: 'waiting',
        participants: [{
          id: hostId,
          username: hostUsername,
          joinedAt: new Date().toISOString(),
          hasTicket: false,
        }],
        tickets: [],
        prizePool: 0,
        maxParticipants,
      };

      return {
        success: true,
        data: room,
      };
    }

    const code = 'A' + Math.floor(Math.random() * 9000 + 1000) + 'B';

    // Create lobby
    const lobbyResponse = await api.post<XanoLobby>(ENDPOINTS.LOBBY.CREATE, {
      code,
      name,
      host_id: hostId,
      host_username: hostUsername,
      status: 'waiting',
      prize_pool: 0,
      max_participants: maxParticipants,
    }, { requiresAuth: false });

    if (!lobbyResponse.success || !lobbyResponse.data) {
      return {
        success: false,
        error: lobbyResponse.error || 'Failed to create room',
      };
    }

    // Add host as member
    await api.post(ENDPOINTS.LOBBY_MEMBER.CREATE, {
      lobby_id: lobbyResponse.data.id,
      user_id: hostId,
      username: hostUsername,
      has_ticket: false,
    }, { requiresAuth: false });

    return {
      success: true,
      data: xanoLobbyToAppRoom(lobbyResponse.data, [{
        id: 0,
        created_at: Date.now(),
        lobby_id: lobbyResponse.data.id,
        user_id: hostId,
        username: hostUsername,
        has_ticket: false,
      }]),
    };
  },

  /**
   * Join a room by code
   */
  joinRoom: async (code: string, userId: string, username: string): Promise<ApiResponse<LobbyRoom>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const rooms = mockData.getRooms('mock-user');
      const room = rooms[0];
      return {
        success: true,
        data: { ...room, code: code.toUpperCase() },
      };
    }

    // Find lobby by code
    const lobbyResponse = await api.get<XanoLobby[]>(ENDPOINTS.LOBBY.LIST, { requiresAuth: false });
    const lobby = lobbyResponse.data?.find(l => l.code.toUpperCase() === code.toUpperCase());

    if (!lobby) {
      return {
        success: false,
        error: 'Room not found',
      };
    }

    // Add user as member
    await api.post(ENDPOINTS.LOBBY_MEMBER.CREATE, {
      lobby_id: lobby.id,
      user_id: userId,
      username,
      has_ticket: false,
    }, { requiresAuth: false });

    // Get all members
    const memberResponse = await api.get<XanoLobbyMember[]>(ENDPOINTS.LOBBY_MEMBER.LIST, { requiresAuth: false });
    const members = memberResponse.data?.filter(m => m.lobby_id === lobby.id) || [];

    return {
      success: true,
      data: xanoLobbyToAppRoom(lobby, members),
    };
  },

  /**
   * Leave a room
   */
  leaveRoom: async (roomId: string, userId: string): Promise<ApiResponse<void>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    }

    // Find member record
    const memberResponse = await api.get<XanoLobbyMember[]>(ENDPOINTS.LOBBY_MEMBER.LIST, { requiresAuth: false });
    const member = memberResponse.data?.find(
      m => m.lobby_id === parseInt(roomId) && m.user_id === userId
    );

    if (member) {
      await api.delete(ENDPOINTS.LOBBY_MEMBER.DELETE(member.id), { requiresAuth: false });
    }

    return { success: true };
  },

  /**
   * Purchase ticket in a room
   */
  purchaseRoomTicket: async (roomId: string, userId: string, username: string): Promise<ApiResponse<LobbyTicket>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 800));

      const ticket: LobbyTicket = {
        id: 'LBY-' + Date.now().toString(36).toUpperCase(),
        roomId,
        participantId: userId,
        participantUsername: username,
        purchasedAt: new Date().toISOString(),
        position: Math.floor(Math.random() * 10) + 1,
        ticketHash: Math.random().toString(36).substring(2).toUpperCase(),
      };

      return {
        success: true,
        data: ticket,
      };
    }

    // Get current lobby state
    const lobbyResponse = await api.get<XanoLobby>(ENDPOINTS.LOBBY.GET(roomId), { requiresAuth: false });
    const memberResponse = await api.get<XanoLobbyMember[]>(ENDPOINTS.LOBBY_MEMBER.LIST, { requiresAuth: false });

    const members = memberResponse.data?.filter(m => m.lobby_id === parseInt(roomId)) || [];
    const ticketCount = members.filter(m => m.has_ticket).length;
    const newPosition = ticketCount + 1;

    // Find user's member record and update
    const member = members.find(m => m.user_id === userId);
    if (member) {
      await api.patch(ENDPOINTS.LOBBY_MEMBER.UPDATE(member.id), {
        has_ticket: true,
        ticket_position: newPosition,
        ticket_hash: Math.random().toString(36).substring(2).toUpperCase(),
      }, { requiresAuth: false });
    }

    // Update lobby prize pool
    if (lobbyResponse.data) {
      await api.patch(ENDPOINTS.LOBBY.UPDATE(roomId), {
        prize_pool: lobbyResponse.data.prize_pool + 0.95,
      }, { requiresAuth: false });
    }

    const ticket: LobbyTicket = {
      id: `LBY-${roomId}-${member?.id || Date.now()}`,
      roomId,
      participantId: userId,
      participantUsername: username,
      purchasedAt: new Date().toISOString(),
      position: newPosition,
      ticketHash: Math.random().toString(36).substring(2).toUpperCase(),
    };

    return {
      success: true,
      data: ticket,
    };
  },

  /**
   * Start draw (host only)
   */
  startDraw: async (roomId: string): Promise<ApiResponse<{ drawScheduledAt: string }>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        data: {
          drawScheduledAt: new Date(Date.now() + 10000).toISOString(),
        },
      };
    }

    // Update lobby status to locked
    await api.patch(ENDPOINTS.LOBBY.UPDATE(roomId), {
      status: 'locked',
    }, { requiresAuth: false });

    return {
      success: true,
      data: {
        drawScheduledAt: new Date(Date.now() + 10000).toISOString(),
      },
    };
  },

  /**
   * Execute draw (after countdown)
   */
  executeDraw: async (roomId: string): Promise<ApiResponse<{ winnerId: string; winnerUsername: string; prizeAmount: number }>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        data: {
          winnerId: Math.random() > 0.5 ? 'mock-user' : 'other-user',
          winnerUsername: Math.random() > 0.5 ? 'You' : 'LuckyPlayer',
          prizeAmount: Math.floor(Math.random() * 50) + 10,
        },
      };
    }

    // Get members with tickets
    const lobbyResponse = await api.get<XanoLobby>(ENDPOINTS.LOBBY.GET(roomId), { requiresAuth: false });
    const memberResponse = await api.get<XanoLobbyMember[]>(ENDPOINTS.LOBBY_MEMBER.LIST, { requiresAuth: false });

    const members = memberResponse.data?.filter(m => m.lobby_id === parseInt(roomId) && m.has_ticket) || [];

    if (members.length === 0) {
      return {
        success: false,
        error: 'No participants with tickets',
      };
    }

    // Random winner selection
    const winnerIndex = Math.floor(Math.random() * members.length);
    const winner = members[winnerIndex];
    const prizeAmount = lobbyResponse.data?.prize_pool || members.length * 0.95;

    // Update lobby with winner
    await api.patch(ENDPOINTS.LOBBY.UPDATE(roomId), {
      status: 'drawn',
      winner_id: winner.user_id,
      winner_username: winner.username,
    }, { requiresAuth: false });

    return {
      success: true,
      data: {
        winnerId: winner.user_id,
        winnerUsername: winner.username,
        prizeAmount,
      },
    };
  },
};

// ============================================================================
// TRANSACTION SERVICES
// ============================================================================

export const TransactionService = {
  /**
   * Get transaction history
   */
  getTransactions: async (userId: string): Promise<ApiResponse<TransactionRecord[]>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        data: mockData.getTransactions(),
      };
    }

    const response = await api.get<XanoTransaction[]>(ENDPOINTS.TRANSACTION.LIST, { requiresAuth: false });

    if (response.success && response.data) {
      const userTx = response.data.filter(t => t.user_id === userId);
      return {
        success: true,
        data: userTx.map(xanoTransactionToApp),
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get transactions',
    };
  },

  /**
   * Create a transaction
   */
  createTransaction: async (
    userId: string,
    type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_win',
    amount: number,
    description: string
  ): Promise<ApiResponse<TransactionRecord>> => {
    if (!isApiConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        data: {
          id: 'TXN-' + Date.now().toString(36),
          type,
          amount,
          status: 'completed',
          createdAt: new Date().toISOString(),
          description,
        },
      };
    }

    const response = await api.post<XanoTransaction>(ENDPOINTS.TRANSACTION.CREATE, {
      user_id: userId,
      type,
      amount,
      status: 'completed',
      description,
    }, { requiresAuth: false });

    if (response.success && response.data) {
      return {
        success: true,
        data: xanoTransactionToApp(response.data),
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to create transaction',
    };
  },
};

// ============================================================================
// USER SERVICES (using local state since no auth endpoints)
// ============================================================================

export const UserService = {
  /**
   * Get user profile (from local state)
   */
  getProfile: async (userId: string): Promise<ApiResponse<UserProfileResponse>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      data: mockData.getUserProfile(userId),
    };
  },

  /**
   * Add funds to wallet
   */
  addFunds: async (userId: string, amount: number): Promise<ApiResponse<{ newBalance: number; transactionId: string }>> => {
    const txResult = await TransactionService.createTransaction(
      userId,
      'deposit',
      amount,
      `Added $${amount.toFixed(2)} to wallet`
    );

    if (txResult.success && txResult.data) {
      return {
        success: true,
        data: {
          newBalance: 25 + amount, // Would come from actual balance tracking
          transactionId: txResult.data.id,
        },
      };
    }

    return {
      success: false,
      error: txResult.error || 'Failed to add funds',
    };
  },

  /**
   * Request withdrawal
   */
  withdraw: async (userId: string, amount: number): Promise<ApiResponse<{ transactionId: string; estimatedArrival: string }>> => {
    const txResult = await TransactionService.createTransaction(
      userId,
      'withdrawal',
      -amount,
      `Withdrawal of $${amount.toFixed(2)}`
    );

    if (txResult.success && txResult.data) {
      const arrivalDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      return {
        success: true,
        data: {
          transactionId: txResult.data.id,
          estimatedArrival: arrivalDate.toISOString().split('T')[0],
        },
      };
    }

    return {
      success: false,
      error: txResult.error || 'Failed to process withdrawal',
    };
  },

  /**
   * Get transaction history
   */
  getTransactions: async (userId: string): Promise<ApiResponse<TransactionRecord[]>> => {
    return TransactionService.getTransactions(userId);
  },
};

// ============================================================================
// AUTH SERVICES (mock only - Xano doesn't have auth endpoints)
// ============================================================================

import { User } from '@/lib/state/auth-store';
import { AuthTokens, storeTokens, clearTokens } from './client';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const AuthService = {
  /**
   * Sign in (mock - no Xano auth)
   */
  signIn: async (request: SignInRequest): Promise<ApiResponse<AuthResponse>> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser: User = {
      id: 'user-' + Date.now().toString(36),
      email: request.email,
      username: request.email.split('@')[0],
      createdAt: new Date().toISOString(),
      isVerified: true,
    };

    const mockTokens: AuthTokens = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    await storeTokens(mockTokens);

    return {
      success: true,
      data: { user: mockUser, tokens: mockTokens },
    };
  },

  /**
   * Sign up (mock - no Xano auth)
   */
  signUp: async (request: SignUpRequest): Promise<ApiResponse<AuthResponse>> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockUser: User = {
      id: 'user-' + Date.now().toString(36),
      email: request.email,
      username: request.username,
      createdAt: new Date().toISOString(),
      isVerified: false,
    };

    const mockTokens: AuthTokens = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    await storeTokens(mockTokens);

    return {
      success: true,
      data: { user: mockUser, tokens: mockTokens },
    };
  },

  /**
   * Sign out
   */
  signOut: async (): Promise<ApiResponse<void>> => {
    await clearTokens();
    return { success: true };
  },

  /**
   * Reset password (mock)
   */
  resetPassword: async (_email: string): Promise<ApiResponse<{ message: string }>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: { message: 'Password reset email sent' },
    };
  },
};

// Export utilities
export { isApiConfigured } from './config';
export { clearTokens, getStoredTokens, storeTokens } from './client';

// ============================================================================
// NEW: Export Node.js Backend API
// ============================================================================

export {
  BackendAPI,
  BackendAuthService,
  BackendLotteryService,
  BackendWalletService,
  BackendUserService,
  BackendLobbyService,
  BackendAdminService,
} from './backend';

// For easy migration, you can now use:
// - BackendAuthService.signIn() instead of AuthService.signIn()
// - BackendLotteryService.getCurrentDraw() instead of LotteryService.getCurrentDraw()
// - BackendWalletService.getWallet() for wallet operations
