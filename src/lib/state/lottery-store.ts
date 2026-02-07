import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailService } from '@/lib/services/email-service';
import { generateTicketHash } from '@/lib/crypto/provably-fair';
import { useAppStatsStore } from './app-stats-store';

export interface Ticket {
  id: string;
  drawId: string;
  drawDate: string;
  purchasedAt: string;
  position: number;
  totalEntriesAtPurchase: number;
  ticketHash: string;
  status: 'active' | 'won' | 'lost';
  prizeAmount?: number;
  prizePool?: number;
  finalTotalEntries?: number;
}

export interface LotteryState {
  // User state
  userId: string | null;
  username: string;
  email: string | null;
  walletBalance: number;
  ticketsPurchasedThisYear: number;

  // Tickets
  tickets: Ticket[];
  activeTicket: Ticket | null;

  // Draw info
  currentPrizePool: number;
  activePlayers: number;
  drawTime: Date;
  currentDrawId: string | null;
  currentCommitmentHash: string | null;
  lastWinner: {
    username: string;
    amount: number;
    ticketId: string;
    drawId?: string;
  } | null;

  // Actions
  setUser: (userId: string, username: string, email: string) => void;
  clearUser: () => void;
  purchaseTicket: (drawId: string, commitmentHash: string, position: number, totalEntries: number, prizePool: number) => Promise<Ticket | null>;
  setDrawResult: (winnerId: string, prizeAmount: number, finalTotalEntries: number) => void;
  updateCurrentDraw: (drawId: string, commitmentHash: string, totalEntries: number, prizePool: number) => void;
  addToWallet: (amount: number) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  resetStore: () => Promise<void>;
}

const STORAGE_KEY = '@daily_dollar_lotto';

// Helper to get today's draw time (00:00 UTC)
const getTodayDrawTime = (): Date => {
  const now = new Date();
  const drawTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // Next midnight UTC
    0, 0, 0, 0
  ));

  return drawTime;
};

// Track daily sequence number for ticket IDs
let dailySequence = 0;
let lastSequenceDate = '';

// Generate a ticket ID with date and sequential number
const generateTicketId = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Reset sequence if new day
  if (dateStr !== lastSequenceDate) {
    // Generate starting sequence based on time to simulate realistic position
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    dailySequence = Math.floor((hour * 60 + minute) * 0.8) + Math.floor(Math.random() * 50) + 1;
    lastSequenceDate = dateStr;
  } else {
    dailySequence += 1;
  }

  // Format: DDL-YYYYMMDD-XXXXX (5-digit sequence)
  const seqStr = String(dailySequence).padStart(5, '0');
  return `DDL-${dateStr}-${seqStr}`;
};

// Get today's date string
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Initial fresh state - now starts with 0 for real data
const getInitialState = () => ({
  userId: null,
  username: 'Player',
  email: null,
  walletBalance: 0,
  ticketsPurchasedThisYear: 0,
  tickets: [] as Ticket[],
  activeTicket: null,
  currentPrizePool: 0, // Real pool from today's purchases
  activePlayers: 0, // Real player count from today's purchases
  drawTime: getTodayDrawTime(),
  currentDrawId: null,
  currentCommitmentHash: null,
  lastWinner: null as LotteryState['lastWinner'], // Will be populated from app stats
});

