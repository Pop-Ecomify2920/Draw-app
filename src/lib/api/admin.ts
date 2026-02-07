import { api, type ApiResponse } from './client';

// Admin Statistics
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
  draws: { total: number; completed: number; open: number };
  lobbies: { total: number; completed: number };
  last30DaysByType: Array<{ type: string; total: number; count: number }>;
}

// User Management
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  balance: number;
  pendingBalance: number;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  selfExcludedUntil: string | null;
  spendingLimitDaily: number | null;
  spendingLimitMonthly: number | null;
  isAdmin: boolean;
}

export interface UserTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  metadata?: any;
}

export interface BalanceAdjustment {
  userId: string;
  amount: number;
  reason: string;
}

// Draw Management
export interface AdminDraw {
  id: string;
  drawDate: string;
  prizePool: number;
  status: string;
  winnerId: string | null;
  winnerUsername: string | null;
  ticketCount: number;
  serverSeed: string | null;
  drawnAt: string | null;
}

export interface DrawParticipant {
  ticketId: string;
  userId: string;
  username: string;
  ticketHash: string;
  createdAt: string;
  isWinner: boolean;
}

// Transaction Monitoring
export interface AdminTransaction {
  id: string;
  userId: string;
  username: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  metadata?: any;
}

// Lobby Management
export interface AdminLobby {
  id: string;
  code: string;
  hostId: string;
  hostUsername: string;
  prizePool: number;
  status: string;
  createdAt: string;
  memberCount: number;
}

export interface LobbyMember {
  userId: string;
  username: string;
  hasTicket: boolean;
  ticketPosition: number | null;
  joinedAt: string;
}

export const AdminService = {
  // ==================== User Management ====================
  
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{ users: AdminUser[]; total: number; page: number; limit: number }>> {
    const queryParams = new URLSearchParams();
    const limit = params?.limit || 50;
    const page = params?.page || 1;
    const offset = (page - 1) * limit;
    
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    
    return api.get(`/admin/users?${queryParams.toString()}`, { requiresAuth: true });
  },

  async getUserDetails(userId: string): Promise<ApiResponse<{ user: AdminUser; transactions: UserTransaction[] }>> {
    return api.get(`/admin/users/${userId}`, { requiresAuth: true });
  },

  async suspendUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return api.post(`/admin/users/${userId}/suspend`, {}, { requiresAuth: true });
  },

  async reactivateUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return api.post(`/admin/users/${userId}/reactivate`, {}, { requiresAuth: true });
  },

  async adjustBalance(data: BalanceAdjustment): Promise<ApiResponse<{ balance: number; transaction: UserTransaction }>> {
    return api.post(`/admin/users/${data.userId}/balance`, 
      { amount: data.amount, reason: data.reason }, 
      { requiresAuth: true }
    );
  },

  // ==================== Draw Management ====================
  
  async getDraws(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ draws: AdminDraw[]; total: number; page: number; limit: number }>> {
    const queryParams = new URLSearchParams();
    const limit = params?.limit || 50;
    const page = params?.page || 1;
    const offset = (page - 1) * limit;
    
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    return api.get(`/admin/draws?${queryParams.toString()}`, { requiresAuth: true });
  },

  async getDrawDetails(drawId: string): Promise<ApiResponse<{ draw: AdminDraw; participants: DrawParticipant[] }>> {
    return api.get(`/admin/draws/${drawId}`, { requiresAuth: true });
  },

  async triggerDraw(drawId: string): Promise<ApiResponse<{ draw: AdminDraw; winner: DrawParticipant }>> {
    return api.post(`/admin/draws/${drawId}/trigger`, {}, { requiresAuth: true });
  },

  // ==================== Transaction Monitoring ====================
  
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ transactions: AdminTransaction[]; total: number; page: number; limit: number }>> {
    const queryParams = new URLSearchParams();
    const limit = params?.limit || 100;
    const page = params?.page || 1;
    const offset = (page - 1) * limit;
    
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    return api.get(`/admin/transactions?${queryParams.toString()}`, { requiresAuth: true });
  },

  async exportTransactions(params?: {
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'json';
  }): Promise<ApiResponse<{ url: string }>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.format) queryParams.append('format', params.format);
    
    return api.get(`/admin/transactions/export?${queryParams.toString()}`, { requiresAuth: true });
  },

  // ==================== Lobby Management ====================
  
  async getLobbies(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<{ lobbies: AdminLobby[]; total: number; page: number; limit: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return api.get(`/admin/lobbies?${queryParams.toString()}`, { requiresAuth: true });
  },

  async getLobbyDetails(lobbyId: string): Promise<ApiResponse<{ lobby: AdminLobby; members: LobbyMember[] }>> {
    return api.get(`/admin/lobbies/${lobbyId}`, { requiresAuth: true });
  },
};
