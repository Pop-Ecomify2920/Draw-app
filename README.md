# Daily Dollar Lotto - Complete App Documentation

A micro-lottery mobile app where users can purchase one $1 ticket per day for a chance to win the daily prize pool. Features a **provably fair** cryptographic verification system.

---

## COLOR SCHEME

```
Primary Background:  #0A1628 (Deep Navy)
Secondary Background: #0F2847 (Slightly lighter navy)
Card Background:     #1E3A5F (Blue-gray cards)
Border Color:        #2E4A6F (Subtle borders)

Accent Gold:         #FFD700 (Primary gold)
Accent Orange:       #FFA500 (Gradient partner)

Success Green:       #22C55E (Verification, wins)
Error Red:           #EF4444 (Errors, danger)
Warning Orange:      #FFA500 (Warnings)

Text Primary:        #FFFFFF (White)
Text Secondary:      #FFFFFF/60 (60% white opacity)
Text Muted:          #FFFFFF/40 (40% white opacity)
Text Inactive:       #6B7C93 (Gray-blue)
```

---

## TECH STACK

- **Expo SDK 53** / **React Native 0.79.6**
- **NativeWind** (TailwindCSS for React Native)
- **Zustand** for state management with AsyncStorage persistence
- **React Query** (`@tanstack/react-query`) for server/async state
- **React Native Reanimated v3** for animations
- **React Native Gesture Handler** for gestures
- **Lucide React Native** for icons
- **date-fns** for date formatting
- **expo-haptics** for haptic feedback
- **expo-linear-gradient** for gradients
- **expo-clipboard** for copy functionality
- **RevenueCat** (`react-native-purchases`) for payments
- **bun** as package manager (NOT npm)

---

## FILE STRUCTURE

```
src/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout with Stack navigator
│   ├── (tabs)/                   # Tab navigation group
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Home tab (prize pool, countdown)
│   │   ├── lobby.tsx             # Lobby tab (private rooms)
│   │   ├── tickets.tsx           # My Tickets tab
│   │   ├── withdraw.tsx          # Withdraw tab
│   │   └── profile.tsx           # Profile tab
│   ├── purchase.tsx              # Ticket purchase modal
│   ├── ticket-details.tsx        # Digital receipt modal
│   ├── add-funds.tsx             # Add wallet funds modal
│   ├── sign-in.tsx               # Sign in screen
│   ├── sign-up.tsx               # Sign up screen
│   ├── forgot-password.tsx       # Password reset screen
│   ├── account-settings.tsx      # Account settings screen
│   ├── draw-details.tsx          # Draw verification modal
│   ├── draw-history.tsx          # Past draws screen
│   ├── draw-stats.tsx            # Live analytics modal
│   ├── why-fair.tsx              # Provably fair explanation
│   ├── demo-win.tsx              # Demo win screen
│   ├── create-room.tsx           # Create lobby room modal
│   ├── join-room.tsx             # Join lobby room modal
│   ├── room/[id].tsx             # Dynamic room screen
│   ├── lobby-how-to-play.tsx     # Lobby tutorial
│   ├── payment-methods.tsx       # Payment methods screen
│   ├── notifications.tsx         # Notification preferences
│   ├── self-exclusion.tsx        # Responsible gaming
│   ├── spending-limits.tsx       # Spending limits
│   ├── help-center.tsx           # Help center
│   ├── terms.tsx                 # Terms & conditions
│   ├── +not-found.tsx            # 404 page
│   └── +html.tsx                 # Web HTML template
├── components/
│   └── Themed.tsx                # Themed components
└── lib/
    ├── cn.ts                     # className merge utility
    ├── useColorScheme.ts         # Color scheme hook
    ├── revenuecatClient.ts       # RevenueCat SDK wrapper
    ├── crypto/
    │   └── provably-fair.ts      # Cryptographic functions
    ├── services/
    │   ├── cloud-sync.ts         # Cross-device sync
    │   └── email-service.ts      # Email notifications
    ├── api/                      # Cloud API Layer
    │   ├── config.ts             # API configuration and endpoints
    │   ├── client.ts             # HTTP client with token management
    │   ├── mock.ts               # Mock data for development
    │   └── index.ts              # Service functions (Auth, User, Lottery, Rooms)
    ├── hooks/                    # React Query Hooks
    │   ├── useAuth.ts            # Auth hooks (signIn, signUp, signOut, resetPassword)
    │   ├── useUser.ts            # User hooks (profile, addFunds, withdraw)
    │   ├── useLottery.ts         # Lottery hooks (currentDraw, purchaseTicket, tickets)
    │   ├── useRooms.ts           # Rooms hooks (list, create, join, purchaseTicket)
    │   └── index.ts              # Export all hooks
    └── state/
        ├── lottery-store.ts      # Main lottery state
        ├── auth-store.ts         # Authentication state
        ├── draw-history-store.ts # Draw history state
        ├── app-stats-store.ts    # Global statistics
        ├── lobby-store.ts        # Lobby rooms state
        ├── analytics-store.ts    # Analytics state
        └── notification-prefs-store.ts # Notification prefs
```

