import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchGlobalStats,
  syncTicketPurchase,
  syncUserRegistration,
  syncDrawCompletion,
  subscribeToUpdates,
  isCloudSyncEnabled,
  type SharedGlobalStats,
} from '@/lib/services/cloud-sync';

const APP_STATS_KEY = '@daily_dollar_lotto_app_stats';

export interface Transaction {
  id: string;
  type: 'deposit' | 'purchase' | 'win' | 'withdrawal_request' | 'withdrawal_completed' | 'withdrawal_failed';
  amount: number;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  metadata?: {
    ticketId?: string;
    drawId?: string;
    paymentMethod?: string;
    withdrawalAddress?: string;
  };
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  paymentMethod: string;
  paymentDetails: string;
  failureReason?: string;
}

export interface GlobalStats {
  // Total registered users
  totalUsers: number;

  // Today's draw specific
  todayTotalTickets: number;
  todayPrizePool: number;
  todayUniqueParticipants: number;

  // All-time stats
  allTimeTotalTickets: number;
  allTimeTotalPrizesPaid: number;
  allTimeTotalDraws: number;
  allTimeTotalWinners: number;

  // Average stats
  averagePoolSize: number;
  largestPoolEver: number;
  largestPoolDate: string;

  // Last winner info
  lastWinner: {
    username: string;
    amount: number;
    ticketId: string;
    drawId: string;
    date: string;
  } | null;

  // Timestamp
  lastUpdated: string;

  // Current draw info (for sync)
  currentDrawId?: string;
  currentDrawDate?: string;
  currentCommitmentHash?: string;
}

interface AppStatsState {
  globalStats: GlobalStats;
  userTransactions: Transaction[];
  userWithdrawals: WithdrawalRequest[];
  isLoading: boolean;
  isCloudConnected: boolean;
  unsubscribe: (() => void) | null;

  // Actions
  loadGlobalStats: () => Promise<void>;
  saveGlobalStats: () => Promise<void>;
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;

  // User registration tracking
  incrementUserCount: (userId?: string) => Promise<void>;

  // Ticket purchase tracking
  recordTicketPurchase: (userId: string, ticketId: string, drawId: string, username?: string) => Promise<void>;

  // Draw completion
  recordDrawCompletion: (drawId: string, winnerUsername: string, winnerTicketId: string, prizeAmount: number, totalEntries: number) => Promise<void>;

