import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Draw,
  generateDrawId,
  generateRandomSeed,
  generateCommitmentHash,
  selectWinner,
  verifyDraw,
} from '@/lib/crypto/provably-fair';

const DRAW_STORAGE_KEY = '@daily_dollar_lotto_draws';

interface DrawHistoryState {
  draws: Draw[];
  currentDraw: Draw | null;
  isLoading: boolean;

  // Actions
  loadDraws: () => Promise<void>;
  saveDraws: () => Promise<void>;
  getCurrentDraw: () => Draw | null;
  createDraw: (date: string) => Draw;
  addTicketToDraw: (drawId: string, ticketId: string) => number; // returns position
  lockDraw: (drawId: string) => void;
  executeDraw: (drawId: string) => { winningPosition: number; winningTicketId: string } | null;
  setWinnerInfo: (drawId: string, winnerUsername: string) => void;
  getDrawByDate: (date: string) => Draw | undefined;
  getDrawById: (id: string) => Draw | undefined;
  getPastDraws: () => Draw[];
}

// Get today's date string
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Generate mock past draws for demo purposes
const generateMockPastDraws = (): Draw[] => {
  const draws: Draw[] = [];
  const today = new Date();

  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const seed = generateRandomSeed();
    const totalEntries = Math.floor(Math.random() * 1500) + 800;
    const prizePool = totalEntries * 0.95; // 95% goes to winner (5% platform fee)
    const winningPosition = selectWinner(seed, totalEntries);

    // Generate mock ticket IDs
    const tickets: string[] = [];
    for (let j = 0; j < totalEntries; j++) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let ticketId = 'DDL-';
      for (let k = 0; k < 8; k++) {
        ticketId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      tickets.push(ticketId);
    }

    const drawId = generateDrawId(dateString);
    const commitmentPublishedAt = new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString(); // 6 hours before midnight
    const seedRevealedAt = new Date(date.getTime() + 1000).toISOString(); // Just after midnight

    // Generate anonymous-ish winner username
    const winnerNames = ['Lucky', 'Winner', 'Fortune', 'Star', 'Gold', 'Ace', 'Royal', 'Prime'];
    const winnerUsername = `${winnerNames[Math.floor(Math.random() * winnerNames.length)]}***${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;

    draws.push({
      id: drawId,
      date: dateString,
      commitmentHash: generateCommitmentHash(seed),
      commitmentPublishedAt,
      seed,
      seedRevealedAt,
      totalEntries,
      prizePool,
      winningPosition,
      winningTicketId: tickets[winningPosition],
      winnerUsername,
      status: 'drawn',
      tickets,
    });
  }

  return draws;
};

export const useDrawHistoryStore = create<DrawHistoryState>((set, get) => ({
  draws: [],
  currentDraw: null,
  isLoading: false,

  loadDraws: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(DRAW_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({ draws: data.draws ?? [], currentDraw: data.currentDraw ?? null });
      } else {
        // Initialize with mock past draws
        const mockDraws = generateMockPastDraws();
        set({ draws: mockDraws });
        await get().saveDraws();
      }
    } catch (error) {
      console.log('Error loading draws:', error);
      // Initialize with mock data on error
      const mockDraws = generateMockPastDraws();
      set({ draws: mockDraws });
    }
    set({ isLoading: false });
  },

  saveDraws: async () => {
    try {
      const { draws, currentDraw } = get();
      await AsyncStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify({ draws, currentDraw }));
    } catch (error) {
      console.log('Error saving draws:', error);
    }
  },

  getCurrentDraw: () => {
    const { draws, currentDraw, createDraw } = get();
    const today = getTodayString();

    // Check if we have a current draw for today
    if (currentDraw && currentDraw.date === today && currentDraw.status === 'open') {
      return currentDraw;
    }

    // Check if we already have a draw for today in history
    const existingDraw = draws.find(d => d.date === today);
    if (existingDraw) {
      set({ currentDraw: existingDraw });
      return existingDraw;
    }

    // Create new draw for today
    const newDraw = createDraw(today);
    return newDraw;
  },

  createDraw: (date: string) => {
    const seed = generateRandomSeed();
    const drawId = generateDrawId(date);

    const newDraw: Draw = {
      id: drawId,
      date,
      commitmentHash: generateCommitmentHash(seed),
      commitmentPublishedAt: new Date().toISOString(),
      seed, // In production, this would be stored securely and only revealed after draw
      totalEntries: 0,
      prizePool: 0,
      status: 'open',
      tickets: [],
    };

    set({ currentDraw: newDraw });
    get().saveDraws();

    return newDraw;
  },

  addTicketToDraw: (drawId: string, ticketId: string) => {
    const { currentDraw } = get();

    if (!currentDraw || currentDraw.id !== drawId || currentDraw.status !== 'open') {
      return -1;
    }

    const tickets = currentDraw.tickets ?? [];
    const position = tickets.length + 1;
    const updatedDraw: Draw = {
      ...currentDraw,
      tickets: [...tickets, ticketId],
      totalEntries: currentDraw.totalEntries + 1,
      prizePool: currentDraw.prizePool + 0.95, // 95% of $1 goes to pool
    };

    set({ currentDraw: updatedDraw });
    get().saveDraws();

    return position;
  },

  lockDraw: (drawId: string) => {
    const { currentDraw, draws } = get();

    if (currentDraw && currentDraw.id === drawId) {
      const lockedDraw: Draw = {
        ...currentDraw,
        status: 'locked',
      };
      set({ currentDraw: lockedDraw });
      get().saveDraws();
    }
  },

  executeDraw: (drawId: string) => {
    const { currentDraw, draws } = get();

    if (!currentDraw || currentDraw.id !== drawId || !currentDraw.seed) {
      return null;
    }

    if (currentDraw.totalEntries === 0) {
      return null;
    }

    const winningPosition = selectWinner(currentDraw.seed, currentDraw.totalEntries);
    const tickets = currentDraw.tickets ?? [];
    const winningTicketId = tickets[winningPosition] ?? `position-${winningPosition}`;

    const drawnDraw: Draw = {
      ...currentDraw,
      status: 'drawn',
      winningPosition,
      winningTicketId,
      seedRevealedAt: new Date().toISOString(),
    };

    // Move to history and clear current
    set({
      draws: [drawnDraw, ...draws],
      currentDraw: null,
    });
    get().saveDraws();

    return { winningPosition, winningTicketId };
  },

  setWinnerInfo: (drawId: string, winnerUsername: string) => {
    const { draws } = get();
    const updatedDraws = draws.map(d =>
      d.id === drawId ? { ...d, winnerUsername } : d
    );
    set({ draws: updatedDraws });
    get().saveDraws();
  },

  getDrawByDate: (date: string) => {
    const { draws, currentDraw } = get();
    if (currentDraw?.date === date) return currentDraw;
    return draws.find(d => d.date === date);
  },

  getDrawById: (id: string) => {
    const { draws, currentDraw } = get();
    if (currentDraw?.id === id) return currentDraw;
    return draws.find(d => d.id === id);
  },

  getPastDraws: () => {
    const { draws } = get();
    return draws.filter(d => d.status === 'drawn').slice(0, 30); // Last 30 draws
  },
}));
