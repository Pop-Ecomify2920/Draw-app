import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Ticket,
  Trophy,
  XCircle,
  Clock,
  ChevronRight,
  Sparkles,
  LogIn,
  History,
  Shield,
  Users,
  TrendingUp,
  BarChart3,
  Zap,
} from 'lucide-react-native';
import { useLotteryStore, Ticket as TicketType } from '@/lib/state/lottery-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { useDrawHistoryStore } from '@/lib/state/draw-history-store';
import { useAnalyticsStore } from '@/lib/state/analytics-store';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { calculateOdds } from '@/lib/crypto/provably-fair';

const TicketCard = ({ ticket, onPress }: { ticket: TicketType; onPress: () => void }) => {
  const getStatusConfig = () => {
    switch (ticket.status) {
      case 'active':
        return {
          icon: Clock,
          color: '#FFD700',
          bgColor: 'bg-[#FFD700]/10',
          borderColor: '#FFD700',
          label: 'Active',
        };
      case 'won':
        return {
          icon: Trophy,
          color: '#22C55E',
          bgColor: 'bg-[#22C55E]/10',
          borderColor: '#22C55E',
          label: 'Winner!',
        };
      case 'lost':
        return {
          icon: XCircle,
          color: '#6B7C93',
          bgColor: 'bg-[#6B7C93]/10',
          borderColor: '#6B7C93',
          label: 'Not Selected',
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  const totalEntries = ticket.finalTotalEntries ?? ticket.totalEntriesAtPurchase ?? 1;
  const ticketPosition = ticket.position ?? 1;

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-80">
      <View
        className="bg-[#1E3A5F]/30 rounded-2xl p-4 border"
        style={{ borderColor: config.borderColor + '40' }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center flex-1">
            <View
              className={`w-12 h-12 rounded-xl ${config.bgColor} items-center justify-center`}
            >
              <StatusIcon size={24} color={config.color} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-white font-bold text-base">{ticket.id}</Text>
              <Text className="text-white/50 text-sm mt-0.5">
                {format(new Date(ticket.drawDate), 'MMMM d, yyyy')}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: config.color + '20' }}
            >
              <Text style={{ color: config.color }} className="font-semibold text-sm">
                {config.label}
              </Text>
            </View>
            {ticket.status === 'won' && ticket.prizeAmount && (
              <Text className="text-[#22C55E] font-bold text-lg mt-2">
                +${ticket.prizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            )}
          </View>
        </View>

        {/* Entry position and odds */}
        <View className="mt-3 pt-3 border-t border-white/10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Users size={14} color="#6B7C93" />
              <Text className="text-white/50 text-xs ml-2">
                Position #{ticketPosition.toLocaleString()} of {totalEntries.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white/50 text-xs mr-2">
                {calculateOdds(ticketPosition, totalEntries)}
              </Text>
              <ChevronRight size={16} color={config.color} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default function TicketsScreen() {
  const router = useRouter();
  const tickets = useLotteryStore(s => s.tickets);
  const ticketsPurchasedThisYear = useLotteryStore(s => s.ticketsPurchasedThisYear);
  const currentPrizePool = useLotteryStore(s => s.currentPrizePool);
  const activePlayers = useLotteryStore(s => s.activePlayers);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const loadDraws = useDrawHistoryStore(s => s.loadDraws);
  const getPastDraws = useDrawHistoryStore(s => s.getPastDraws);

  const analytics = useAnalyticsStore(s => s.analytics);
  const loadAnalytics = useAnalyticsStore(s => s.loadAnalytics);

  useEffect(() => {
    loadDraws();
  }, []);

  // Load analytics when pool data changes
  useEffect(() => {
    const activeTicket = tickets.find(t => t.status === 'active');
    loadAnalytics(activePlayers, currentPrizePool, activeTicket?.position);
  }, [activePlayers, currentPrizePool, tickets]);

  const pastDraws = getPastDraws();
  const activeTickets = tickets.filter(t => t.status === 'active');
  const pastTickets = tickets.filter(t => t.status !== 'active');
  const wonTickets = tickets.filter(t => t.status === 'won');
  const totalWinnings = wonTickets.reduce((sum, t) => sum + (t.prizeAmount ?? 0), 0);

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sign-in');
  };

  const handleBuyTicket = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!isAuthenticated) {
      router.push('/sign-in');
    } else {
      router.push('/purchase');
    }
  };

  const handleTicketPress = (ticketId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/ticket-details?ticketId=${ticketId}`);
  };

  const handleDrawHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/draw-history');
  };

  const handleDrawStats = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/draw-stats');
  };

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0A1628', '#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        />

        <SafeAreaView className="flex-1" edges={['top']}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="px-6 pt-4 pb-2">
              <Text className="text-white text-2xl font-bold">My Tickets</Text>
              <Text className="text-white/60 text-sm mt-1">
                Track your entries and wins
              </Text>
            </View>

            {/* Sign In Prompt */}
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-24 h-24 rounded-full bg-[#FFD700]/20 items-center justify-center mb-6">
                <Ticket size={48} color="#FFD700" />
              </View>
              <Text className="text-white text-2xl font-bold text-center">
                Sign in to view your tickets
              </Text>
              <Text className="text-white/60 text-center mt-3 px-8">
                Create an account to start playing and track all your lottery entries.
              </Text>

              <Pressable
                onPress={handleSignIn}
                className="mt-8 active:opacity-80"
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="px-8 py-4 flex-row items-center">
                    <LogIn size={20} color="#0A1628" />
                    <Text className="text-[#0A1628] font-bold text-lg ml-2">Sign In</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Draw History Link */}
            <View className="px-6 mt-auto">
              <Pressable
                onPress={handleDrawHistory}
                className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50 flex-row items-center justify-between active:bg-[#1E3A5F]/50"
              >
                <View className="flex-row items-center">
                  <History size={20} color="#FFD700" />
                  <View className="ml-3">
                    <Text className="text-white font-medium">Draw History</Text>
                    <Text className="text-white/50 text-xs">
                      View past draws & verification
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#6B7C93" />
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Empty state for authenticated users
  if (tickets.length === 0) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0A1628', '#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        />

        <SafeAreaView className="flex-1" edges={['top']}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="px-6 pt-4 pb-2">
              <Text className="text-white text-2xl font-bold">My Tickets</Text>
              <Text className="text-white/60 text-sm mt-1">
                Track your entries and wins
              </Text>
            </View>

            {/* Empty State */}
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-24 h-24 rounded-full bg-[#FFD700]/20 items-center justify-center mb-6">
                <Ticket size={48} color="#FFD700" />
              </View>
              <Text className="text-white text-2xl font-bold text-center">
                No tickets yet
              </Text>
              <Text className="text-white/60 text-center mt-3 px-8">
                Buy your first ticket to enter today's draw and get a chance to win the prize pool!
              </Text>

              <Pressable
                onPress={handleBuyTicket}
                className="mt-8 active:opacity-80"
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="px-8 py-4 flex-row items-center">
                    <Sparkles size={20} color="#0A1628" />
                    <Text className="text-[#0A1628] font-bold text-lg ml-2">Buy Ticket - $1</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Draw History Link */}
            <View className="px-6 mt-auto">
              <Pressable
                onPress={handleDrawHistory}
                className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50 flex-row items-center justify-between active:bg-[#1E3A5F]/50"
              >
                <View className="flex-row items-center">
                  <History size={20} color="#FFD700" />
                  <View className="ml-3">
                    <Text className="text-white font-medium">Draw History</Text>
                    <Text className="text-white/50 text-xs">
                      {pastDraws.length} past draws available
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#6B7C93" />
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Normal view with tickets
  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0A1628', '#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-2">
            <Text className="text-white text-2xl font-bold">My Tickets</Text>
            <Text className="text-white/60 text-sm mt-1">
              Track your entries and wins
            </Text>
          </View>

          {/* Stats Row */}
          <View className="px-6 mt-4">
            <View className="flex-row">
              <View className="flex-1 bg-[#1E3A5F]/40 rounded-2xl p-4 mr-2 border border-[#2E4A6F]/50">
                <View className="flex-row items-center">
                  <Ticket size={18} color="#FFD700" />
                  <Text className="text-white/60 text-sm ml-2">This Year</Text>
                </View>
                <Text className="text-white text-2xl font-bold mt-2">
                  {ticketsPurchasedThisYear}
                  <Text className="text-white/40 text-lg">/365</Text>
                </Text>
              </View>

              <View className="flex-1 bg-[#1E3A5F]/40 rounded-2xl p-4 ml-2 border border-[#2E4A6F]/50">
                <View className="flex-row items-center">
                  <Trophy size={18} color="#22C55E" />
                  <Text className="text-white/60 text-sm ml-2">Total Won</Text>
                </View>
                <Text className="text-[#22C55E] text-2xl font-bold mt-2">
                  ${totalWinnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Live Draw Stats Card - Clickable */}
          <Pressable onPress={handleDrawStats} className="px-6 mt-4 active:opacity-80">
            <LinearGradient
              colors={['#1E3A5F', '#0F2847']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, borderWidth: 1, borderColor: '#FFD700' + '40' }}
            >
              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-[#FFD700]/20 items-center justify-center">
                      <BarChart3 size={20} color="#FFD700" />
                    </View>
                    <View className="ml-3">
                      <Text className="text-white font-bold text-base">Today's Draw</Text>
                      <View className="flex-row items-center mt-0.5">
                        <Zap size={12} color="#22C55E" />
                        <Text className="text-[#22C55E] text-xs ml-1">Live</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#FFD700" />
                </View>

                {/* Quick Stats */}
                <View className="flex-row mt-4 pt-3 border-t border-white/10">
                  <View className="flex-1">
                    <Text className="text-white/50 text-xs">Prize Pool</Text>
                    <Text className="text-[#FFD700] font-bold text-lg">
                      ${currentPrizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/50 text-xs">Entries</Text>
                    <Text className="text-white font-bold text-lg">
                      {activePlayers.toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-1 items-end">
                    <Text className="text-white/50 text-xs">Pool Rank</Text>
                    {analytics ? (
                      <View className="flex-row items-center">
                        <TrendingUp size={14} color="#22C55E" />
                        <Text className="text-white font-bold text-lg ml-1">
                          #{analytics.currentPoolRank}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-white/40 text-lg">--</Text>
                    )}
                  </View>
                </View>

                {/* User Odds if they have a ticket */}
                {activeTickets.length > 0 && analytics?.userOddsPercentage && (
                  <View className="mt-3 pt-3 border-t border-white/10">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white/60 text-sm">Your Odds</Text>
                      <Text className="text-[#FFD700] font-bold">
                        {analytics.userOddsPercentage}%
                      </Text>
                    </View>
                    <View className="h-1.5 bg-[#0A1628] rounded-full mt-2 overflow-hidden">
                      <View
                        className="h-full bg-[#FFD700] rounded-full"
                        style={{ width: `${Math.min(100, parseFloat(analytics.userOddsPercentage) * 1000)}%` }}
                      />
                    </View>
                  </View>
                )}

                <Text className="text-white/40 text-xs text-center mt-3">
                  Tap for detailed analytics & graphs
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Provably Fair Badge */}
          <View className="px-6 mt-4">
            <View className="bg-[#22C55E]/10 rounded-xl p-3 border border-[#22C55E]/30 flex-row items-center">
              <Shield size={16} color="#22C55E" />
              <Text className="text-[#22C55E] text-xs ml-2 flex-1">
                All tickets are cryptographically secured & verifiable
              </Text>
            </View>
          </View>

          {/* Active Tickets */}
          {activeTickets.length > 0 && (
            <View className="px-6 mt-6">
              <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                Active Tickets
              </Text>
              {activeTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onPress={() => handleTicketPress(ticket.id)}
                />
              ))}
            </View>
          )}

          {/* Draw History Link */}
          <View className="px-6 mt-6">
            <Pressable
              onPress={handleDrawHistory}
              className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50 flex-row items-center justify-between active:bg-[#1E3A5F]/50"
            >
              <View className="flex-row items-center">
                <History size={20} color="#FFD700" />
                <View className="ml-3">
                  <Text className="text-white font-medium">Draw History</Text>
                  <Text className="text-white/50 text-xs">
                    {pastDraws.length} past draws with full verification
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#6B7C93" />
            </Pressable>
          </View>

          {/* Past Tickets */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Past Tickets
            </Text>
            {pastTickets.length > 0 ? (
              pastTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onPress={() => handleTicketPress(ticket.id)}
                />
              ))
            ) : (
              <View className="bg-[#1E3A5F]/20 rounded-2xl p-6 items-center">
                <Ticket size={40} color="#6B7C93" />
                <Text className="text-white/50 mt-3 text-center">
                  No past tickets yet
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