export const useLotteryStore = create<LotteryState>((set, get) => ({
  ...getInitialState(),

  // Actions
  setUser: (userId, username, email) => {
    set({ userId, username, email });
    get().loadFromStorage();
  },

  clearUser: () => {
    set({
      userId: null,
      username: 'Player',
      email: null,
      walletBalance: 0,
      ticketsPurchasedThisYear: 0,
      tickets: [],
      activeTicket: null,
    });
  },

  updateCurrentDraw: (drawId, commitmentHash, totalEntries, prizePool) => {
    set({
      currentDrawId: drawId,
      currentCommitmentHash: commitmentHash,
      activePlayers: totalEntries,
      currentPrizePool: prizePool,
    });
  },

  purchaseTicket: async (drawId, commitmentHash, position, totalEntries, prizePool) => {
    const state = get();
    const today = getTodayString();

    // Check if already purchased today
    const hasTicketToday = state.tickets.some(t => t.drawDate === today);
    if (hasTicketToday) return null;

    // Check annual limit
    if (state.ticketsPurchasedThisYear >= 365) return null;

    // Check wallet balance
    if (state.walletBalance < 1) return null;

    const ticketId = generateTicketId();
    const purchasedAt = new Date().toISOString();

    const newTicket: Ticket = {
      id: ticketId,
      drawId,
      drawDate: today,
      purchasedAt,
      position,
      totalEntriesAtPurchase: totalEntries,
      ticketHash: generateTicketHash(ticketId, drawId, purchasedAt, position),
      status: 'active',
      prizePool,
    };

    set(s => ({
      tickets: [newTicket, ...s.tickets],
      activeTicket: newTicket,
      walletBalance: s.walletBalance - 1,
      ticketsPurchasedThisYear: s.ticketsPurchasedThisYear + 1,
      currentPrizePool: prizePool,
      activePlayers: totalEntries,
      currentDrawId: drawId,
      currentCommitmentHash: commitmentHash,
    }));

    // Record the purchase in global stats for real-time tracking
    if (state.userId) {
      await useAppStatsStore.getState().recordTicketPurchase(state.userId, ticketId, drawId);
    }

    // Send purchase confirmation email
    const updatedState = get();
    if (updatedState.email) {
      await EmailService.sendPurchaseConfirmation(
        updatedState.email,
        updatedState.username,
        newTicket.id,
        prizePool
      );
    }

    await get().saveToStorage();
    return newTicket;
  },

  setDrawResult: (winnerId, prizeAmount, finalTotalEntries) => {
    const state = get();
    const userTicket = state.tickets.find(t => t.status === 'active');
    const isWinner = userTicket?.id === winnerId;

    set(s => ({
      tickets: s.tickets.map(t =>
        t.status === 'active'
          ? {
            ...t,
            status: t.id === winnerId ? 'won' : 'lost',
            prizeAmount: t.id === winnerId ? prizeAmount : undefined,
            finalTotalEntries,
          }
          : t
      ),
      activeTicket: null,
      walletBalance: isWinner ? s.walletBalance + prizeAmount : s.walletBalance,
    }));

    // Send appropriate email
    if (state.email && userTicket) {
      if (isWinner) {
        EmailService.sendWinnerNotification(
          state.email,
          state.username,
          userTicket.id,
          prizeAmount
        );
      } else {
        EmailService.sendDrawResults(
          state.email,
          state.username,
          userTicket.id,
          winnerId,
          prizeAmount
        );
      }
    }

    get().saveToStorage();
  },

  addToWallet: async (amount) => {
    const state = get();
    const newBalance = state.walletBalance + amount;
    set({ walletBalance: newBalance });

    // Record deposit transaction in global stats
    if (state.userId) {
      await useAppStatsStore.getState().addTransaction(state.userId, {
        type: 'deposit',
        amount: amount,
        description: `Added $${amount.toFixed(2)} to wallet`,
        status: 'completed',
      });
    }

    // Send funds added confirmation email
    if (state.email) {
      await EmailService.sendFundsAddedConfirmation(
        state.email,
        state.username,
        amount,
        newBalance
      );
    }

    await get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const state = get();
      if (!state.userId) return;

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${state.userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          walletBalance: data.walletBalance ?? 0,
          ticketsPurchasedThisYear: data.ticketsPurchasedThisYear ?? 0,
          tickets: data.tickets ?? [],
          drawTime: getTodayDrawTime(),
        });
      }
    } catch (error) {
      console.log('Error loading lottery data:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const state = get();
      if (!state.userId) return;

      await AsyncStorage.setItem(`${STORAGE_KEY}_${state.userId}`, JSON.stringify({
        walletBalance: state.walletBalance,
        ticketsPurchasedThisYear: state.ticketsPurchasedThisYear,
        tickets: state.tickets,
      }));
    } catch (error) {
      console.log('Error saving lottery data:', error);
    }
  },

  resetStore: async () => {
    const state = get();
    if (state.userId) {
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${state.userId}`);
    }
    set(getInitialState());
  },
}));
