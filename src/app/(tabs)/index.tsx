import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Clock, Users, Trophy, Sparkles, ChevronRight, LogIn } from 'lucide-react-native';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { useCurrentDraw, useLastWinner, useTickets, useWalletBalance } from '@/lib/hooks';
import { connectSocket, disconnectSocket, joinDrawRoom, leaveDrawRoom, onDrawUpdate } from '@/lib/websocket/socketClient';
import { getStoredTokens } from '@/lib/api/client';
import { isApiConfigured } from '@/lib/api';

import { CurrentDrawResponse } from '@/lib/api';

type LastWinnerData = { username: string; amount: number; ticketId: string } | null;

export default function HomeScreen() {
  const router = useRouter();

  // Get live data from API hooks
  const { data: currentDrawData } = useCurrentDraw();
  const { data: lastWinnerData } = useLastWinner();
  const { data: ticketsData } = useTickets();
  const { data: walletData } = useWalletBalance();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // WebSocket: connect and subscribe to draw updates when authenticated
  useEffect(() => {
    if (!isApiConfigured() || !currentDrawData?.drawId) return;
    let unsub: (() => void) | null = null;
    const setup = async () => {
      const tokens = await getStoredTokens();
      if (!tokens?.accessToken) return;
      connectSocket(tokens.accessToken);
      joinDrawRoom(currentDrawData!.drawId);
      unsub = onDrawUpdate((data) => {
        useLotteryStore.setState({
          currentPrizePool: data.prizePool,
          activePlayers: data.totalEntries,
        });
        queryClient.invalidateQueries({ queryKey: ['lottery', 'currentDraw'] });
      });
    };
    if (isAuthenticated) setup();
    return () => {
      unsub?.();
      if (currentDrawData?.drawId) leaveDrawRoom(currentDrawData.drawId);
      disconnectSocket();
    };
  }, [isApiConfigured(), isAuthenticated, currentDrawData?.drawId, queryClient]);

  // Get local state from lottery store - use primitive values
  const prizePool = useLotteryStore(s => s.currentPrizePool);
  const activePlayers = useLotteryStore(s => s.activePlayers);
  const drawTimeRef = useLotteryStore(s => s.drawTime.getTime()); // Store timestamp, not Date
  const activeTicket = useLotteryStore(s => s.activeTicket);
  const lastWinner = useLotteryStore(s => s.lastWinner);
  const walletBalance = useLotteryStore(s => s.walletBalance);

  const username = useAuthStore(s => s.user?.username);
  const userId = useAuthStore(s => s.user?.id);

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Use API data with fallbacks to local store
  const displayPool = currentDrawData?.prizePool ?? prizePool;
  const displayPlayers = currentDrawData?.totalEntries ?? activePlayers;
  const displayLastWinner = lastWinnerData ?? lastWinner;

  // Animations
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Memoize draw time to prevent re-renders
  const actualDrawTime = React.useMemo(() => {
    if (currentDrawData?.drawTime) {
      return new Date(currentDrawData.drawTime);
    }
    return new Date(drawTimeRef);
  }, [currentDrawData?.drawTime, drawTimeRef]);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const prizeCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }), []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }), []);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }), []);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = actualDrawTime.getTime() - now.getTime();

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
  }, [actualDrawTime]);

  const handleBuyTicket = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    if (hasTicketToday) {
      router.push('/ticket-details');
    } else {
      router.push('/purchase');
    }
  }, [activeTicket, router, isAuthenticated]);

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sign-in');
  };

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  // Has ticket for today: from API tickets or local store
  const hasTicketToday = React.useMemo(() => {
    if (activeTicket) return true;
    if (ticketsData && currentDrawData?.drawId) {
      return ticketsData.some((t: { drawId: string }) => String(t.drawId) === String(currentDrawData.drawId));
    }
    return false;
  }, [activeTicket, ticketsData, currentDrawData?.drawId]);

  return (
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
          {/* Header */}
          <View className="px-6 pt-4 pb-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white/60 text-sm">
                  {isAuthenticated ? `Welcome, ${username}` : 'Welcome to'}
                </Text>
                <Text className="text-white text-2xl font-bold">Daily Dollar Lotto</Text>
              </View>
              {isAuthenticated ? (
                <View className="bg-[#1E3A5F] px-4 py-2 rounded-full">
                  <Text className="text-[#FFD700] font-semibold">
                    ${(walletData?.balance ?? walletBalance).toFixed(2)}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleSignIn}
                  className="bg-[#FFD700] px-4 py-2 rounded-full flex-row items-center active:opacity-80"
                >
                  <LogIn size={16} color="#0A1628" />
                  <Text className="text-[#0A1628] font-semibold ml-2">Sign In</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Prize Pool Card */}
          <View className="px-6 mt-6">
            <Animated.View style={prizeCardStyle}>
              <View className="relative overflow-hidden rounded-3xl">
                {/* Glow effect */}
                <Animated.View
                  style={[glowStyle, {
                    position: 'absolute',
                    top: -50,
                    left: -50,
                    right: -50,
                    bottom: -50,
                    backgroundColor: '#FFD700',
                    borderRadius: 24,
                  }]}
                />
                <LinearGradient
                  colors={['#1E3A5F', '#0F2847']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#2E4A6F' }}
                >
                  <View className="items-center">
                    <View className="flex-row items-center mb-2">
                      <Trophy size={20} color="#FFD700" />
                      <Text className="text-[#FFD700] text-sm font-semibold ml-2 uppercase tracking-wide">
                        Today's Prize Pool
                      </Text>
                    </View>

                    <Text className="text-white text-6xl font-bold tracking-tight">
                      ${displayPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>

                    <View className="flex-row items-center mt-4 bg-[#0A1628]/50 px-4 py-2 rounded-full">
                      <Users size={16} color="#6B7C93" />
                      <Text className="text-white/70 ml-2">
                        {displayPlayers > 0
                          ? `${displayPlayers.toLocaleString()} ${displayPlayers === 1 ? 'player' : 'players'} in today's draw`
                          : 'Be the first to enter today!'
                        }
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          </View>

          {/* Countdown Timer */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/50 rounded-2xl p-5 border border-[#2E4A6F]">
              <View className="flex-row items-center justify-center mb-4">
                <Clock size={18} color="#FFD700" />
                <Text className="text-white/70 ml-2 text-sm font-medium">Draw closes in</Text>
              </View>

              <View className="flex-row justify-center items-center">
                <View className="items-center mx-2">
                  <View className="bg-[#0A1628] rounded-xl px-4 py-3 min-w-[70px]">
                    <Text className="text-white text-3xl font-bold text-center">
                      {formatTime(timeLeft.hours)}
                    </Text>
                  </View>
                  <Text className="text-white/50 text-xs mt-2">HOURS</Text>
                </View>

                <Text className="text-[#FFD700] text-3xl font-bold">:</Text>

                <View className="items-center mx-2">
                  <View className="bg-[#0A1628] rounded-xl px-4 py-3 min-w-[70px]">
                    <Text className="text-white text-3xl font-bold text-center">
                      {formatTime(timeLeft.minutes)}
                    </Text>
                  </View>
                  <Text className="text-white/50 text-xs mt-2">MINUTES</Text>
                </View>

                <Text className="text-[#FFD700] text-3xl font-bold">:</Text>

                <View className="items-center mx-2">
                  <View className="bg-[#0A1628] rounded-xl px-4 py-3 min-w-[70px]">
                    <Text className="text-white text-3xl font-bold text-center">
                      {formatTime(timeLeft.seconds)}
                    </Text>
                  </View>
                  <Text className="text-white/50 text-xs mt-2">SECONDS</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Buy Ticket Button */}
          <View className="px-6 mt-6">
            <Animated.View style={buttonAnimStyle}>
              <Pressable
                onPress={handleBuyTicket}
                className="active:opacity-90"
              >
                <LinearGradient
                  colors={hasTicketToday && isAuthenticated ? ['#2E4A6F', '#1E3A5F'] : ['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16, padding: 1 }}
                >
                  <View className={`rounded-2xl py-5 flex-row items-center justify-center ${hasTicketToday && isAuthenticated ? 'bg-transparent' : ''}`}>
                    <Sparkles size={24} color={hasTicketToday && isAuthenticated ? '#FFD700' : '#0A1628'} />
                    <Text className={`text-lg font-bold ml-3 ${hasTicketToday && isAuthenticated ? 'text-[#FFD700]' : 'text-[#0A1628]'}`}>
                      {!isAuthenticated
                        ? 'Sign In to Play'
                        : hasTicketToday
                          ? 'View Your Ticket'
                          : 'Buy Ticket - $1.00'}
                    </Text>
                    <ChevronRight size={20} color={hasTicketToday && isAuthenticated ? '#FFD700' : '#0A1628'} className="ml-2" />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {isAuthenticated && !hasTicketToday && (
              <Text className="text-white/40 text-center text-xs mt-3">
                Max 1 ticket per day • 365 tickets per year
              </Text>
            )}

            {!isAuthenticated && (
              <Text className="text-white/40 text-center text-xs mt-3">
                Create an account to start playing
              </Text>
            )}
          </View>

          {/* Last Winner */}
          {displayLastWinner && (
            <View className="px-6 mt-8">
              <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                Last Draw Winner
              </Text>
              <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-[#FFD700]/20 items-center justify-center">
                      <Trophy size={24} color="#FFD700" />
                    </View>
                    <View className="ml-3">
                      <Text className="text-white font-semibold">{displayLastWinner.username}</Text>
                      <Text className="text-white/50 text-sm">{displayLastWinner.ticketId}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-[#FFD700] font-bold text-xl">
                      ${displayLastWinner.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text className="text-white/40 text-xs">Prize Won</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* No Winner Yet Message */}
          {!displayLastWinner && (
            <View className="px-6 mt-8">
              <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-[#FFD700]/20 items-center justify-center">
                    <Trophy size={24} color="#FFD700" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-semibold">First Draw Coming Soon!</Text>
                    <Text className="text-white/50 text-sm">Be part of history - enter today's draw</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* How It Works */}
          <View className="px-6 mt-8">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              How It Works
            </Text>
            <View className="space-y-3">
              {[
                { num: '1', text: 'Buy one $1 ticket per day' },
                { num: '2', text: 'Wait for the daily draw at midnight UTC' },
                { num: '3', text: 'One lucky winner takes the pot!' },
              ].map((step, index) => (
                <View
                  key={index}
                  className="flex-row items-center bg-[#1E3A5F]/20 rounded-xl p-4 mb-3"
                >
                  <View className="w-8 h-8 rounded-full bg-[#FFD700]/20 items-center justify-center mr-3">
                    <Text className="text-[#FFD700] font-bold">{step.num}</Text>
                  </View>
                  <Text className="text-white/80 flex-1">{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