---

## BACKEND API INTEGRATION

The app is **fully backend-ready** with a Cloud API layer that automatically switches between real API calls and mock data based on configuration.

### Configuration

Set `EXPO_PUBLIC_API_URL` environment variable to enable real API calls. When not set, the app uses mock data for development.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/sign-in` | POST | User authentication |
| `/auth/sign-up` | POST | User registration |
| `/auth/sign-out` | POST | End session |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/reset-password` | POST | Request password reset |
| `/user/profile` | GET | Get user profile |
| `/user/profile` | PATCH | Update profile |
| `/user/wallet/add-funds` | POST | Add funds to wallet |
| `/user/wallet/withdraw` | POST | Request withdrawal |
| `/user/transactions` | GET | Transaction history |
| `/lottery/current-draw` | GET | Current draw info |
| `/lottery/purchase-ticket` | POST | Purchase ticket |
| `/lottery/tickets` | GET | User's tickets |
| `/lottery/tickets/:id/verify` | GET | Verify ticket |
| `/rooms` | GET/POST | List/Create rooms |
| `/rooms/:id/join` | POST | Join room |
| `/rooms/:id/purchase-ticket` | POST | Buy room ticket |
| `/rooms/:id/start-draw` | POST | Start draw (host) |

### React Query Hooks

```tsx
// Auth
import { useSignIn, useSignUp, useSignOut, useResetPassword } from '@/lib/hooks';

// User
import { useUserProfile, useUpdateProfile, useAddFunds, useWithdraw } from '@/lib/hooks';

// Lottery
import { useCurrentDraw, usePurchaseTicket, useTickets, useVerifyTicket } from '@/lib/hooks';

// Rooms
import { useRoomsList, useCreateRoom, useJoinRoom, useRoomPurchaseTicket } from '@/lib/hooks';
```

### Features

- **Token Management**: Auto-refresh, secure storage
- **Retry Logic**: Exponential backoff for failed requests
- **Mock Data**: Realistic data when API not configured
- **Live Updates**: Auto-refetch for real-time data (current draw, stats)

---

## ROOT LAYOUT (`src/app/_layout.tsx`)

```tsx
import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAuthStore } from '@/lib/state/auth-store';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const loadAuth = useAuthStore(s => s.loadAuth);
  const isLoading = useAuthStore(s => s.isLoading);

  useEffect(() => {
    loadAuth().finally(() => {
      SplashScreen.hideAsync();
    });
  }, [loadAuth]);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A1628' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="purchase"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="ticket-details"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        {/* ... more screens with various presentations ... */}
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
```

---

