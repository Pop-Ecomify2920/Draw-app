/**
 * Backend API Services for Daily Dollar Lotto Node.js Backend
 * Connects mobile app to the Express.js backend with PostgreSQL
 */

import { ENDPOINTS, API_BASE_URL } from './config';
import { api, ApiResponse, AuthTokens, storeTokens, clearTokens } from './client';
import { User } from '@/lib/state/auth-store';
import { Ticket } from '@/lib/state/lottery-store';

// ============================================================================
// BACKEND TYPES (matching Node.js backend responses)
// ============================================================================

export interface BackendUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  email_verified: boolean;
  is_active: boolean;
  isAdmin?: boolean;
}

export interface BackendDraw {
  id: string;
  draw_date: string;
  prize_pool: string | number;
  total_entries: number;
  commitment_hash: string;
  seed?: string;
  status: 'open' | 'locked' | 'drawn';
  winning_position?: number;
  created_at: string;
  drawn_at?: string;
}

export interface BackendTicket {
  id: string;
  ticket_id: string;
  user_id: string;
  draw_id: string;
  position: number;
  total_entries_at_purchase: number;
  ticket_hash: string;
  status: string;
  prize_amount?: string | number;
  created_at: string;
}

export interface BackendWallet {
  id: string;
  user_id: string;
  balance: string | number;
  pending_balance: string | number;
  created_at: string;
}

export interface BackendTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_win';
  amount: string | number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
  created_at: string;
}

// Response types
export interface BackendAuthResponse {
  message?: string;
  user: BackendUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface CurrentDrawResponse {
  drawId: string;
  prizePool: number;
  totalEntries: number;
  commitmentHash: string;
  drawTime: string;
  status: 'open' | 'locked' | 'drawn';
}

export interface PurchaseTicketResponse {
  ticket: Ticket;
  newBalance: number;
  prizePool: number;
  totalEntries: number;
}

export interface WalletResponse {
  wallet: BackendWallet;
}

export interface TransactionsResponse {
  transactions: BackendTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function backendUserToAppUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.created_at,
    isVerified: user.email_verified,
    isAdmin: !!(user as any).isAdmin,
  };
}

function backendDrawToCurrentDraw(draw: BackendDraw): CurrentDrawResponse {
  return {
    drawId: draw.id,
    prizePool: typeof draw.prize_pool === 'string' ? parseFloat(draw.prize_pool) : draw.prize_pool,
    totalEntries: draw.total_entries,
    commitmentHash: draw.commitment_hash,
    drawTime: draw.draw_date,
    status: draw.status,
  };
}

function backendTicketToAppTicket(ticket: BackendTicket | Record<string, any>, draw?: BackendDraw): Ticket {
  const t = ticket as any;
  const prizePool = t.prize_pool != null ? (typeof t.prize_pool === 'string' ? parseFloat(t.prize_pool) : t.prize_pool) : (draw ? (typeof draw.prize_pool === 'string' ? parseFloat(draw.prize_pool) : draw.prize_pool) : undefined);
  const prizeAmount = t.prize_amount != null ? (typeof t.prize_amount === 'string' ? parseFloat(t.prize_amount) : t.prize_amount) : undefined;
  const purchasedAt = t.purchased_at || t.created_at;
  const ticketHash = t.seal || t.ticket_hash;

  return {
    id: t.ticket_id || t.id || `TKT-${t.draw_id}-${t.position}`,
    drawId: t.draw_id,
    drawDate: t.draw_date || (purchasedAt ? String(purchasedAt).split('T')[0] : ''),
    purchasedAt: typeof purchasedAt === 'string' ? purchasedAt : new Date(purchasedAt).toISOString(),
    position: t.position,
    totalEntriesAtPurchase: t.total_entries_at_purchase ?? t.position,
    ticketHash: ticketHash || '',
    status: t.status === 'won' ? 'won' : t.status === 'active' ? 'active' : 'lost',
    prizeAmount,
    prizePool,
  };
}

