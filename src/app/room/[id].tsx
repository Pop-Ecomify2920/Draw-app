import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  FadeInDown,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Crown,
  Users,
  Ticket,
  DollarSign,
  Copy,
  Share2,
  Play,
  Trophy,
  Clock,
  Sparkles,
  CheckCircle2,
  User,
  Zap,
} from 'lucide-react-native';
import { useRoomDetails, useSeedPot, useStartDraw, useLeaveRoom, useWalletBalance } from '@/lib/hooks';
import { useLobbyStore, LobbyRoom, LobbyParticipant } from '@/lib/state/lobby-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { isApiConfigured } from '@/lib/api';

export default function RoomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore(s => s.user);
  const { data: walletData } = useWalletBalance();
  const walletBalance = useLotteryStore(s => s.walletBalance);
  const addToWallet = useLotteryStore(s => s.addToWallet);

  const { data: apiRoom, refetch: refetchRoom } = useRoomDetails(id || '');
  const seedPotMutation = useSeedPot();
  const triggerDrawMutation = useStartDraw();
  const leaveRoomMutation = useLeaveRoom();

  const getRoomById = useLobbyStore(s => s.getRoomById);
  const currentRoom = useLobbyStore(s => s.currentRoom);
  const setCurrentRoom = useLobbyStore(s => s.setCurrentRoom);
  const purchaseRoomTicket = useLobbyStore(s => s.purchaseRoomTicket);
  const startDraw = useLobbyStore(s => s.startDraw);
  const executeDraw = useLobbyStore(s => s.executeDraw);
  const addSimulatedParticipant = useLobbyStore(s => s.addSimulatedParticipant);
  const saveToStorage = useLobbyStore(s => s.saveToStorage);

  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [seedAmount, setSeedAmount] = useState(10);
  const [copied, setCopied] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [drawCountdown, setDrawCountdown] = useState<number | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const prizeGlow = useSharedValue(0);
  const buyButtonScale = useSharedValue(1);
  const confettiAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    prizeGlow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Load room on mount - from API or store
  useEffect(() => {
    if (id && isApiConfigured() && apiRoom) {
      const r = apiRoom as any;
      const members = Array.isArray(r.members) ? r.members : [];
      const mapped: LobbyRoom = {
        id: r.id,
        code: r.code || '------',
        name: r.name || 'Room',
        hostId: r.host_id || r.creator_id || '',
        hostUsername: r.host_username || 'Host',
        participants: members.map((m: any) => ({
          id: m.user_id,
          username: m.username || 'Player',
          joinedAt: m.joined_at || new Date().toISOString(),
          hasTicket: Boolean(m.has_ticket),
        })),
        tickets: [],
        prizePool: parseFloat(r.prize_pool || 0),
        status: r.status || 'open',
        maxParticipants: r.max_participants || 10,
      };
      setRoom(mapped);
      setCurrentRoom(mapped);
    } else if (id) {
      const foundRoom = getRoomById(id);
      if (foundRoom) {
        // Ensure participants and tickets are always arrays (API create response may omit them)
        const normalized: LobbyRoom = {
          ...foundRoom,
          participants: Array.isArray(foundRoom.participants) ? foundRoom.participants : [],
          tickets: Array.isArray(foundRoom.tickets) ? foundRoom.tickets : [],
        };
        setRoom(normalized);
        setCurrentRoom(normalized);
      }
    }
  }, [id, getRoomById, setCurrentRoom, isApiConfigured(), apiRoom]);

  // Sync room with currentRoom changes (local only)
  useEffect(() => {
    if (!isApiConfigured() && currentRoom && currentRoom.id === id) {
      setRoom(currentRoom);
    }
  }, [currentRoom, id, isApiConfigured()]);

  // Simulate other players joining periodically (for demo)
  useEffect(() => {
    if (!room || room.status === 'locked' || room.status === 'drawn') return;
    const participants = room.participants ?? [];
    if (participants.length >= 5) return; // Limit simulation

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        addSimulatedParticipant(room.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [room?.id, room?.status, room?.participants?.length, addSimulatedParticipant]);

  // Handle draw countdown
  useEffect(() => {
    if (room?.status !== 'locked' || !room.drawScheduledAt) return;

    const updateCountdown = () => {
      const scheduledTime = new Date(room.drawScheduledAt!).getTime();
      const now = Date.now();
      const diff = Math.ceil((scheduledTime - now) / 1000);

      if (diff <= 0) {
        setDrawCountdown(null);
        // Execute the draw
        const result = executeDraw(room.id);
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowWinner(true);
          confettiAnim.value = withSequence(
            withTiming(1, { duration: 500 }),
            withDelay(3000, withTiming(0, { duration: 500 }))
          );

          // If user won, add prize to wallet
          if (result.winnerId === user?.id) {
            addToWallet(result.prizeAmount);
          }

          if (user?.id) {
            saveToStorage(user.id);
          }
        }
      } else {
        setDrawCountdown(diff);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 100);
    return () => clearInterval(interval);
  }, [room?.status, room?.drawScheduledAt, room?.id, executeDraw, user?.id, addToWallet, saveToStorage]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(prizeGlow.value * 0.3, { duration: 1000 }),
  }));

  const buyButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buyButtonScale.value }],
  }));

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentRoom(null);
    router.back();
  };

  const handleCopyCode = async () => {
    if (!room) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!room) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Join my Daily Dollar Lotto room "${room.name}"!\n\nUse code: ${room.code}\n\nBetter odds, bigger fun!`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleBuyTicket = async () => {
    if (!room || !user) return;

    if (walletBalance < 1) {
      router.push('/add-funds');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    buyButtonScale.value = withSequence(withSpring(0.95), withSpring(1));

    setIsPurchasing(true);

    // Deduct from main wallet
    const currentBalance = useLotteryStore.getState().walletBalance;
    useLotteryStore.setState({ walletBalance: currentBalance - 1 });

    const ticket = purchaseRoomTicket(room.id, user.id, user.username, walletBalance);

    if (ticket) {
      await saveToStorage(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Refund if purchase failed
      useLotteryStore.setState({ walletBalance: currentBalance });
    }

    setIsPurchasing(false);
  };

  const handleSeedPot = async () => {
    if (!room || !user || room.hostId !== user.id || !id) return;
    const bal = walletData?.balance ?? walletBalance;
    if (bal < seedAmount) {
      router.push('/add-funds');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await seedPotMutation.mutateAsync({ roomId: id, amount: seedAmount });
      refetchRoom();
      useLotteryStore.setState(s => ({ walletBalance: Math.max(0, (walletData?.balance ?? walletBalance) - seedAmount) }));
    } catch (e) {
      Alert.alert('Error', (e as Error)?.message || 'Failed to seed pot');
    }
  };

  const handleTriggerDraw = async () => {
    if (!room || !user || room.hostId !== user.id || !id) return;
    if ((room.participants?.length ?? 0) < 2) {
      Alert.alert('Not Enough Players', 'Need at least 2 participants to start a draw.');
      return;
    }
    if (room.prizePool <= 0) {
      Alert.alert('Fund Pot First', 'Host must seed the pot before drawing.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const result = await triggerDrawMutation.mutateAsync(id);
      if ((result as any).winnerId === user.id) {
        addToWallet((result as any).prizeAmount || 0);
      }
      setShowWinner(true);
      refetchRoom();
    } catch (e) {
      Alert.alert('Error', (e as Error)?.message || 'Failed to trigger draw');
    }
  };

  const handleLeaveRoom = async () => {
    if (!id) return;
    try {
      if (isApiConfigured()) {
        await leaveRoomMutation.mutateAsync(id);
      }
      setCurrentRoom(null);
      router.back();
    } catch {
      setCurrentRoom(null);
      router.back();
    }
  };

  const handleStartDraw = () => {
    if (isApiConfigured()) {
      handleTriggerDraw();
      return;
    }
    if (!room || !user || room.hostId !== user.id) return;
    if (tickets.length < 2) {
      Alert.alert('Not Enough Players', 'Need at least 2 tickets to start a draw.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startDraw(room.id, user.id);
    if (user.id) saveToStorage(user.id);
  };

  if (!room) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <Text className="text-white/60">Room not found</Text>
      </View>
    );
  }

  const isHost = room.hostId === user?.id;
  const participants = room.participants ?? [];
  const tickets = room.tickets ?? [];
  const participant = participants.find(p => p.id === user?.id);
  const hasTicket = participant?.hasTicket ?? false;
  const userTicket = tickets.find(t => t.participantId === user?.id);
  const isWinner = room.winnerId === user?.id;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return '#6B7C93';
      case 'open':
        return '#22C55E';
      case 'locked':
        return '#FFA500';
      case 'drawn':
        return '#FFD700';
      default:
        return '#6B7C93';
    }
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 350 }}
      />

      {/* Winner Overlay */}
      {showWinner && room.status === 'drawn' && (
        <Animated.View
          entering={FadeIn.duration(500)}
          className="absolute inset-0 z-50 items-center justify-center"
          style={{ backgroundColor: 'rgba(10, 22, 40, 0.95)' }}
        >
          <View className="items-center px-8">
            <View className="w-24 h-24 rounded-full bg-[#FFD700]/20 items-center justify-center mb-6">
              <Trophy size={48} color="#FFD700" />
            </View>
            <Text className="text-[#FFD700] text-3xl font-bold mb-2">
              {isWinner ? 'You Won!' : 'Winner!'}
            </Text>
            <Text className="text-white text-5xl font-bold mb-4">
              ${room.prizePool.toFixed(2)}
            </Text>
            <Text className="text-white/60 text-lg mb-8">
              {room.winnerUsername}
            </Text>
            <Pressable
              onPress={() => setShowWinner(false)}
              className="bg-[#FFD700] px-8 py-4 rounded-2xl active:opacity-80"
            >
              <Text className="text-[#0A1628] font-bold text-lg">
                {isWinner ? 'Claim Prize' : 'View Results'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-2">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={handleBack}
                className="w-10 h-10 rounded-full bg-[#1E3A5F]/50 items-center justify-center active:opacity-70"
              >
                <ArrowLeft size={20} color="#fff" />
              </Pressable>

              <View className="flex-row items-center">
                {isHost && (
                  <View className="bg-[#FFD700]/20 px-3 py-1 rounded-full mr-2 flex-row items-center">
                    <Crown size={14} color="#FFD700" />
                    <Text className="text-[#FFD700] text-xs font-medium ml-1">Host</Text>
                  </View>
                )}
                <View
                  className="px-3 py-1 rounded-full flex-row items-center"
                  style={{ backgroundColor: `${getStatusColor(room.status)}20` }}
                >
                  {room.status === 'open' && <Zap size={12} color="#22C55E" />}
                  <Text
                    className="text-xs font-medium capitalize ml-1"
                    style={{ color: getStatusColor(room.status) }}
                  >
                    {room.status === 'locked' ? 'Drawing...' : room.status}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-white text-2xl font-bold">{room.name}</Text>
              <Text className="text-white/50 text-sm mt-1">
                Hosted by {room.hostUsername}
              </Text>
            </View>
          </View>

          {/* Room Code */}
          <View className="px-6 mt-4">
            <View className="bg-[#1E3A5F]/50 rounded-2xl p-4 border border-[#2E4A6F]">
              <Text className="text-white/60 text-xs uppercase tracking-wide mb-2">
                Room Code
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-3xl font-bold tracking-[8px] font-mono">
                  {room.code}
                </Text>
                <View className="flex-row">
                  <Pressable
                    onPress={handleCopyCode}
                    className="w-10 h-10 rounded-full bg-[#0A1628]/50 items-center justify-center mr-2 active:opacity-70"
                  >
                    {copied ? (
                      <CheckCircle2 size={20} color="#22C55E" />
                    ) : (
                      <Copy size={20} color="#6B7C93" />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleShare}
                    className="w-10 h-10 rounded-full bg-[#0A1628]/50 items-center justify-center active:opacity-70"
                  >
                    <Share2 size={20} color="#6B7C93" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Prize Pool */}
          <View className="px-6 mt-4">
            <Animated.View style={pulseStyle}>
              <View className="relative overflow-hidden rounded-2xl">
                <Animated.View
                  style={[
                    glowStyle,
                    {
                      position: 'absolute',
                      top: -30,
                      left: -30,
                      right: -30,
                      bottom: -30,
                      backgroundColor: '#FFD700',
                      borderRadius: 24,
                    },
                  ]}
                />
                <LinearGradient
                  colors={['#1E3A5F', '#0F2847']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#2E4A6F',
                  }}
                >
                  <View className="items-center">
                    <View className="flex-row items-center mb-2">
                      <Trophy size={18} color="#FFD700" />
                      <Text className="text-[#FFD700] text-xs font-semibold ml-2 uppercase tracking-wide">
                        Prize Pool
                      </Text>
                    </View>
                    <Text className="text-white text-5xl font-bold">
                      ${room.prizePool.toFixed(2)}
                    </Text>
                    <Text className="text-white/50 text-sm mt-2">
                      {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} • 95%
                      payout
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          </View>

          {/* Draw Countdown */}
          {drawCountdown !== null && (
            <Animated.View entering={FadeInDown.duration(400)} className="px-6 mt-4">
              <View className="bg-[#FFA500]/20 rounded-2xl p-4 border border-[#FFA500]/50">
                <View className="items-center">
                  <Clock size={24} color="#FFA500" />
                  <Text className="text-[#FFA500] text-4xl font-bold mt-2">
                    {drawCountdown}
                  </Text>
                  <Text className="text-[#FFA500]/70 text-sm">seconds until draw</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Stats */}
          <View className="px-6 mt-4 flex-row">
            <View className="flex-1 bg-[#1E3A5F]/30 rounded-xl p-4 mr-2">
              <View className="flex-row items-center">
                <Users size={16} color="#6B7C93" />
                <Text className="text-white/60 text-xs ml-2">Players</Text>
              </View>
              <Text className="text-white text-2xl font-bold mt-1">
                {participants.length}
              </Text>
            </View>
            <View className="flex-1 bg-[#1E3A5F]/30 rounded-xl p-4 ml-2">
              <View className="flex-row items-center">
                <Ticket size={16} color="#6B7C93" />
                <Text className="text-white/60 text-xs ml-2">Tickets</Text>
              </View>
              <Text className="text-white text-2xl font-bold mt-1">{tickets.length}</Text>
            </View>
          </View>

          {/* Your Ticket */}
          {hasTicket && userTicket && (
            <Animated.View entering={FadeInDown.duration(400)} className="px-6 mt-4">
              <View className="bg-[#22C55E]/20 rounded-2xl p-4 border border-[#22C55E]/50">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <CheckCircle2 size={20} color="#22C55E" />
                    <Text className="text-[#22C55E] font-semibold ml-2">Your Ticket</Text>
                  </View>
                  <Text className="text-white/60 text-xs font-mono">{userTicket.id}</Text>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-white/60 text-sm">
                    Position #{userTicket.position} of {tickets.length}
                  </Text>
                  <Text className="text-[#22C55E] font-semibold">
                    {tickets.length > 0 ? ((1 / tickets.length) * 100).toFixed(1) : '0'}% odds
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Participants List */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Players ({participants.length})
            </Text>
            {participants.slice(0, 10).map((p, index) => (
              <Animated.View
                key={p.id}
                entering={FadeInDown.delay(index * 50).duration(300)}
              >
                <View className="bg-[#1E3A5F]/20 rounded-xl p-3 mb-2 flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-[#0A1628] items-center justify-center mr-3">
                    {p.id === room.hostId ? (
                      <Crown size={14} color="#FFD700" />
                    ) : (
                      <User size={14} color="#6B7C93" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">
                      {p.username}
                      {p.id === user?.id && (
                        <Text className="text-white/50"> (You)</Text>
                      )}
                    </Text>
                  </View>
                  {p.hasTicket ? (
                    <View className="bg-[#22C55E]/20 px-2 py-1 rounded-full">
                      <Ticket size={12} color="#22C55E" />
                    </View>
                  ) : (
                    <Text className="text-white/40 text-xs">Waiting...</Text>
                  )}
                </View>
              </Animated.View>
            ))}
            {participants.length > 10 && (
              <Text className="text-white/40 text-center text-sm mt-2">
                +{participants.length - 10} more players
              </Text>
            )}
          </View>

          {/* Winner Display (after draw) */}
          {room.status === 'drawn' && room.winnerUsername && (
            <Animated.View entering={FadeInDown.duration(400)} className="px-6 mt-6">
              <View className="bg-[#FFD700]/10 rounded-2xl p-6 border border-[#FFD700]/30 items-center">
                <Trophy size={32} color="#FFD700" />
                <Text className="text-[#FFD700] text-sm uppercase tracking-wide mt-2">
                  Winner
                </Text>
                <Text className="text-white text-2xl font-bold mt-1">
                  {room.winnerUsername}
                </Text>
                <Text className="text-[#FFD700] text-3xl font-bold mt-2">
                  ${room.prizePool.toFixed(2)}
                </Text>
                {isWinner && (
                  <View className="mt-4 bg-[#FFD700] px-4 py-2 rounded-full">
                    <Text className="text-[#0A1628] font-bold">That's You!</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Action */}
        {room.status !== 'drawn' && (
          <View className="px-6 pb-8 pt-4 border-t border-[#1E3A5F]">
            {room.status === 'locked' ? (
              <View className="bg-[#FFA500]/20 rounded-2xl p-4 items-center">
                <Text className="text-[#FFA500] font-bold">Draw in progress...</Text>
              </View>
            ) : isApiConfigured() ? (
              isHost ? (
                <>
                  <View className="flex-row gap-2 mb-3">
                    {[10, 25, 50, 100].map(amt => (
                      <Pressable
                        key={amt}
                        onPress={() => setSeedAmount(amt)}
                        className={`flex-1 py-2 rounded-xl items-center ${seedAmount === amt ? 'bg-[#FFD700]/20 border border-[#FFD700]' : 'bg-[#1E3A5F]/50'}`}
                      >
                        <Text className={seedAmount === amt ? 'text-[#FFD700] font-bold' : 'text-white/70'}>${amt}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={handleSeedPot}
                      disabled={seedPotMutation.isPending || (walletData?.balance ?? walletBalance) < seedAmount}
                      className="flex-1 active:opacity-90"
                    >
                      <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16 }}>
                        <View className="py-4 items-center">
                          <DollarSign size={20} color="#0A1628" />
                          <Text className="text-[#0A1628] font-bold">Seed ${seedAmount}</Text>
                        </View>
                      </LinearGradient>
                    </Pressable>
                    <Pressable
                      onPress={handleTriggerDraw}
                      disabled={triggerDrawMutation.isPending || participants.length < 2 || room.prizePool <= 0}
                      className="flex-1 active:opacity-90"
                    >
                      <LinearGradient
                        colors={participants.length >= 2 && room.prizePool > 0 ? ['#22C55E', '#16A34A'] : ['#2E4A6F', '#1E3A5F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ borderRadius: 16 }}
                      >
                        <View className="py-4 items-center">
                          <Play size={20} color={participants.length >= 2 && room.prizePool > 0 ? '#fff' : '#6B7C93'} />
                          <Text className={`font-bold ${participants.length >= 2 && room.prizePool > 0 ? 'text-white' : 'text-[#6B7C93]'}`}>Draw</Text>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  </View>
                  <Text className="text-white/40 text-center text-xs mt-2">
                    Balance: ${(walletData?.balance ?? walletBalance).toFixed(2)} • Min 2 players, pot &gt; $0
                  </Text>
                </>
              ) : (
                <View className="bg-[#1E3A5F]/50 rounded-2xl p-4 items-center">
                  <Clock size={18} color="#6B7C93" />
                  <Text className="text-white/60 mt-2">Waiting for host to seed pot and start draw...</Text>
                </View>
              )
            ) : !hasTicket ? (
              <Animated.View style={buyButtonStyle}>
                <Pressable onPress={handleBuyTicket} disabled={isPurchasing} className="active:opacity-90">
                  <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16 }}>
                    <View className="py-5 flex-row items-center justify-center">
                      <Sparkles size={24} color="#0A1628" />
                      <Text className="text-[#0A1628] text-lg font-bold ml-3">
                        {isPurchasing ? 'Purchasing...' : 'Buy Ticket - $1.00'}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
                <Text className="text-white/40 text-center text-xs mt-2">Balance: ${walletBalance.toFixed(2)}</Text>
              </Animated.View>
            ) : isHost ? (
              <Pressable onPress={handleStartDraw} disabled={tickets.length < 2} className="active:opacity-90">
                <LinearGradient
                  colors={tickets.length >= 2 ? ['#22C55E', '#16A34A'] : ['#2E4A6F', '#1E3A5F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-5 flex-row items-center justify-center">
                    <Play size={24} color={tickets.length >= 2 ? '#fff' : '#6B7C93'} fill={tickets.length >= 2 ? '#fff' : 'transparent'} />
                    <Text className={`text-lg font-bold ml-3 ${tickets.length >= 2 ? 'text-white' : 'text-[#6B7C93]'}`}>Start Draw</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : (
              <View className="bg-[#1E3A5F]/50 rounded-2xl p-4 items-center">
                <Clock size={18} color="#6B7C93" />
                <Text className="text-white/60 ml-2">Waiting for host to start draw...</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
