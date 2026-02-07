/**
 * Cloud Sync Service
 *
 * This service provides real-time synchronization across all devices and accounts.
 * It uses a REST API approach that can work with any backend (Supabase, Firebase, custom API).
 *
 * SETUP REQUIRED:
 * 1. Set EXPO_PUBLIC_API_URL in the ENV tab (your backend API endpoint)
 * 2. Set EXPO_PUBLIC_API_KEY in the ENV tab (optional, for authentication)
 *
 * The backend should provide these endpoints:
 * - GET  /stats          - Get global app statistics
 * - POST /stats/ticket   - Record a ticket purchase
 * - POST /stats/user     - Record a new user registration
 * - GET  /draws/current  - Get current draw info
 * - GET  /draws/history  - Get draw history
 * - POST /draws/ticket   - Add ticket to current draw
 *
 * If no backend is configured or it fails, the service falls back to local-only mode
 * which still provides a working experience on a single device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

// Track if cloud sync has failed (to avoid spamming failed requests)
let cloudSyncFailed = false;
let lastFailureTime = 0;
const RETRY_AFTER_MS = 60000; // Retry cloud sync after 1 minute

// Check if cloud sync is configured
export const isCloudSyncEnabled = (): boolean => {
  return !!API_URL && API_URL.length > 0;
};

// Check if we should attempt cloud sync (configured and not recently failed)
const shouldAttemptCloudSync = (): boolean => {
  if (!isCloudSyncEnabled()) return false;
  if (!cloudSyncFailed) return true;

  // Check if enough time has passed to retry
  const now = Date.now();
  if (now - lastFailureTime > RETRY_AFTER_MS) {
    cloudSyncFailed = false;
    return true;
  }

  return false;
};

// Mark cloud sync as failed
const markCloudSyncFailed = () => {
  cloudSyncFailed = true;
  lastFailureTime = Date.now();
};

// Shared state key for local fallback
const SHARED_STATE_KEY = '@daily_dollar_lotto_shared_state';

export interface SharedGlobalStats {
  totalUsers: number;
  todayTotalTickets: number;
  todayPrizePool: number;
  todayUniqueParticipants: number;
  allTimeTotalTickets: number;
  allTimeTotalPrizesPaid: number;
  allTimeTotalDraws: number;
  allTimeTotalWinners: number;
  averagePoolSize: number;
  largestPoolEver: number;
  largestPoolDate: string;
  lastWinner: {
    username: string;
    amount: number;
    ticketId: string;
    drawId: string;
    date: string;
  } | null;
  lastUpdated: string;
  // Current draw info
  currentDrawId: string;
  currentDrawDate: string;
  currentCommitmentHash: string;
}

export interface CloudSyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
}

// Headers for API requests
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  return headers;
};

// Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Get global statistics from cloud
 */
export const fetchGlobalStats = async (): Promise<CloudSyncResult<SharedGlobalStats>> => {
  // If cloud sync not configured or recently failed, use local shared state
  if (!shouldAttemptCloudSync()) {
    return getLocalSharedState();
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/stats`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      markCloudSyncFailed();
      throw new Error(`HTTP ${response.status}`);
    }

    // Cloud sync successful - reset failure state
    cloudSyncFailed = false;

    const data = await response.json();

    // Cache locally for offline access
    await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(data));

    return { success: true, data };
  } catch (error) {
    markCloudSyncFailed();
    // Fall back to local cache silently (don't spam logs)
    return getLocalSharedState();
  }
};

/**
 * Record a ticket purchase to the cloud
 */
export const syncTicketPurchase = async (
  userId: string,
  ticketId: string,
  drawId: string,
  username: string
): Promise<CloudSyncResult<SharedGlobalStats>> => {
  // Update local state first for immediate feedback
  await updateLocalTicketPurchase();

  if (!shouldAttemptCloudSync()) {
    return getLocalSharedState();
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/stats/ticket`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        userId,
        ticketId,
        drawId,
        username,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      markCloudSyncFailed();
      throw new Error(`HTTP ${response.status}`);
    }

    cloudSyncFailed = false;
    const data = await response.json();
    await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(data));

    return { success: true, data };
  } catch (error) {
    markCloudSyncFailed();
    const localResult = await getLocalSharedState();
    return { success: true, isOffline: true, data: localResult.data };
  }
};

/**
 * Record a new user registration to the cloud
 */