## TAB LAYOUT (`src/app/(tabs)/_layout.tsx`)

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Ticket, User, Wallet, Users } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A1628',
          borderTopWidth: 1,
          borderTopColor: '#1E3A5F',
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#6B7C93',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'opacity-100' : 'opacity-70'}>
              <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="lobby"
        options={{
          title: 'Lobby',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'opacity-100' : 'opacity-70'}>
              <Users size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Tickets',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'opacity-100' : 'opacity-70'}>
              <Ticket size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="withdraw"
        options={{
          title: 'Withdraw',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'opacity-100' : 'opacity-70'}>
              <Wallet size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? 'opacity-100' : 'opacity-70'}>
              <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## HOME TAB (`src/app/(tabs)/index.tsx`)

### Key Components:
- Prize pool card with pulsing animation
- Countdown timer to next draw (00:00 UTC)
- Buy ticket button (changes state if ticket owned)
- Last winner display
- "How It Works" steps

### Key Features:
- Real-time stats from cloud sync
- Animated glow effect on prize pool
- Haptic feedback on interactions
- Authentication check before purchase

### Layout Pattern:
```tsx
<View className="flex-1 bg-[#0A1628]">
  <LinearGradient
    colors={['#0A1628', '#0F2847', '#0A1628']}
    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
  />
  <SafeAreaView className="flex-1" edges={['top']}>
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with welcome message and wallet balance */}
      {/* Prize Pool Card with animations */}
      {/* Countdown Timer */}
      {/* Buy Ticket Button */}
      {/* Last Winner Card */}
      {/* How It Works Steps */}
    </ScrollView>
  </SafeAreaView>
</View>
```

---

## LOBBY TAB (`src/app/(tabs)/lobby.tsx`)

### Key Components:
- Hero card explaining private draws
- Host Room / Join Room buttons
- Active rooms list with status badges
- Past rooms list
- "Why Play in Lobby?" features

### Status Colors:
```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'waiting': return '#6B7C93';
    case 'open': return '#22C55E';
    case 'locked': return '#FFA500';
    case 'drawn': return '#6B7C93';
  }
};
```

---

## TICKETS TAB (`src/app/(tabs)/tickets.tsx`)

### Key Components:
- Stats row (tickets this year, total won)
- Live draw stats card (clickable to draw-stats)
- Provably fair badge
- Active tickets list
- Draw history link
- Past tickets list

### TicketCard Component:
```tsx
const TicketCard = ({ ticket, onPress }) => {
  const getStatusConfig = () => {
    switch (ticket.status) {
      case 'active':
        return { icon: Clock, color: '#FFD700', label: 'Active' };
      case 'won':
        return { icon: Trophy, color: '#22C55E', label: 'Winner!' };
      case 'lost':
        return { icon: XCircle, color: '#6B7C93', label: 'Not Selected' };
    }
  };
  // ... render ticket card with status badge, position, odds
};
```

---

## WITHDRAW TAB (`src/app/(tabs)/withdraw.tsx`)

### Key Components:
- Balance card with pending withdrawals notice
- Amount input with preset buttons ($10, $25, $50, $100)
- Payment method selection
- Transaction history
- Withdraw button

### States:
- Unauthenticated view
- Transaction history view
- Success view
- Main withdraw form

---

## PROFILE TAB (`src/app/(tabs)/profile.tsx`)

### Key Components:
- Profile card with user stats
- Wallet balance with "Add Funds" button
- Account menu (Payment Methods, Notifications)
- Responsible Play menu (Self-Exclusion, Spending Limits)
- Support menu (Help Center, Terms)
- Sign Out button with confirmation modal

### MenuItem Component:
```tsx
const MenuItem = ({ icon: Icon, label, value, onPress, danger, iconColor }) => (
  <Pressable
    onPress={handlePress}
    className="flex-row items-center py-4 px-4 active:bg-white/5 rounded-xl"
  >
    <View
      className="w-10 h-10 rounded-xl items-center justify-center"
      style={{ backgroundColor: (iconColor ?? (danger ? '#EF4444' : '#FFD700')) + '20' }}
    >
      <Icon size={20} color={iconColor ?? (danger ? '#EF4444' : '#FFD700')} />
    </View>
    <Text className={`flex-1 ml-3 font-medium ${danger ? 'text-red-400' : 'text-white'}`}>
      {label}
    </Text>
    {value && <Text className="text-white/50 mr-2">{value}</Text>}
    <ChevronRight size={20} color={danger ? '#EF4444' : '#6B7C93'} />
  </Pressable>
);
```

---

## STATE MANAGEMENT

### Lottery Store (`lottery-store.ts`)
```tsx
interface LotteryState {
  userId: string | null;
  username: string;
  email: string | null;
  walletBalance: number;
  ticketsPurchasedThisYear: number;
  tickets: Ticket[];
  activeTicket: Ticket | null;
  currentPrizePool: number;
  activePlayers: number;
  drawTime: Date;
  currentDrawId: string | null;
  currentCommitmentHash: string | null;
  lastWinner: { username: string; amount: number; ticketId: string } | null;
}

interface Ticket {
  id: string;               // DDL-YYYYMMDD-XXXXX
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
```

### Auth Store (`auth-store.ts`)
```tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (email: string, password: string, username: string) => Promise<Result>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<Result>;
  updateUser: (updates: Partial<User>) => Promise<Result>;
  loadAuth: () => Promise<void>;
}

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isVerified: boolean;
}
```

### Lobby Store (`lobby-store.ts`)
```tsx
interface LobbyRoom {
  id: string;
  code: string;            // 6-character access code
  name: string;
  hostId: string;
  hostUsername: string;
  createdAt: string;
  status: 'waiting' | 'open' | 'locked' | 'drawn';
  participants: LobbyParticipant[];
  tickets: LobbyTicket[];
  prizePool: number;
  maxParticipants: number;
  winnerId?: string;
  winnerUsername?: string;
}
```

---

## UTILITY: cn.ts (className merge)
```tsx
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## PROVABLY FAIR SYSTEM (`crypto/provably-fair.ts`)

### Functions:
```tsx
generateRandomSeed(): string
generateCommitmentHash(seed: string): string
generateTicketHash(ticketId, drawId, timestamp, position): string
selectWinner(seed: string, totalTickets: number): number
verifyCommitment(seed: string, commitmentHash: string): boolean
verifyWinnerSelection(seed, totalTickets, winningPosition): boolean
calculateOdds(position: number, total: number): string  // "1 in X"
calculateOddsPercentage(total: number): string          // "X.XXXX%"
```

### How It Works:
1. Before ticket sales: Generate seed, publish hash(seed) as commitment
2. During sales: Players see commitment hash on receipts
3. At draw: Tickets freeze, seed revealed
4. Verification: Anyone can verify hash(seed) === commitment AND winner = seed mod total_entries

---

## REVENUECAT CLIENT (`revenuecatClient.ts`)

### Exported Functions:
```tsx
isRevenueCatEnabled(): boolean
getOfferings(): Promise<RevenueCatResult<PurchasesOfferings>>
purchasePackage(pkg: PurchasesPackage): Promise<RevenueCatResult<CustomerInfo>>
getCustomerInfo(): Promise<RevenueCatResult<CustomerInfo>>
restorePurchases(): Promise<RevenueCatResult<CustomerInfo>>
hasEntitlement(entitlementId: string): Promise<RevenueCatResult<boolean>>
hasActiveSubscription(): Promise<RevenueCatResult<boolean>>
getPackage(identifier: string): Promise<RevenueCatResult<PurchasesPackage | null>>
```

### Environment Variables:
```
EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY=  # Development
EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY=  # iOS production
EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY= # Android production
```

---

## COMMON UI PATTERNS

### Screen Container:
```tsx
<View className="flex-1 bg-[#0A1628]">
  <LinearGradient
    colors={['#0F2847', '#0A1628']}
    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
  />
  <SafeAreaView className="flex-1" edges={['top']}>
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Content */}
    </ScrollView>
  </SafeAreaView>