  // Transaction tracking
  loadUserTransactions: (userId: string) => Promise<void>;
  addTransaction: (userId: string, transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;

  // Withdrawal management
  requestWithdrawal: (userId: string, amount: number, paymentMethod: string, paymentDetails: string) => Promise<{ success: boolean; error?: string; requestId?: string }>;
  updateWithdrawalStatus: (requestId: string, status: WithdrawalRequest['status'], failureReason?: string) => Promise<void>;

  // Reset today's stats (called at midnight)
  resetDailyStats: () => Promise<void>;

  // Get real-time stats
  getTodayStats: () => { tickets: number; pool: number; participants: number };
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getInitialGlobalStats = (): GlobalStats => ({
  totalUsers: 0,
  todayTotalTickets: 0,
  todayPrizePool: 0,
  todayUniqueParticipants: 0,
  allTimeTotalTickets: 0,
  allTimeTotalPrizesPaid: 0,
  allTimeTotalDraws: 0,
  allTimeTotalWinners: 0,
  averagePoolSize: 0,
  largestPoolEver: 0,
  largestPoolDate: new Date().toISOString().split('T')[0],
  lastWinner: null,
  lastUpdated: new Date().toISOString(),
});

// Convert cloud stats to local format
const cloudToLocalStats = (cloud: SharedGlobalStats): GlobalStats => ({
  totalUsers: cloud.totalUsers,
  todayTotalTickets: cloud.todayTotalTickets,
  todayPrizePool: cloud.todayPrizePool,
  todayUniqueParticipants: cloud.todayUniqueParticipants,
  allTimeTotalTickets: cloud.allTimeTotalTickets,
  allTimeTotalPrizesPaid: cloud.allTimeTotalPrizesPaid,
  allTimeTotalDraws: cloud.allTimeTotalDraws,
  allTimeTotalWinners: cloud.allTimeTotalWinners,
  averagePoolSize: cloud.averagePoolSize,
  largestPoolEver: cloud.largestPoolEver,
  largestPoolDate: cloud.largestPoolDate,
  lastWinner: cloud.lastWinner,
  lastUpdated: cloud.lastUpdated,
  currentDrawId: cloud.currentDrawId,
  currentDrawDate: cloud.currentDrawDate,
  currentCommitmentHash: cloud.currentCommitmentHash,
});

export const useAppStatsStore = create<AppStatsState>((set, get) => ({
  globalStats: getInitialGlobalStats(),
  userTransactions: [],
  userWithdrawals: [],
  isLoading: false,
  isCloudConnected: isCloudSyncEnabled(),
  unsubscribe: null,

  loadGlobalStats: async () => {
    set({ isLoading: true });
    try {
      // Fetch from cloud (will fallback to local if not configured)
      const result = await fetchGlobalStats();

      if (result.success && result.data) {
        const localStats = cloudToLocalStats(result.data);
        set({ globalStats: localStats, isCloudConnected: !result.isOffline });
      }
    } catch (error) {
      console.log('Error loading global stats:', error);
    }
    set({ isLoading: false });
  },

  saveGlobalStats: async () => {
    // Stats are saved through cloud sync, this is a no-op for cloud mode
    // but keeping for compatibility
  },

  startRealtimeSync: () => {
    const { unsubscribe } = get();

    // Clean up existing subscription
    if (unsubscribe) {
      unsubscribe();
    }

    // Start new subscription (polls every 10 seconds for updates)
    const cleanup = subscribeToUpdates((cloudStats) => {
      const localStats = cloudToLocalStats(cloudStats);
      set({ globalStats: localStats });
    }, 10000);

    set({ unsubscribe: cleanup });
  },

  stopRealtimeSync: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  incrementUserCount: async (userId?: string) => {
    // Sync with cloud
    const result = await syncUserRegistration(userId || 'anonymous');

    if (result.success && result.data) {
      const localStats = cloudToLocalStats(result.data);
      set({ globalStats: localStats });
    }
  },

  recordTicketPurchase: async (userId: string, ticketId: string, drawId: string, username?: string) => {
    const { addTransaction } = get();

    // Sync with cloud
    const result = await syncTicketPurchase(userId, ticketId, drawId, username || 'Player');

    if (result.success && result.data) {
      const localStats = cloudToLocalStats(result.data);
      set({ globalStats: localStats });
    }

    // Add to user's transaction history (local)
    await addTransaction(userId, {
      type: 'purchase',
      amount: -1.00,
      description: `Ticket purchase for draw ${drawId}`,
      status: 'completed',
      metadata: { ticketId, drawId },
    });
  },

  recordDrawCompletion: async (drawId: string, winnerUsername: string, winnerTicketId: string, prizeAmount: number, totalEntries: number) => {
    // Sync with cloud
    const result = await syncDrawCompletion(drawId, winnerUsername, winnerTicketId, prizeAmount, totalEntries);

    if (result.success && result.data) {
      const localStats = cloudToLocalStats(result.data);
      set({ globalStats: localStats });
    }
  },

  loadUserTransactions: async (userId: string) => {
    try {
      const key = `${APP_STATS_KEY}_transactions_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          userTransactions: data.transactions ?? [],
          userWithdrawals: data.withdrawals ?? [],
        });
      } else {
        set({ userTransactions: [], userWithdrawals: [] });
      }
    } catch (error) {
      console.log('Error loading user transactions:', error);
      set({ userTransactions: [], userWithdrawals: [] });
    }
  },

  addTransaction: async (userId: string, transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    const { userTransactions } = get();

    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    const updatedTransactions = [newTransaction, ...userTransactions];
    set({ userTransactions: updatedTransactions });

    // Save to storage
    try {
      const key = `${APP_STATS_KEY}_transactions_${userId}`;
      const { userWithdrawals } = get();
      await AsyncStorage.setItem(key, JSON.stringify({
        transactions: updatedTransactions,
        withdrawals: userWithdrawals,
      }));
    } catch (error) {
      console.log('Error saving transaction:', error);
    }
  },

  requestWithdrawal: async (userId: string, amount: number, paymentMethod: string, paymentDetails: string) => {
    const { userWithdrawals, addTransaction } = get();

    // Validate minimum withdrawal
    if (amount < 10) {
      return { success: false, error: 'Minimum withdrawal is $10.00' };
    }

    const request: WithdrawalRequest = {
      id: generateId(),
      userId,
      amount,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      paymentMethod,
      paymentDetails,
    };

    const updatedWithdrawals = [request, ...userWithdrawals];
    set({ userWithdrawals: updatedWithdrawals });

    // Save to storage
    try {
      const key = `${APP_STATS_KEY}_transactions_${userId}`;
      const { userTransactions } = get();
      await AsyncStorage.setItem(key, JSON.stringify({
        transactions: userTransactions,
        withdrawals: updatedWithdrawals,
      }));
    } catch (error) {
      console.log('Error saving withdrawal request:', error);
    }

    // Add pending transaction
    await addTransaction(userId, {
      type: 'withdrawal_request',
      amount: -amount,
      description: `Withdrawal request via ${paymentMethod}`,
      status: 'pending',
      metadata: { withdrawalAddress: paymentDetails },
    });

    return { success: true, requestId: request.id };
  },

  updateWithdrawalStatus: async (requestId: string, status: WithdrawalRequest['status'], failureReason?: string) => {
    const { userWithdrawals } = get();

    const updatedWithdrawals = userWithdrawals.map(w => {
      if (w.id === requestId) {
        return {
          ...w,
          status,
          processedAt: status !== 'pending' ? new Date().toISOString() : undefined,
          failureReason,
        };
      }
      return w;
    });

    set({ userWithdrawals: updatedWithdrawals });

    // Update in storage
    const request = userWithdrawals.find(w => w.id === requestId);
    if (request) {
      try {
        const key = `${APP_STATS_KEY}_transactions_${request.userId}`;
        const { userTransactions } = get();
        await AsyncStorage.setItem(key, JSON.stringify({
          transactions: userTransactions,
          withdrawals: updatedWithdrawals,
        }));
      } catch (error) {
        console.log('Error updating withdrawal status:', error);
      }
    }
  },

  resetDailyStats: async () => {
    // This is handled automatically by the cloud sync service
    // when it detects a new day
    await get().loadGlobalStats();
  },

  getTodayStats: () => {
    const { globalStats } = get();
    return {
      tickets: globalStats.todayTotalTickets,
      pool: globalStats.todayPrizePool,
      participants: globalStats.todayUniqueParticipants,
    };
  },
}));