// ============================================================================
// AUTHENTICATION SERVICES
// ============================================================================

export const BackendAuthService = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    console.log('🔐 BackendAuthService.signIn:', { email });
    
    const response = await api.post<BackendAuthResponse>(ENDPOINTS.AUTH.SIGNIN, {
      email,
      password,
    }, { requiresAuth: false });

    console.log('📥 Backend response:', { success: response.success, hasData: !!response.data, error: response.error });

    if (response.success && response.data) {
      console.log('✅ Sign in successful, storing tokens...');
      
      // Store tokens
      const tokens: AuthTokens = {
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      };
      await storeTokens(tokens);

      // Convert backend user to app user format
      const appUser = backendUserToAppUser(response.data.user);

      console.log('✅ User authenticated:', { userId: appUser.id, email: appUser.email });

      return {
        success: true,
        data: {
          user: appUser,
          tokens: response.data.tokens,
        },
      };
    }

    console.error('❌ Sign in failed:', response.error);
    return {
      success: false,
      error: response.error || 'Sign in failed',
    };
  },

  /**
   * Sign up with email, username, password, and age verification (18+)
   */
  signUp: async (
    email: string,
    username: string,
    password: string,
    dateOfBirth: string,
    confirmAge18: boolean
  ): Promise<ApiResponse<AuthResponse>> => {
    console.log('📝 BackendAuthService.signUp:', { email, username });
    
    const response = await api.post<BackendAuthResponse>(ENDPOINTS.AUTH.SIGNUP, {
      email,
      username,
      password,
      dateOfBirth,
      confirmAge18: String(confirmAge18),
    }, { requiresAuth: false });

    console.log('📥 Backend response:', { success: response.success, hasData: !!response.data, error: response.error });

    if (response.success && response.data) {
      console.log('✅ Sign up successful, storing tokens...');
      
      // Store tokens
      const tokens: AuthTokens = {
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      };
      await storeTokens(tokens);

      // Convert backend user to app user format
      const appUser = backendUserToAppUser(response.data.user);

      console.log('✅ User registered:', { userId: appUser.id, email: appUser.email });

      return {
        success: true,
        data: {
          user: appUser,
          tokens: response.data.tokens,
        },
      };
    }

    console.error('❌ Sign up failed:', response.error);
    return {
      success: false,
      error: response.error || 'Sign up failed',
    };
  },

  /**
   * Request password reset - sends code via email
   */
  requestPasswordReset: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const url = `${API_BASE_URL}${ENDPOINTS.AUTH.FORGOT_PASSWORD}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return { success: true, data: data as { message: string } };
      if (res.status === 404) {
        return {
          success: false,
          error: 'Password reset unavailable. Ensure the backend is running (cd backend && npm start).',
        };
      }
      return { success: false, error: (data as { error?: string }).error || `Request failed (${res.status})` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        error: msg.includes('fetch') || msg.includes('Network') || msg.includes('Failed')
          ? 'Cannot reach server. Start the backend: cd backend && npm start'
          : msg,
      };
    }
  },

  /**
   * Confirm password reset with code from email
   */
  confirmPasswordReset: async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post<{ message: string }>(ENDPOINTS.AUTH.RESET_PASSWORD, {
      email,
      code: code.toUpperCase(),
      newPassword,
    }, { requiresAuth: false });
    return response.success ? { success: true, data: response.data } : { success: false, error: response.error };
  },

  /**
   * Sign out
   */
  signOut: async (): Promise<ApiResponse<void>> => {
    try {
      await api.post(ENDPOINTS.AUTH.SIGNOUT, {}, { requiresAuth: true });
    } catch (error) {
      console.log('Sign out API error (continuing anyway):', error);
    }

    await clearTokens();
    return { success: true };
  },
};

// ============================================================================
// LOTTERY/DRAW SERVICES
// ============================================================================

export const BackendLotteryService = {
  /**
   * Get today's draw information
   */
  getCurrentDraw: async (): Promise<ApiResponse<CurrentDrawResponse>> => {
    const response = await api.get<{ draw: BackendDraw }>(ENDPOINTS.DRAWS.TODAY, { requiresAuth: false });

    if (response.success && response.data) {
      return {
        success: true,
        data: backendDrawToCurrentDraw(response.data.draw),
      };
    }

    return {
      success: false,
      error: response.error || 'No active draw found',
    };
  },

  /**
   * Purchase a ticket for today's draw
   */
  purchaseTicket: async (drawId: string): Promise<ApiResponse<PurchaseTicketResponse>> => {
    const response = await api.post<{
      ticket: BackendTicket;
      prizePool: number;
      totalEntries: number;
      newBalance: number;
    }>(ENDPOINTS.TICKETS.PURCHASE, {
      drawId,
    }, { requiresAuth: true });

    if (response.success && response.data) {
      const ticket = backendTicketToAppTicket(response.data.ticket);

      return {
        success: true,
        data: {
          ticket,
          newBalance: response.data.newBalance,
          prizePool: response.data.prizePool,
          totalEntries: response.data.totalEntries,
        },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to purchase ticket',
    };
  },

  /**
   * Get user's tickets
   */
  getTickets: async (): Promise<ApiResponse<Ticket[]>> => {
    const response = await api.get<{ tickets: BackendTicket[] }>(ENDPOINTS.TICKETS.MY_TICKETS, { requiresAuth: true });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.tickets.map(t => backendTicketToAppTicket(t)),
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get tickets',
    };
  },

  /**
   * Get draw by ID (for verification screen)
   */
  getDrawById: async (drawId: string): Promise<ApiResponse<BackendDraw>> => {
    const response = await api.get<{ draw: BackendDraw }>(ENDPOINTS.DRAWS.GET(drawId), { requiresAuth: false });
    if (response.success && response.data?.draw) {
      return { success: true, data: response.data.draw };
    }
    return { success: false, error: response.error || 'Draw not found' };
  },

  /**
   * Get draw history
   */
  getDrawHistory: async (limit: number = 10): Promise<ApiResponse<BackendDraw[]>> => {
    const response = await api.get<{ draws: BackendDraw[] }>(`${ENDPOINTS.DRAWS.LIST}?limit=${limit}`, { requiresAuth: false });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.draws,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get draw history',
    };
  },

  /**
   * Get draw stats (derived from current draw)
   */
  getDrawStats: async (): Promise<ApiResponse<{ totalEntries: number; prizePool: number; averageEntryTime: number; peakHour: number; entriesPerHour: number[] }>> => {
    const response = await api.get<{ draw: BackendDraw }>(ENDPOINTS.DRAWS.TODAY, { requiresAuth: false });
    if (response.success && response.data?.draw) {
      const d = response.data.draw;
      return {
        success: true,
        data: {
          totalEntries: d.total_entries || 0,
          prizePool: parseFloat(String(d.prize_pool)) || 0,
          averageEntryTime: 45,
          peakHour: 20,
          entriesPerHour: Array(24).fill(0).map(() => Math.floor(Math.random() * 20)),
        },
      };
    }
    return { success: false, error: response.error };
  },

  /**
   * Get last winner
   */
  getLastWinner: async (): Promise<ApiResponse<{ username: string; amount: number; ticketId: string } | null>> => {
    const response = await api.get<{ winner: { username: string; amount: number; ticketId: string } | null }>(ENDPOINTS.DRAWS.LAST_WINNER, { requiresAuth: false });
    if (response.success && response.data?.winner) {
      return { success: true, data: response.data.winner };
    }
    return { success: true, data: null };
  },
};

// ============================================================================
// WALLET SERVICES
// ============================================================================

export const BackendWalletService = {
  /**
   * Get wallet balance
   */
  getWallet: async (): Promise<ApiResponse<BackendWallet>> => {
    const response = await api.get<WalletResponse>(ENDPOINTS.WALLET.GET, { requiresAuth: true });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.wallet,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get wallet',
    };
  },

  /**
   * Get transaction history
   */
  getTransactions: async (limit: number = 20, offset: number = 0): Promise<ApiResponse<TransactionsResponse>> => {
    const response = await api.get<TransactionsResponse>(
      `${ENDPOINTS.WALLET.TRANSACTIONS}?limit=${limit}&offset=${offset}`,
      { requiresAuth: true }
    );

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to get transactions',
    };
  },

  /**
   * Deposit funds to wallet
   */
  deposit: async (amount: number, source: string = 'manual', referenceId?: string): Promise<ApiResponse<{ balance: number }>> => {
    const response = await api.post<{ balance: number }>(ENDPOINTS.WALLET.DEPOSIT, {
      amount,
      source,
      referenceId,
    }, { requiresAuth: true });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to deposit funds',
    };
  },

  /**
   * Request withdrawal
   */
  withdraw: async (amount: number, method: string, accountDetails: Record<string, any>): Promise<ApiResponse<{ transactionId: string }>> => {
    const response = await api.post<{ transaction_id: string }>(ENDPOINTS.WALLET.WITHDRAW, {
      amount,
      method,
      accountDetails,
    }, { requiresAuth: true });

    if (response.success && response.data) {
      return {
        success: true,
        data: { transactionId: response.data.transaction_id },
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to request withdrawal',
    };
  },
};

// ============================================================================
// USER SERVICES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  balance: number;
  pendingBalance: number;
  selfExcludedUntil: string | null;
  spendingLimitDaily: number | null;
  spendingLimitMonthly: number | null;
}

export const BackendUserService = {
  getProfile: async (): Promise<ApiResponse<{ user: UserProfile }>> => {
    const response = await api.get<{ user: UserProfile }>(ENDPOINTS.USERS.ME, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data };
    return { success: false, error: response.error };
  },

  updateResponsiblePlay: async (data: {
    selfExcludedUntil?: string | null;
    spendingLimitDaily?: number | null;
    spendingLimitMonthly?: number | null;
  }): Promise<ApiResponse<{ user: Partial<UserProfile> }>> => {
    const response = await api.patch<{ user: Partial<UserProfile> }>(ENDPOINTS.USERS.ME, data, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data };
    return { success: false, error: response.error };
  },
};

// ============================================================================
// LOBBY SERVICES
// ============================================================================

export interface LobbyRoom {
  id: string;
  code: string;
  name: string;
  prize_pool: number;
  status: string;
  max_participants: number;
  host_username?: string;
  members?: Array<{ user_id: string; username: string; joined_at: string }>;
  isHost?: boolean;
}

export const BackendLobbyService = {
  createRoom: async (name: string, maxParticipants: number = 10): Promise<ApiResponse<{ lobby: LobbyRoom }>> => {
    const response = await api.post<{ lobby: LobbyRoom }>(ENDPOINTS.LOBBY.CREATE, { name, maxParticipants }, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data };
    return { success: false, error: response.error };
  },

  joinRoom: async (code: string): Promise<ApiResponse<{ lobby: { id: string; code: string; name: string } }>> => {
    const response = await api.post(ENDPOINTS.LOBBY.JOIN, { code }, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data as any };
    return { success: false, error: response.error };
  },

  leaveRoom: async (roomId: string): Promise<ApiResponse<void>> => {
    const response = await api.post(ENDPOINTS.LOBBY.LEAVE(roomId), {}, { requiresAuth: true });
    return response.success ? { success: true } : { success: false, error: response.error };
  },

  getRoom: async (roomId: string): Promise<ApiResponse<{ lobby: LobbyRoom }>> => {
    const response = await api.get<{ lobby: LobbyRoom }>(ENDPOINTS.LOBBY.GET(roomId), { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data };
    return { success: false, error: response.error };
  },

  getMyRooms: async (): Promise<ApiResponse<{ lobbies: LobbyRoom[] }>> => {
    const response = await api.get<{ lobbies: LobbyRoom[] }>(ENDPOINTS.LOBBY.MY_ROOMS, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data };
    return { success: false, error: response.error };
  },

  seedPot: async (roomId: string, amount: number): Promise<ApiResponse<{ prizePool: number }>> => {
    const response = await api.post<{ prizePool: number }>(ENDPOINTS.LOBBY.SEED(roomId), { amount }, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data };
    return { success: false, error: response.error };
  },

  triggerDraw: async (roomId: string): Promise<ApiResponse<{ winnerUsername: string; prizeAmount: number }>> => {
    const response = await api.post(ENDPOINTS.LOBBY.DRAW(roomId), {}, { requiresAuth: true });
    if (response.success && response.data) return { success: true, data: response.data as any };
    return { success: false, error: response.error };
  },
};

// ============================================================================
// ADMIN SERVICE (requires is_admin)
// ============================================================================

export interface AdminStats {
  overview: {
    totalUsers: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalTicketPurchases: number;
    totalTicketRevenue: number;
    netRevenue: number;
  };
  deposits: { total: number; count: number };
  withdrawals: { total: number; count: number };
  draws: Record<string, any>;
  lobbies: Record<string, any>;
  last30DaysByType: { type: string; total: number; count: number }[];
}

export const BackendAdminService = {
  getStats: async (): Promise<ApiResponse<AdminStats>> => {
    const response = await api.get<AdminStats>(ENDPOINTS.ADMIN.STATS, { requiresAuth: true });
    return response.success ? { success: true, data: response.data! } : { success: false, error: response.error };
  },
  getUsers: async (params?: { limit?: number; offset?: number; search?: string }): Promise<ApiResponse<{ users: any[]; pagination: any }>> => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await api.get(ENDPOINTS.ADMIN.USERS + qs, { requiresAuth: true });
    return response.success ? { success: true, data: response.data as any } : { success: false, error: response.error };
  },
  getTransactions: async (params?: { limit?: number; offset?: number; type?: string; userId?: string }): Promise<ApiResponse<{ transactions: any[]; pagination: any }>> => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await api.get(ENDPOINTS.ADMIN.TRANSACTIONS + qs, { requiresAuth: true });
    return response.success ? { success: true, data: response.data as any } : { success: false, error: response.error };
  },
  getDraws: async (params?: { limit?: number; offset?: number; status?: string }): Promise<ApiResponse<{ draws: any[] }>> => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await api.get(ENDPOINTS.ADMIN.DRAWS + qs, { requiresAuth: true });
    return response.success ? { success: true, data: response.data as any } : { success: false, error: response.error };
  },
  getLobbies: async (): Promise<ApiResponse<{ lobbies: any[] }>> => {
    const response = await api.get(ENDPOINTS.ADMIN.LOBBIES, { requiresAuth: true });
    return response.success ? { success: true, data: response.data as any } : { success: false, error: response.error };
  },
  getPaymentSummary: async (params?: { from?: string; to?: string }): Promise<ApiResponse<{ summary: any[]; dateRange: any }>> => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await api.get(ENDPOINTS.ADMIN.PAYMENT_SUMMARY + qs, { requiresAuth: true });
    return response.success ? { success: true, data: response.data as any } : { success: false, error: response.error };
  },
};

// Export all services
export const BackendAPI = {
  Auth: BackendAuthService,
  Lottery: BackendLotteryService,
  Wallet: BackendWalletService,
  User: BackendUserService,
  Lobby: BackendLobbyService,
  Admin: BackendAdminService,
};

export default BackendAPI;