export const syncUserRegistration = async (userId: string): Promise<CloudSyncResult<SharedGlobalStats>> => {
  // Update local state first
  await updateLocalUserCount();

  if (!shouldAttemptCloudSync()) {
    return getLocalSharedState();
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/stats/user`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        userId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      markCloudSyncFailed();
      throw new Error(`HTTP ${response.status}`);
    }

    cloudSyncFailed = false;
    const data = await response.json();
    await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(data));

    return { success: true, data };
  } catch (error) {
    markCloudSyncFailed();
    const localResult = await getLocalSharedState();
    return { success: true, isOffline: true, data: localResult.data };
  }
};

/**
 * Record draw completion to the cloud
 */
export const syncDrawCompletion = async (
  drawId: string,
  winnerUsername: string,
  winnerTicketId: string,
  prizeAmount: number,
  totalEntries: number
): Promise<CloudSyncResult<SharedGlobalStats>> => {
  // Update local state first
  await updateLocalDrawCompletion(winnerUsername, winnerTicketId, prizeAmount, drawId);

  if (!shouldAttemptCloudSync()) {
    return getLocalSharedState();
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/draws/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        drawId,
        winnerUsername,
        winnerTicketId,
        prizeAmount,
        totalEntries,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      markCloudSyncFailed();
      throw new Error(`HTTP ${response.status}`);
    }

    cloudSyncFailed = false;
    const data = await response.json();
    await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(data));

    return { success: true, data };
  } catch (error) {
    markCloudSyncFailed();
    const localResult = await getLocalSharedState();
    return { success: true, isOffline: true, data: localResult.data };
  }
};

// ============ LOCAL SHARED STATE (Fallback) ============

const getDefaultSharedState = (): SharedGlobalStats => {
  const today = new Date().toISOString().split('T')[0];
  return {
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
    largestPoolDate: today,
    lastWinner: null,
    lastUpdated: new Date().toISOString(),
    currentDrawId: `DRAW-${today}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    currentDrawDate: today,
    currentCommitmentHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
  };
};

const getLocalSharedState = async (): Promise<CloudSyncResult<SharedGlobalStats>> => {
  try {
    const stored = await AsyncStorage.getItem(SHARED_STATE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as SharedGlobalStats;

      // Check if we need to reset daily stats (new day)
      const today = new Date().toISOString().split('T')[0];
      if (data.currentDrawDate !== today) {
        // New day - reset daily counters
        const updatedData: SharedGlobalStats = {
          ...data,
          todayTotalTickets: 0,
          todayPrizePool: 0,
          todayUniqueParticipants: 0,
          currentDrawId: `DRAW-${today}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          currentDrawDate: today,
          currentCommitmentHash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
          lastUpdated: new Date().toISOString(),
        };
        await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(updatedData));
        return { success: true, data: updatedData };
      }

      return { success: true, data };
    }

    // Initialize with defaults
    const defaults = getDefaultSharedState();
    await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(defaults));
    return { success: true, data: defaults };
  } catch (error) {
    console.log('Error loading shared state:', error);
    return { success: true, data: getDefaultSharedState() };
  }
};

const updateLocalTicketPurchase = async (): Promise<void> => {
  try {
    const result = await getLocalSharedState();
    if (result.data) {
      const updated: SharedGlobalStats = {
        ...result.data,
        todayTotalTickets: result.data.todayTotalTickets + 1,
        todayPrizePool: (result.data.todayTotalTickets + 1) * 0.95,
        todayUniqueParticipants: result.data.todayUniqueParticipants + 1,
        allTimeTotalTickets: result.data.allTimeTotalTickets + 1,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.log('Error updating local ticket:', error);
  }
};

const updateLocalUserCount = async (): Promise<void> => {
  try {
    const result = await getLocalSharedState();
    if (result.data) {
      const updated: SharedGlobalStats = {
        ...result.data,
        totalUsers: result.data.totalUsers + 1,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.log('Error updating local user count:', error);
  }
};

const updateLocalDrawCompletion = async (
  winnerUsername: string,
  winnerTicketId: string,
  prizeAmount: number,
  drawId: string
): Promise<void> => {
  try {
    const result = await getLocalSharedState();
    if (result.data) {
      const newTotalDraws = result.data.allTimeTotalDraws + 1;
      const newTotalPrizes = result.data.allTimeTotalPrizesPaid + prizeAmount;

      const updated: SharedGlobalStats = {
        ...result.data,
        allTimeTotalDraws: newTotalDraws,
        allTimeTotalPrizesPaid: newTotalPrizes,
        allTimeTotalWinners: result.data.allTimeTotalWinners + 1,
        averagePoolSize: newTotalPrizes / newTotalDraws,
        largestPoolEver: Math.max(result.data.largestPoolEver, prizeAmount),
        largestPoolDate: prizeAmount > result.data.largestPoolEver
          ? new Date().toISOString().split('T')[0]
          : result.data.largestPoolDate,
        lastWinner: {
          username: winnerUsername,
          amount: prizeAmount,
          ticketId: winnerTicketId,
          drawId,
          date: new Date().toISOString().split('T')[0],
        },
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(SHARED_STATE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.log('Error updating local draw completion:', error);
  }
};

/**
 * Subscribe to real-time updates (polling fallback)
 * Returns cleanup function
 */
export const subscribeToUpdates = (
  onUpdate: (stats: SharedGlobalStats) => void,
  intervalMs = 10000 // Poll every 10 seconds for cloud, slower for local-only
): (() => void) => {
  let isActive = true;

  // Use longer interval for local-only mode (no need to poll frequently)
  const effectiveInterval = shouldAttemptCloudSync() ? intervalMs : 30000;

  const poll = async () => {
    if (!isActive) return;

    const result = await fetchGlobalStats();
    if (result.success && result.data && isActive) {
      onUpdate(result.data);
    }
  };

  // Initial fetch
  poll();

  // Set up polling
  const intervalId = setInterval(poll, effectiveInterval);

  // Return cleanup function
  return () => {
    isActive = false;
    clearInterval(intervalId);
  };
};
