import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailService } from '@/lib/services/email-service';
import { useLotteryStore } from './lottery-store';
import { useAppStatsStore } from './app-stats-store';

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isVerified: boolean;
  isAdmin?: boolean;
}

interface StoredUser extends User {
  passwordHash: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (updates: Partial<Pick<User, 'username'>>) => Promise<{ success: boolean; error?: string }>;
  loadAuth: () => Promise<void>;
}

const AUTH_STORAGE_KEY = '@daily_dollar_lotto_auth';
const USERS_STORAGE_KEY = '@daily_dollar_lotto_users';

// Simple hash function for demo (in production, use proper hashing on backend)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Generate a simple user ID
const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substring(2, 15);
};

// Get all stored users
const getStoredUsers = async (): Promise<StoredUser[]> => {
  try {
    const stored = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save users to storage
const saveUsers = async (users: StoredUser[]): Promise<void> => {
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  signIn: async (email, password) => {
    try {
      // Basic validation
      if (!email || !password) {
        return { success: false, error: 'Please enter email and password' };
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail.includes('@')) {
        return { success: false, error: 'Please enter a valid email' };
      }

      // Check if user exists
      const users = await getStoredUsers();
      const existingUser = users.find(u => u.email === normalizedEmail);

      if (!existingUser) {
        return { success: false, error: 'No account found with this email' };
      }

      // Verify password
      const passwordHash = simpleHash(password);
      if (existingUser.passwordHash !== passwordHash) {
        return { success: false, error: 'Incorrect password' };
      }

      // Create user object (without password hash)
      const user: User = {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        createdAt: existingUser.createdAt,
        isVerified: existingUser.isVerified,
      };

      set({ user, isAuthenticated: true });

      // Save current session
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      // Connect to lottery store
      useLotteryStore.getState().setUser(user.id, user.username, user.email);

      // Load user transactions
      await useAppStatsStore.getState().loadUserTransactions(user.id);

      return { success: true };
    } catch (error) {
      console.log('Sign in error:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  },

  signUp: async (email, password, username) => {
    try {
      // Validation
      if (!email || !password || !username) {
        return { success: false, error: 'Please fill in all fields' };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const trimmedUsername = username.trim();

      if (!normalizedEmail.includes('@')) {
        return { success: false, error: 'Please enter a valid email' };
      }

      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      if (trimmedUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
      }

      // Check if email already exists
      const users = await getStoredUsers();
      const existingUser = users.find(u => u.email === normalizedEmail);

      if (existingUser) {
        return { success: false, error: 'An account with this email already exists' };
      }

      // Check if username already exists
      const existingUsername = users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());

      if (existingUsername) {
        return { success: false, error: 'This username is already taken' };
      }

      // Create new user
      const newUser: StoredUser = {
        id: generateUserId(),
        email: normalizedEmail,
        username: trimmedUsername,
        createdAt: new Date().toISOString(),
        isVerified: true, // Auto-verify for demo
        passwordHash: simpleHash(password),
      };

      // Save to users list
      users.push(newUser);
      await saveUsers(users);

      // Create user object (without password hash)
      const user: User = {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        createdAt: newUser.createdAt,
        isVerified: newUser.isVerified,
      };

      set({ user, isAuthenticated: true });

      // Save current session
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      // Connect to lottery store
      useLotteryStore.getState().setUser(user.id, user.username, user.email);

      // Increment global user count for real stats
      await useAppStatsStore.getState().incrementUserCount();

      // Load user transactions
      await useAppStatsStore.getState().loadUserTransactions(user.id);

      // Send welcome email
      await EmailService.sendWelcomeEmail(normalizedEmail, trimmedUsername);

      return { success: true };
    } catch (error) {
      console.log('Sign up error:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  },

  signOut: async () => {
    set({ user: null, isAuthenticated: false });
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

    // Clear lottery store user data
    useLotteryStore.getState().clearUser();
  },

  resetPassword: async (email) => {
    try {
      if (!email) {
        return { success: false, error: 'Please enter your email' };
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail.includes('@')) {
        return { success: false, error: 'Please enter a valid email' };
      }

      // Check if user exists
      const users = await getStoredUsers();
      const existingUser = users.find(u => u.email === normalizedEmail);

      if (!existingUser) {
        // For security, don't reveal if email exists or not
        // But still "send" the email (it won't actually go anywhere)
        return { success: true };
      }

      // Send password reset email
      await EmailService.sendPasswordResetEmail(normalizedEmail, existingUser.username);

      return { success: true };
    } catch (error) {
      console.log('Reset password error:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  },

  updateUser: async (updates) => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }

      // Update users list
      const users = await getStoredUsers();
      const userIndex = users.findIndex(u => u.id === currentUser.id);

      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      // Check if new username is taken (if username is being updated)
      if (updates.username) {
        const existingUsername = users.find(
          u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== currentUser.id
        );
        if (existingUsername) {
          return { success: false, error: 'This username is already taken' };
        }
        users[userIndex].username = updates.username;
      }

      await saveUsers(users);

      // Update current user state
      const updatedUser: User = {
        ...currentUser,
        ...updates,
      };

      set({ user: updatedUser });

      // Update session storage
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

      // Update lottery store if username changed
      if (updates.username) {
        useLotteryStore.getState().setUser(updatedUser.id, updatedUser.username, updatedUser.email);
      }

      return { success: true };
    } catch (error) {
      console.log('Update user error:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  },

  loadAuth: async () => {
    try {
      // 1. Try backend tokens first (when using API)
      const { getStoredTokens } = await import('@/lib/api/client');
      const { isApiConfigured } = await import('@/lib/api/config');
      if (isApiConfigured()) {
        const tokens = await getStoredTokens();
        if (tokens?.accessToken) {
          const { api } = await import('@/lib/api/client');
          const { ENDPOINTS } = await import('@/lib/api/config');
          const res = await api.get(ENDPOINTS.USERS.ME, { requiresAuth: true }).catch(() => null);
          if (res?.success && (res as any).data?.user) {
            const user = (res as any).data.user;
            const appUser: User = {
              id: user.id,
              email: user.email,
              username: user.username || user.email?.split('@')[0] || 'User',
              createdAt: user.created_at || new Date().toISOString(),
              isVerified: user.email_verified ?? true,
              isAdmin: !!user.isAdmin,
            };
            set({ user: appUser, isAuthenticated: true, isLoading: false });
            useLotteryStore.getState().setUser(appUser.id, appUser.username, appUser.email);
            return;
          }
        }
      }

      // 2. Fallback: legacy local storage
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored) as User;
        const users = await getStoredUsers();
        const existingUser = users.find(u => u.id === user.id);

        if (existingUser) {
          set({ user, isAuthenticated: true, isLoading: false });
          useLotteryStore.getState().setUser(user.id, user.username, user.email);
        } else {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.log('Error loading auth:', error);
      set({ isLoading: false });
    }
  },
}));
