import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  X,
  Trophy,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  BarChart3,
  Zap,
  Award,
  Calendar,
  Percent,
  RefreshCw,
  ChevronUp,
  Activity,
} from 'lucide-react-native';
import { useAnalyticsStore } from '@/lib/state/analytics-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useAppStatsStore } from '@/lib/state/app-stats-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mini bar chart component
const MiniBarChart = ({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) => {
  const maxVal = Math.max(...data);

  return (
    <View className="flex-row items-end justify-between" style={{ height }}>
      {data.map((val, i) => (
        <View
          key={i}
          className="rounded-t"
          style={{
            width: (SCREEN_WIDTH - 80) / data.length - 2,
            height: maxVal > 0 ? (val / maxVal) * height : 0,
            backgroundColor: color,
            opacity: 0.3 + (val / maxVal) * 0.7,
          }}
        />
      ))}
    </View>
  );
};

// Stat card component
const StatCard = ({
  icon: Icon,
  label,
  value,
  subValue,
  color = '#FFD700',
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
  trend?: 'up' | 'down';
}) => (
  <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
    <View className="flex-row items-center justify-between mb-2">
      <View className="flex-row items-center">
        <Icon size={16} color={color} />
        <Text className="text-white/60 text-xs ml-2">{label}</Text>
      </View>
      {trend && (
        <View className={`flex-row items-center ${trend === 'up' ? 'bg-[#22C55E]/20' : 'bg-red-500/20'} px-1.5 py-0.5 rounded`}>
          {trend === 'up' ? (
            <TrendingUp size={10} color="#22C55E" />
          ) : (
            <TrendingDown size={10} color="#EF4444" />
          )}
        </View>
      )}
    </View>
    <Text className="text-white text-xl font-bold" style={{ color }}>
      {value}
    </Text>
    {subValue && (
      <Text className="text-white/40 text-xs mt-1">{subValue}</Text>
    )}
  </View>
);

export default function DrawStatsScreen() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const analytics = useAnalyticsStore(s => s.analytics);
  const loadAnalytics = useAnalyticsStore(s => s.loadAnalytics);
  const refreshAnalytics = useAnalyticsStore(s => s.refreshAnalytics);
  const isLoading = useAnalyticsStore(s => s.isLoading);

  const currentPrizePool = useLotteryStore(s => s.currentPrizePool);
  const activePlayers = useLotteryStore(s => s.activePlayers);
  const activeTicket = useLotteryStore(s => s.activeTicket);
  const drawTime = useLotteryStore(s => s.drawTime);

  // Get real stats from global app stats
  const globalStats = useAppStatsStore(s => s.globalStats);
  const loadGlobalStats = useAppStatsStore(s => s.loadGlobalStats);
  const startRealtimeSync = useAppStatsStore(s => s.startRealtimeSync);
  const stopRealtimeSync = useAppStatsStore(s => s.stopRealtimeSync);

  // Use real data - prefer global stats over lottery store
  const realPlayers = globalStats.todayTotalTickets > 0 ? globalStats.todayTotalTickets : activePlayers;
  const realPool = globalStats.todayPrizePool > 0 ? globalStats.todayPrizePool : currentPrizePool;

  const pulseAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);

  useEffect(() => {
    loadGlobalStats();
    startRealtimeSync();

    return () => {
      stopRealtimeSync();
    };
  }, [loadGlobalStats, startRealtimeSync, stopRealtimeSync]);

  useEffect(() => {
    loadAnalytics(
      realPlayers,
      realPool,
      activeTicket?.position
    );
  }, [realPlayers, realPool, activeTicket]);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = drawTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [drawTime]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rotateAnim.value = withTiming(rotateAnim.value + 360, { duration: 500 });
    refreshAnalytics();
  };

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  if (!analytics) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const hourLabels = ['12a', '6a', '12p', '6p'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Pressable
            onPress={handleRefresh}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <Animated.View style={rotateStyle}>
              <RefreshCw size={20} color="#FFD700" />
            </Animated.View>
          </Pressable>
          <Text className="text-white text-lg font-semibold">Draw Analytics</Text>
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Live Prize Pool */}
          <View className="px-6 mt-6">
            <Animated.View style={pulseStyle}>
              <LinearGradient
                colors={['#1E3A5F', '#0F2847']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2E4A6F' }}
              >
                <View className="flex-row items-center justify-center mb-2">
                  <View className="w-2 h-2 rounded-full bg-[#22C55E] mr-2" />
                  <Text className="text-[#22C55E] text-xs font-medium">LIVE</Text>
                </View>

                <Text className="text-white text-5xl font-bold text-center">
                  ${analytics.prizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>

                <View className="flex-row items-center justify-center mt-3">
                  <Users size={14} color="#FFD700" />
                  <Text className="text-white/70 ml-2">
                    {analytics.totalEntries.toLocaleString()} entries
                  </Text>
                </View>

                {/* Countdown */}
                <View className="flex-row justify-center items-center mt-4 pt-4 border-t border-white/10">
                  <Clock size={14} color="#FFD700" />
                  <Text className="text-white/60 text-sm ml-2">Draw in </Text>
                  <Text className="text-[#FFD700] font-bold">
                    {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Pool Ranking */}
          <View className="px-6 mt-5">
            <View className="bg-[#FFD700]/10 rounded-2xl p-4 border border-[#FFD700]/30">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Award size={24} color="#FFD700" />
                  <View className="ml-3">
                    <Text className="text-[#FFD700] font-bold text-lg">
                      #{analytics.currentPoolRank} All-Time
                    </Text>
                    <Text className="text-white/60 text-xs">
                      Larger than {analytics.percentileRank}% of all draws
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <ChevronUp size={16} color="#22C55E" />
                    <Text className="text-[#22C55E] font-bold">
                      Top {100 - analytics.percentileRank}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Your Position (if has ticket) */}
          {analytics.userPosition && (
            <View className="px-6 mt-5">
              <View className="bg-[#22C55E]/10 rounded-2xl p-4 border border-[#22C55E]/30">
                <View className="flex-row items-center mb-3">
                  <Target size={20} color="#22C55E" />
                  <Text className="text-[#22C55E] font-semibold ml-2">Your Entry</Text>
                </View>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-white/50 text-xs">Position</Text>
                    <Text className="text-white text-2xl font-bold">
                      #{analytics.userPosition.toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-white/50 text-xs">Your Odds</Text>
                    <Text className="text-[#22C55E] text-2xl font-bold">
                      1:{analytics.totalEntries.toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white/50 text-xs">Percentage</Text>
                    <Text className="text-white text-2xl font-bold">
                      {analytics.userOddsPercentage}%
                    </Text>
                  </View>
                </View>
                <View className="mt-3 pt-3 border-t border-[#22C55E]/20">
                  <Text className="text-white/50 text-xs text-center">
                    Better odds than {analytics.betterOddsThan}% of historical draws
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Key Stats Grid */}
          <View className="px-6 mt-5">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Key Statistics
            </Text>
            <View className="flex-row flex-wrap justify-between">
              <View className="w-[48%] mb-3">
                <StatCard
                  icon={Trophy}
                  label="Largest Pool Ever"
                  value={`$${analytics.largestPoolEver.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
                  subValue={analytics.largestPoolDate}
                  color="#FFD700"
                />
              </View>
              <View className="w-[48%] mb-3">
                <StatCard
                  icon={BarChart3}
                  label="Average Pool"
                  value={`$${analytics.averagePoolSize.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
                  subValue="Per draw"
                  color="#3B82F6"
                />
              </View>
              <View className="w-[48%] mb-3">
                <StatCard
                  icon={Users}
                  label="Avg Entries/Draw"
                  value={analytics.averageEntriesPerDraw.toLocaleString()}
                  subValue="Historical average"
                  color="#8B5CF6"
                />
              </View>
              <View className="w-[48%] mb-3">
                <StatCard
                  icon={Calendar}
                  label="Total Draws"
                  value={analytics.totalDrawsAllTime.toLocaleString()}
                  subValue="All time"
                  color="#EC4899"
                />
              </View>
            </View>
          </View>

          {/* Entry Rate */}
          <View className="px-6 mt-3">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Entry Rate
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-white/50 text-xs">Last Hour</Text>
                  <View className="flex-row items-center">
                    <Zap size={14} color="#FFD700" />
                    <Text className="text-white text-lg font-bold ml-1">
                      +{analytics.entriesLastHour}
                    </Text>
                  </View>
                </View>
                <View className="items-center">
                  <Text className="text-white/50 text-xs">Last 24h</Text>
                  <Text className="text-white text-lg font-bold">
                    {analytics.entriesLast24Hours.toLocaleString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white/50 text-xs">Peak/Hour</Text>
                  <Text className="text-white text-lg font-bold">
                    {analytics.peakEntriesPerHour}
                  </Text>
                </View>
              </View>

              {/* Activity indicator */}
              <View className="flex-row items-center justify-center bg-[#22C55E]/10 rounded-lg p-2">
                <Activity size={14} color="#22C55E" />
                <Text className="text-[#22C55E] text-xs ml-2">
                  {analytics.entriesLastHour > 10 ? 'High activity' : 'Normal activity'}
                </Text>
              </View>
            </View>
          </View>

          {/* Hourly Distribution */}
          <View className="px-6 mt-5">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Entry Patterns (UTC)
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
              <Text className="text-white/70 text-sm mb-3">Hourly Distribution</Text>
              <MiniBarChart data={analytics.hourlyEntryDistribution} color="#FFD700" height={50} />
              <View className="flex-row justify-between mt-2">
                {hourLabels.map((label, i) => (
                  <Text key={i} className="text-white/40 text-xs">{label}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* Day of Week Distribution */}
          <View className="px-6 mt-4">
            <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
              <Text className="text-white/70 text-sm mb-3">Weekly Pattern</Text>
              <MiniBarChart data={analytics.dayOfWeekDistribution} color="#3B82F6" height={40} />
              <View className="flex-row justify-between mt-2">
                {dayLabels.map((label, i) => (
                  <Text key={i} className="text-white/40 text-xs">{label}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* Total Prizes Paid */}
          <View className="px-6 mt-5">
            <View className="bg-[#22C55E]/10 rounded-2xl p-5 border border-[#22C55E]/30">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Trophy size={24} color="#22C55E" />
                  <View className="ml-3">
                    <Text className="text-white/60 text-xs">Total Prizes Paid</Text>
                    <Text className="text-[#22C55E] text-2xl font-bold">
                      ${analytics.totalPrizesPaidAllTime.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-white/50 text-xs">All time</Text>
                  <Text className="text-white text-sm">
                    {analytics.totalDrawsAllTime} winners
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View className="px-6 mt-6">
            <Text className="text-white/30 text-xs text-center">
              Analytics update in real-time.{'\n'}
              Historical data based on {analytics.totalDrawsAllTime} draws.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Simple loading indicator
const ActivityIndicator = () => {
  const spinAnim = useSharedValue(0);

  useEffect(() => {
    spinAnim.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinAnim.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        spinStyle,
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: '#FFD700',
          borderTopColor: 'transparent',
        },
      ]}
    />
  );
};
