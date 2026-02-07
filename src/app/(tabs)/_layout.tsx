import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Ticket, User, Wallet, Users } from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useTickets, useWalletBalance } from '@/lib/hooks';
import { isApiConfigured } from '@/lib/api';

/**
 * Syncs backend ticket and wallet data to the lottery store when API is configured.
 * Ensures Profile, My Tickets, and other screens show correct wins and prize amounts.
 */
function LotteryApiSync() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data: ticketsData } = useTickets();
  const { data: walletData } = useWalletBalance();

  useEffect(() => {
    if (!isApiConfigured() || !isAuthenticated) return;

    const updates: Partial<{ tickets: typeof ticketsData; walletBalance: number; ticketsPurchasedThisYear: number }> = {};

    if (ticketsData !== undefined) {
      const tickets = Array.isArray(ticketsData) ? ticketsData : [];
      const thisYear = new Date().getFullYear();
      updates.tickets = tickets;
      updates.ticketsPurchasedThisYear = tickets.filter(
        t => new Date(t.drawDate).getFullYear() === thisYear
      ).length;
    }

    if (walletData !== undefined && typeof walletData.balance === 'number') {
      updates.walletBalance = walletData.balance;
    }

    if (Object.keys(updates).length > 0) {
      useLotteryStore.setState(updates as any);
    }
  }, [isAuthenticated, ticketsData, walletData]);

  return null;
}

export default function TabLayout() {
  return (
    <>
      <LotteryApiSync />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A1628',
          borderTopWidth: 1,
          borderTopColor: '#1E3A5F',
          height: 85,
          paddingTop: 8,
          paddingBottom: 12,
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
    </>
  );
}