</View>
```

### Primary Button (Gold Gradient):
```tsx
<Pressable onPress={handlePress} className="active:opacity-80">
  <LinearGradient
    colors={['#FFD700', '#FFA500']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={{ borderRadius: 16 }}
  >
    <View className="py-4 items-center">
      <Text className="text-[#0A1628] text-lg font-bold">Button Text</Text>
    </View>
  </LinearGradient>
</Pressable>
```

### Card:
```tsx
<View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
  {/* Card content */}
</View>
```

### Section Header:
```tsx
<Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
  Section Title
</Text>
```

### Input Field:
```tsx
<View className="mb-4">
  <Text className="text-white/60 text-sm mb-2 ml-1">Label</Text>
  <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
    <Icon size={20} color="#6B7C93" />
    <TextInput
      value={value}
      onChangeText={setValue}
      placeholder="Placeholder"
      placeholderTextColor="#6B7C93"
      className="flex-1 py-4 px-3 text-white"
    />
  </View>
</View>
```

### Menu Item Row:
```tsx
<Pressable className="flex-row items-center py-4 px-4 active:bg-white/5 rounded-xl">
  <View className="w-10 h-10 rounded-xl bg-[#FFD700]/20 items-center justify-center">
    <Icon size={20} color="#FFD700" />
  </View>
  <Text className="flex-1 ml-3 font-medium text-white">Label</Text>
  <ChevronRight size={20} color="#6B7C93" />
</Pressable>
```

---

## ANIMATIONS

### Pulse Animation:
```tsx
const pulseAnim = useSharedValue(1);

useEffect(() => {
  pulseAnim.value = withRepeat(
    withSequence(
      withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    true
  );
}, []);

const pulseStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pulseAnim.value }],
}));
```

### Button Press Animation:
```tsx
const buttonScale = useSharedValue(1);

const handlePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  buttonScale.value = withSequence(
    withSpring(0.95),
    withSpring(1)
  );
};

