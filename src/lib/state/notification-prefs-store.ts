import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PREFS_KEY = '@daily_dollar_lotto_notification_prefs';

export interface NotificationPreferences {
  // Push notification settings
  pushEnabled: boolean;

  // Email notification settings
  emailEnabled: boolean;

  // Specific notification types
  drawReminders: boolean;        // Reminder before draw closes
  drawResults: boolean;          // When a draw completes
  winNotifications: boolean;     // When user wins
  promotionalOffers: boolean;    // Marketing/promotional content
  accountAlerts: boolean;        // Security & account updates
  depositConfirmations: boolean; // When funds are added
  withdrawalUpdates: boolean;    // Withdrawal status changes

  // Draw reminder timing (hours before draw)
  reminderHoursBefore: number;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00" format
  quietHoursEnd: string;   // "08:00" format

  // Last updated
  lastUpdated: string;
}

interface NotificationPrefsState {
  preferences: NotificationPreferences;
  isLoading: boolean;

  // Actions
  loadPreferences: (userId: string) => Promise<void>;
  savePreferences: (userId: string) => Promise<void>;
  updatePreference: <K extends keyof NotificationPreferences>(
    userId: string,
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>;
  resetToDefaults: (userId: string) => Promise<void>;
}

const getDefaultPreferences = (): NotificationPreferences => ({
  pushEnabled: true,
  emailEnabled: true,
  drawReminders: true,
  drawResults: true,
  winNotifications: true,
  promotionalOffers: false,
  accountAlerts: true,
  depositConfirmations: true,
  withdrawalUpdates: true,
  reminderHoursBefore: 1,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  lastUpdated: new Date().toISOString(),
});

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  preferences: getDefaultPreferences(),
  isLoading: false,

  loadPreferences: async (userId: string) => {
    set({ isLoading: true });
    try {
      const key = `${NOTIFICATION_PREFS_KEY}_${userId}`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const prefs = JSON.parse(stored) as NotificationPreferences;
        set({ preferences: prefs });
      } else {
        // First time - save defaults
        const defaults = getDefaultPreferences();
        set({ preferences: defaults });
        await AsyncStorage.setItem(key, JSON.stringify(defaults));
      }
    } catch (error) {
      console.log('Error loading notification preferences:', error);
    }
    set({ isLoading: false });
  },

  savePreferences: async (userId: string) => {
    try {
      const { preferences } = get();
      const key = `${NOTIFICATION_PREFS_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...preferences,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (error) {
      console.log('Error saving notification preferences:', error);
    }
  },

  updatePreference: async <K extends keyof NotificationPreferences>(
    userId: string,
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const { preferences } = get();
    const updated = {
      ...preferences,
      [key]: value,
      lastUpdated: new Date().toISOString(),
    };

    set({ preferences: updated });
    await get().savePreferences(userId);
  },

  resetToDefaults: async (userId: string) => {
    const defaults = getDefaultPreferences();
    set({ preferences: defaults });
    await get().savePreferences(userId);
  },
}));
