import React, { useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
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
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import {
  Users,
  Plus,
  LogIn as JoinIcon,
  Crown,
  Trophy,
  Play,
  Info,
  ChevronRight,
  Ticket,
  DollarSign,
  Sparkles,
} from 'lucide-react-native';
import { useRoomsList } from '@/lib/hooks';
import { useLobbyStore } from '@/lib/state/lobby-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useWalletBalance } from '@/lib/hooks';
import { isApiConfigured } from '@/lib/api';

export default function LobbyScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const { data: walletData } = useWalletBalance();
  const walletBalance = useLotteryStore(s => s.walletBalance);

  const { data: apiRooms, refetch: refetchRooms } = useRoomsList();
  const hostedRooms = useLobbyStore(s => s.hostedRooms);
  const joinedRooms = useLobbyStore(s => s.joinedRooms);
  const loadFromStorage = useLobbyStore(s => s.loadFromStorage);
  const setCurrentRoom = useLobbyStore(s => s.setCurrentRoom);

  const [refreshing, setRefreshing] = React.useState(false);

  const displayRooms = React.useMemo(() => {
    if (isApiConfigured() && apiRooms && Array.isArray(apiRooms)) {
      return apiRooms.map((r: any) => ({
        id: r.id,
        code: r.code || '------',
        name: r.name,
        hostId: r.creator_id,
        hostUsername: r.host_username || 'Host',
        participants: Array(r.member_count || 0).fill({}),
        tickets: [],
        prizePool: parseFloat(r.prize_pool || 0),
        status: r.status || 'open',
        maxParticipants: r.max_participants || 10,
      }));
    }
    return [...hostedRooms, ...joinedRooms];
  }, [isApiConfigured(), apiRooms, hostedRooms, joinedRooms]);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const hostButtonScale = useSharedValue(1);
  const joinButtonScale = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadFromStorage(user.id);
    }
  }, [user?.id, loadFromStorage]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const hostButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hostButtonScale.value }],
  }));

  const joinButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: joinButtonScale.value }],
  }));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isApiConfigured()) {
      await refetchRooms();
    } else if (user?.id) {
      await loadFromStorage(user.id);
    }
    setRefreshing(false);
  }, [user?.id, loadFromStorage, isApiConfigured, refetchRooms]);

  const handleHostRoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    hostButtonScale.value = withSequence(withSpring(0.95), withSpring(1));

    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    router.push('/create-room');
  };

  const handleJoinRoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    joinButtonScale.value = withSequence(withSpring(0.95), withSpring(1));

    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    router.push('/join-room');
  };

  const handleHowToPlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/lobby-how-to-play');
  };

  const handleRoomPress = (roomId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const room = displayRooms.find((r: any) => r.id === roomId);
    if (room) {
      setCurrentRoom(room);
      router.push(`/room/${roomId}`);
    }
  };

  const activeRooms = displayRooms.filter(
    r => r.status !== 'drawn'
  );
  const pastRooms = displayRooms.filter(
    r => r.status === 'drawn'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return '#6B7C93';
      case 'open':
        return '#22C55E';
      case 'locked':
        return '#FFA500';
      case 'drawn':
        return '#6B7C93';
      default:
        return '#6B7C93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'open':
        return 'Open';
      case 'locked':
        return 'Drawing...';
      case 'drawn':
        return 'Complete';
      default:
        return status;
    }
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
            // refreshControl={
              // <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
            // }
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white/60 text-sm">Private Draws</Text>
                <Text className="text-white text-2xl font-bold">Lobby</Text>
              </View>
              {isAuthenticated && (
                <View className="bg-[#1E3A5F] px-4 py-2 rounded-full">
                  <Text className="text-[#FFD700] font-semibold">
                    ${(walletData?.balance ?? walletBalance).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Hero Section */}
          <View className="px-6 mt-4">
            <Animated.View style={pulseStyle}>
              <LinearGradient
                colors={['#1E3A5F', '#0F2847']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 24,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#2E4A6F',
                }}
              >
                <View className="items-center">
                  <View className="w-16 h-16 rounded-full bg-[#FFD700]/20 items-center justify-center mb-4">
                    <Users size={32} color="#FFD700" />
                  </View>
                  <Text className="text-white text-xl font-bold text-center mb-2">
                    Host Your Own Draw
                  </Text>
                  <Text className="text-white/60 text-center text-sm leading-5">
                    Create private rooms for friends, workplaces, or events.{'\n'}
                    Better odds, bigger connections!
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Action Buttons */}
          <View className="px-6 mt-6 flex-row space-x-4">
            <Animated.View style={[hostButtonStyle, { flex: 1 }]}>
              <Pressable onPress={handleHostRoom} className="active:opacity-90">
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-4 items-center">
                    <Crown size={24} color="#0A1628" />
                    <Text className="text-[#0A1628] font-bold mt-2">Host Room</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View style={[joinButtonStyle, { flex: 1, marginLeft: 16 }]}>
              <Pressable onPress={handleJoinRoom} className="active:opacity-90">
                <View className="bg-[#1E3A5F] rounded-2xl py-4 items-center border border-[#2E4A6F]">
                  <JoinIcon size={24} color="#FFD700" />
                  <Text className="text-[#FFD700] font-bold mt-2">Join Room</Text>
                </View>
              </Pressable>
            </Animated.View>
          </View>

          {/* How It Works */}
          <Pressable onPress={handleHowToPlay} className="px-6 mt-6 active:opacity-80">
            <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 flex-row items-center border border-[#2E4A6F]/50">
              <View className="w-10 h-10 rounded-full bg-[#FFD700]/10 items-center justify-center">
                <Info size={20} color="#FFD700" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-white font-semibold">How Lobby Works</Text>
                <Text className="text-white/50 text-sm">Learn about private draws</Text>
              </View>
              <ChevronRight size={20} color="#6B7C93" />
            </View>
          </Pressable>

          {/* Active Rooms */}
          {activeRooms.length > 0 && (
            <View className="mt-8">
              <View className="px-6 flex-row items-center justify-between mb-3">
                <Text className="text-white/60 text-sm font-medium uppercase tracking-wide">
                  Active Rooms
                </Text>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-[#22C55E] mr-2" />
                  <Text className="text-[#22C55E] text-xs font-medium">
                    {activeRooms.length} room{activeRooms.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {activeRooms.map((room: any, index: number) => (
                <Animated.View
                  key={room.id}
                  entering={FadeInDown.delay(index * 100).duration(400)}
                >
                  <Pressable
                    onPress={() => handleRoomPress(room.id)}
                    className="mx-6 mb-3 active:opacity-80"
                  >
                    <View className="bg-[#1E3A5F]/50 rounded-2xl p-4 border border-[#2E4A6F]/50">
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center flex-1">
                          {room.hostId === user?.id && (
                            <View className="bg-[#FFD700]/20 px-2 py-1 rounded-full mr-2">
                              <Crown size={12} color="#FFD700" />
                            </View>
                          )}
                          <Text className="text-white font-semibold flex-1" numberOfLines={1}>
                            {room.name}
                          </Text>
                        </View>
                        <View
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: `${getStatusColor(room.status)}20` }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: getStatusColor(room.status) }}
                          >
                            {getStatusText(room.status)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Users size={14} color="#6B7C93" />
                          <Text className="text-white/60 text-sm ml-1">
                            {(room.participants?.length ?? room.member_count ?? 0)} player{(room.participants?.length ?? room.member_count ?? 0) !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <DollarSign size={14} color="#FFD700" />
                          <Text className="text-[#FFD700] font-semibold">
                            {(typeof room.prizePool === 'number' ? room.prizePool : parseFloat(room.prizePool) || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 pt-3 border-t border-[#2E4A6F]/30 flex-row items-center justify-between">
                        <Text className="text-white/40 text-xs">
                          Code: <Text className="text-white/60 font-mono">{room.code}</Text>
                        </Text>
                        <ChevronRight size={16} color="#6B7C93" />
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Past Rooms */}
          {pastRooms.length > 0 && (
            <View className="mt-8">
              <Text className="px-6 text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                Past Rooms
              </Text>

              {pastRooms.slice(0, 5).map((room, index) => (
                <Animated.View
                  key={room.id}
                  entering={FadeInDown.delay(index * 100).duration(400)}
                >
                  <Pressable
                    onPress={() => handleRoomPress(room.id)}
                    className="mx-6 mb-3 active:opacity-80"
                  >
                    <View className="bg-[#1E3A5F]/20 rounded-2xl p-4 border border-[#2E4A6F]/30">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-white/70 font-semibold" numberOfLines={1}>
                            {room.name}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            <Trophy size={12} color="#FFD700" />
                            <Text className="text-white/50 text-xs ml-1">
                              Won by {room.winnerUsername}
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-[#FFD700] font-bold">
                            ${room.prizePool.toFixed(2)}
                          </Text>
                          <Text className="text-white/40 text-xs">
                            {room.tickets.length} tickets
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {!isAuthenticated ? (
            <View className="px-6 mt-8">
              <View className="bg-[#1E3A5F]/20 rounded-2xl p-6 items-center border border-[#2E4A6F]/30">
                <Sparkles size={32} color="#6B7C93" />
                <Text className="text-white/60 text-center mt-4 font-medium">
                  Sign in to host or join private rooms
                </Text>
                <Pressable
                  onPress={() => router.push('/sign-in')}
                  className="mt-4 bg-[#FFD700] px-6 py-3 rounded-full active:opacity-80"
                >
                  <Text className="text-[#0A1628] font-bold">Sign In</Text>
                </Pressable>
              </View>
            </View>
          ) : activeRooms.length === 0 && pastRooms.length === 0 ? (
            <View className="px-6 mt-8">
              <View className="bg-[#1E3A5F]/20 rounded-2xl p-6 items-center border border-[#2E4A6F]/30">
                <Users size={32} color="#6B7C93" />
                <Text className="text-white/60 text-center mt-4 font-medium">
                  No rooms yet
                </Text>
                <Text className="text-white/40 text-center text-sm mt-2">
                  Host a room for friends or join one with a code
                </Text>
              </View>
            </View>
          ) : null}

          {/* Features */}
          <View className="px-6 mt-8">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Why Play in Lobby?
            </Text>
            <View className="space-y-3">
              {[
                {
                  icon: Users,
                  title: 'Better Odds',
                  desc: 'Smaller groups mean higher chances to win',
                },
                {
                  icon: Trophy,
                  title: 'Grow Together',
                  desc: 'More players = bigger prize pool',
                },
                {
                  icon: Play,
                  title: 'Instant Draws',
                  desc: 'Host decides when to draw - no waiting',
                },
              ].map((feature, index) => (
                <View
                  key={index}
                  className="bg-[#1E3A5F]/20 rounded-xl p-4 flex-row items-center mb-3"
                >
                  <View className="w-10 h-10 rounded-full bg-[#FFD700]/10 items-center justify-center mr-3">
                    <feature.icon size={20} color="#FFD700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">{feature.title}</Text>
                    <Text className="text-white/50 text-sm">{feature.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
