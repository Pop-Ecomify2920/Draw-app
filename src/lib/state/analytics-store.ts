import { create } from 'zustand';
import { useAppStatsStore } from './app-stats-store';

export interface DrawAnalytics {
  // Current draw stats
  totalEntries: number;
  prizePool: number;
  timeRemaining: number; // milliseconds

  // Historical comparisons
  averagePoolSize: number;
  largestPoolEver: number;
  largestPoolDate: string;
  smallestPoolEver: number;
  totalDrawsAllTime: number;
  totalPrizesPaidAllTime: number;

  // Ranking
  currentPoolRank: number; // 1 = largest ever
  percentileRank: number; // e.g., 85 = larger than 85% of draws

  // Entry rate analytics
  entriesLastHour: number;
  entriesLast24Hours: number;
  peakEntriesPerHour: number;
  averageEntriesPerDraw: number;

  // Time-based patterns
  hourlyEntryDistribution: number[]; // 24 hours
  dayOfWeekDistribution: number[]; // 7 days

  // User-specific (if they have a ticket)
  userPosition?: number;
  userOdds?: number;
  userOddsPercentage?: string;
  betterOddsThan?: number; // percentage of historical draws with more entries
}

interface AnalyticsState {
  analytics: DrawAnalytics | null;
  isLoading: boolean;
  lastUpdated: Date | null;

  loadAnalytics: (currentEntries: number, currentPool: number, userPosition?: number) => void;
  refreshAnalytics: () => void;
}

// Generate realistic mock historical data
const generateMockHistoricalData = () => {
  const pools: number[] = [];
  const entries: number[] = [];

  // Generate 365 days of historical data
  for (let i = 0; i < 365; i++) {
    // Simulate varying pool sizes with some patterns
    const dayOfWeek = i % 7;
    const baseEntries = 800 + Math.random() * 600;
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1;
    const seasonalFactor = 1 + 0.2 * Math.sin((i / 365) * Math.PI * 2);

    const dayEntries = Math.floor(baseEntries * weekendBoost * seasonalFactor);
    entries.push(dayEntries);
    pools.push(dayEntries * 0.95); // 95% goes to pool
  }

  return { pools, entries };
};

const historicalData = generateMockHistoricalData();

// Generate hourly distribution (UTC hours)
const generateHourlyDistribution = (): number[] => {
  // Peak hours around 18:00-22:00 UTC
  return [
    3, 2, 1, 1, 2, 4, 6, 8, 9, 8, 7, 6, // 00:00 - 11:00
    5, 6, 7, 8, 9, 11, 12, 10, 8, 6, 5, 4  // 12:00 - 23:00
  ];
};

// Generate day of week distribution (Sunday = 0)
const generateDayOfWeekDistribution = (): number[] => {
  return [18, 12, 13, 14, 14, 15, 14]; // Weekend higher
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  analytics: null,
  isLoading: false,
  lastUpdated: null,

  loadAnalytics: (currentEntries: number, currentPool: number, userPosition?: number) => {
    set({ isLoading: true });

    // Get real global stats if available
    const globalStats = useAppStatsStore.getState().globalStats;
    const hasRealData = globalStats.allTimeTotalDraws > 0;

    // Use real historical data if available, otherwise use mock
    const { pools, entries } = hasRealData
      ? {
          pools: Array(globalStats.allTimeTotalDraws).fill(globalStats.averagePoolSize),
          entries: Array(globalStats.allTimeTotalDraws).fill(Math.floor(globalStats.allTimeTotalTickets / Math.max(1, globalStats.allTimeTotalDraws))),
        }
      : historicalData;

    // Calculate statistics - use real data where available
    const averagePoolSize = hasRealData ? globalStats.averagePoolSize : pools.reduce((a, b) => a + b, 0) / pools.length;
    const largestPoolEver = hasRealData ? Math.max(globalStats.largestPoolEver, currentPool) : Math.max(...pools, currentPool);
    const smallestPoolEver = Math.min(...pools);
    const totalPrizesPaidAllTime = hasRealData ? globalStats.allTimeTotalPrizesPaid : pools.reduce((a, b) => a + b, 0);
    const totalDrawsAllTime = hasRealData ? globalStats.allTimeTotalDraws : 365;

    // Calculate rank
    const poolsWithCurrent = [...pools, currentPool].sort((a, b) => b - a);
    const currentPoolRank = poolsWithCurrent.indexOf(currentPool) + 1;
    const percentileRank = Math.round((1 - (currentPoolRank / poolsWithCurrent.length)) * 100);

    // Entry rate (mock real-time data)
    const entriesLastHour = Math.floor(currentEntries * 0.05 + Math.random() * 20);
    const entriesLast24Hours = currentEntries;
    const peakEntriesPerHour = Math.floor(Math.max(...entries) * 0.08);
    const averageEntriesPerDraw = hasRealData
      ? Math.round(globalStats.allTimeTotalTickets / Math.max(1, globalStats.allTimeTotalDraws))
      : Math.round(entries.reduce((a, b) => a + b, 0) / entries.length);

    // Better odds calculation
    const drawsWithMoreEntries = entries.filter(e => e > currentEntries).length;
    const betterOddsThan = Math.round((drawsWithMoreEntries / entries.length) * 100);

    // User-specific calculations
    let userOdds: number | undefined;
    let userOddsPercentage: string | undefined;

    if (userPosition && currentEntries > 0) {
      userOdds = 1 / currentEntries;
      const pct = userOdds * 100;
      userOddsPercentage = pct < 0.01 ? pct.toExponential(2) : pct.toFixed(4);
    }

    // Use real largest pool date if available
    const largestPoolDate = hasRealData
      ? globalStats.largestPoolDate
      : (() => {
          const largestPoolIndex = pools.indexOf(Math.max(...pools));
          const largestDate = new Date();
          largestDate.setDate(largestDate.getDate() - (365 - largestPoolIndex));
          return largestDate.toISOString().split('T')[0];
        })();

    const analytics: DrawAnalytics = {
      totalEntries: currentEntries,
      prizePool: currentPool,
      timeRemaining: 0, // Will be calculated by UI

      averagePoolSize,
      largestPoolEver,
      largestPoolDate,
      smallestPoolEver,
      totalDrawsAllTime,
      totalPrizesPaidAllTime,

      currentPoolRank,
      percentileRank,

      entriesLastHour,
      entriesLast24Hours,
      peakEntriesPerHour,
      averageEntriesPerDraw,

      hourlyEntryDistribution: generateHourlyDistribution(),
      dayOfWeekDistribution: generateDayOfWeekDistribution(),

      userPosition,
      userOdds,
      userOddsPercentage,
      betterOddsThan,
    };

    set({
      analytics,
      isLoading: false,
      lastUpdated: new Date(),
    });
  },

  refreshAnalytics: () => {
    const { analytics } = get();
    if (analytics) {
      // Get fresh global stats
      const globalStats = useAppStatsStore.getState().globalStats;
      const newEntries = globalStats.todayTotalTickets > 0 ? globalStats.todayTotalTickets : analytics.totalEntries + Math.floor(Math.random() * 3);
      const newPool = globalStats.todayPrizePool > 0 ? globalStats.todayPrizePool : newEntries * 0.95;
      get().loadAnalytics(newEntries, newPool, analytics.userPosition);
    }
  },
}));