const buttonStyle = useAnimatedStyle(() => ({
  transform: [{ scale: buttonScale.value }],
}));
```

### Fade In Animation:
```tsx
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

<Animated.View entering={FadeIn.delay(100)}>
  {/* Content */}
</Animated.View>

<Animated.View entering={FadeInDown.delay(200)}>
  {/* Content */}
</Animated.View>
```

---

## TAILWIND CONFIG (`tailwind.config.js`)

```js
module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    extend: {
      fontSize: {
        xs: "10px",
        sm: "12px",
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    // Custom space plugin that uses gap instead of margin
  ],
};
```

---

## ENVIRONMENT VARIABLES

```
# Cloud Sync
EXPO_PUBLIC_API_URL=              # Backend API URL
EXPO_PUBLIC_API_KEY=              # API authentication

# Email Service
EXPO_PUBLIC_EMAIL_API_URL=
EXPO_PUBLIC_EMAIL_API_KEY=

# RevenueCat Payments
EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY=
EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY=
EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY=
```

---

## NAVIGATION TABS

| Tab | Icon | Route | Description |
|-----|------|-------|-------------|
| Home | `Home` | `/(tabs)/index` | Prize pool, countdown, buy ticket |
| Lobby | `Users` | `/(tabs)/lobby` | Private rooms, host/join |
| My Tickets | `Ticket` | `/(tabs)/tickets` | Ticket list, draw history |
| Withdraw | `Wallet` | `/(tabs)/withdraw` | Withdraw funds |
| Profile | `User` | `/(tabs)/profile` | Settings, account |

---

## MODAL SCREENS

| Screen | Presentation | Animation | Description |
|--------|--------------|-----------|-------------|
| purchase | modal | slide_from_bottom | Buy ticket flow |
| ticket-details | modal | slide_from_bottom | Digital receipt |
| add-funds | modal | slide_from_bottom | Add wallet funds |
| draw-details | modal | slide_from_bottom | Draw verification |
| draw-stats | modal | slide_from_bottom | Live analytics |
| why-fair | modal | slide_from_bottom | Provably fair explanation |
| demo-win | fullScreenModal | fade | Demo win experience |
| create-room | modal | slide_from_bottom | Create lobby room |
| join-room | modal | slide_from_bottom | Join lobby room |
| lobby-how-to-play | modal | slide_from_bottom | Lobby tutorial |

---

## ICONS USED (lucide-react-native)

Home, Ticket, User, Wallet, Users, Trophy, Clock, Sparkles, ChevronRight, LogIn, X, Check, AlertTriangle, Shield, Lock, Copy, Hash, Calendar, Fingerprint, ExternalLink, HelpCircle, History, BarChart3, Zap, TrendingUp, XCircle, Crown, Plus, JoinIcon (LogIn), Play, Info, DollarSign, Building2, CreditCard, ArrowUpRight, ArrowDownLeft, Bell, FileText, LogOut, Settings, Mail, Eye, EyeOff, ArrowLeft, AlertCircle, Smartphone

---

## FEATURES SUMMARY

1. **Home**: View live prize pool, player count, countdown to midnight UTC draw
2. **Ticket Purchase**: Buy $1 ticket with pre-committed draw hash visible
3. **Digital Receipt**: Full verification details (ticket ID, position, odds, hashes)
4. **My Tickets**: View active/past tickets with win/loss status
5. **Draw Analytics**: Real-time statistics, pool ranking, entry patterns
6. **Draw Verification**: See cryptographic proof for completed draws
7. **Lobby**: Private rooms for friends, workplaces, events
8. **Wallet**: Add funds via RevenueCat IAP, track transactions
9. **Withdraw**: Request withdrawals with transaction history
10. **Authentication**: Sign in/up with email, password reset
11. **Profile**: Stats, payment methods, notifications
12. **Responsible Gaming**: Self-exclusion, spending limits

---

## PRODUCTION STATUS

### Completed:
- Payment processing via RevenueCat
- Full authentication flow
- Ticket purchase with provably fair verification
- Withdrawal request system
- Terms & Conditions
- Responsible gaming features
- Lobby system for private draws
- Cross-device sync infrastructure

### Before Production:
- Cloud sync backend API
- Email delivery service
- Push notifications
- Geo-verification
- ID verification/KYC
- Analytics tracking
- Error monitoring (Sentry)
- Gaming licenses
