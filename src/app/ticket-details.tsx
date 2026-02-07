import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Ticket,
  X,
  Clock,
  Calendar,
  Trophy,
  Shield,
  Copy,
  Check,
  Hash,
  Users,
  Lock,
  ExternalLink,
  HelpCircle,
  ChevronRight,
  Fingerprint,
} from 'lucide-react-native';
import { useLotteryStore, Ticket as TicketType } from '@/lib/state/lottery-store';
import { useDrawHistoryStore } from '@/lib/state/draw-history-store';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { calculateOdds, calculateOddsPercentage, formatVerificationTimestamp } from '@/lib/crypto/provably-fair';

export default function TicketDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ticketId?: string }>();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeTicket = useLotteryStore(s => s.activeTicket);
  const tickets = useLotteryStore(s => s.tickets);
  const currentPrizePool = useLotteryStore(s => s.currentPrizePool);
  const activePlayers = useLotteryStore(s => s.activePlayers);
  const drawTime = useLotteryStore(s => s.drawTime);
  const currentCommitmentHash = useLotteryStore(s => s.currentCommitmentHash);

  const getDrawById = useDrawHistoryStore(s => s.getDrawById);
  const loadDraws = useDrawHistoryStore(s => s.loadDraws);

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Get the ticket - either from params or active ticket
  const ticket: TicketType | null = params.ticketId
    ? tickets.find(t => t.id === params.ticketId) ?? null
    : activeTicket;

  // Get draw info for this ticket
  const draw = ticket?.drawId ? getDrawById(ticket.drawId) : null;

  const pulseAnim = useSharedValue(0.8);

  useEffect(() => {
    loadDraws();
  }, []);

  useEffect(() => {
    if (ticket?.status === 'active') {
      pulseAnim.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [ticket?.status]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  // Countdown timer
  useEffect(() => {
    if (ticket?.status !== 'active') return;

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
  }, [drawTime, ticket?.status]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleCopy = async (value: string, field: string) => {
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleViewDraw = () => {
    if (ticket?.drawId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/draw-details?drawId=${ticket.drawId}`);
    }
  };

  const handleWhyFair = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/why-fair');
  };

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  const getStatusConfig = () => {
    if (!ticket) return null;
    switch (ticket.status) {
      case 'active':
        return {
          label: 'ACTIVE',
          color: '#FFD700',
          bgColor: '#FFD700',
        };
      case 'won':
        return {
          label: 'WINNER',
          color: '#22C55E',
          bgColor: '#22C55E',
        };
      case 'lost':
        return {
          label: 'NOT SELECTED',
          color: '#6B7C93',
          bgColor: '#6B7C93',
        };
    }
  };

  if (!ticket) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <Text className="text-white">No ticket found</Text>
        <Pressable onPress={handleClose} className="mt-4">
          <Text className="text-[#FFD700]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const statusConfig = getStatusConfig();
  const totalEntries = ticket.finalTotalEntries ?? ticket.totalEntriesAtPurchase ?? activePlayers ?? 1;
  const prizePool = ticket.prizePool ?? currentPrizePool ?? 0;
  const commitmentHash = draw?.commitmentHash ?? currentCommitmentHash ?? '';
  const ticketPosition = ticket.position ?? 1;
  const ticketHash = ticket.ticketHash ?? 'N/A';
  const ticketDrawId = ticket.drawId ?? 'N/A';

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
            onPress={handleWhyFair}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
          >
            <HelpCircle size={20} color="#FFD700" />
          </Pressable>
          <Text className="text-white text-lg font-semibold">Digital Receipt</Text>
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
          {/* Main Receipt Card */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/40 rounded-3xl border border-[#2E4A6F] overflow-hidden">
              {/* Header with gradient */}
              <LinearGradient
                colors={ticket.status === 'won' ? ['#22C55E', '#16A34A'] : ['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 20 }}
              >
                <View className="items-center">
                  <View className="w-14 h-14 rounded-2xl bg-[#0A1628]/20 items-center justify-center mb-2">
                    <Ticket size={28} color="#0A1628" />
                  </View>
                  <Text className="text-[#0A1628] text-xs font-semibold opacity-70">
                    DAILY DOLLAR LOTTO
                  </Text>
                </View>
              </LinearGradient>

              {/* Ticket ID & Status */}
              <View className="p-5">
                <View className="items-center">
                  <Text className="text-white/50 text-xs mb-1">TICKET ID</Text>
                  <Pressable
                    onPress={() => handleCopy(ticket.id, 'ticketId')}
                    className="flex-row items-center active:opacity-70"
                  >
                    <Text className="text-white text-2xl font-bold tracking-wider">
                      {ticket.id}
                    </Text>
                    {copiedField === 'ticketId' ? (
                      <Check size={18} color="#22C55E" style={{ marginLeft: 8 }} />
                    ) : (
                      <Copy size={18} color="#6B7C93" style={{ marginLeft: 8 }} />
                    )}
                  </Pressable>

                  {/* Status Badge */}
                  <Animated.View style={ticket.status === 'active' ? pulseStyle : undefined}>
                    <View
                      className="mt-3 px-4 py-1.5 rounded-full"
                      style={{ backgroundColor: `${statusConfig?.bgColor}20` }}
                    >
                      <Text
                        className="text-xs font-bold tracking-wider"
                        style={{ color: statusConfig?.color }}
                      >
                        {statusConfig?.label}
                      </Text>
                    </View>
                  </Animated.View>
                </View>

                {/* Prize Amount for Winners */}
                {ticket.status === 'won' && ticket.prizeAmount && (
                  <View className="mt-4 pt-4 border-t border-white/10 items-center">
                    <Text className="text-white/50 text-xs">PRIZE WON</Text>
                    <Text className="text-[#22C55E] text-4xl font-bold mt-1">
                      ${ticket.prizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Verification Details */}
          <View className="px-6 mt-5">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Verification Details
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl border border-[#2E4A6F]/50 overflow-hidden">
              {/* Draw ID */}
              <Pressable
                onPress={() => handleCopy(ticketDrawId, 'drawId')}
                className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5"
              >
                <View className="flex-row items-center flex-1">
                  <Hash size={16} color="#6B7C93" />
                  <Text className="text-white/60 ml-3 text-sm">Draw ID</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white font-mono text-xs mr-2">
                    {ticketDrawId}
                  </Text>
                  {copiedField === 'drawId' ? (
                    <Check size={14} color="#22C55E" />
                  ) : (
                    <Copy size={14} color="#6B7C93" />
                  )}
                </View>
              </Pressable>

              {/* Purchase Timestamp */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Clock size={16} color="#6B7C93" />
                  <Text className="text-white/60 ml-3 text-sm">Purchased</Text>
                </View>
                <Text className="text-white text-xs font-mono">
                  {formatVerificationTimestamp(ticket.purchasedAt)}
                </Text>
              </View>

              {/* Draw Date */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Calendar size={16} color="#6B7C93" />
                  <Text className="text-white/60 ml-3 text-sm">Draw Date</Text>
                </View>
                <Text className="text-white text-sm">
                  {format(new Date(ticket.drawDate), 'MMM d, yyyy')} 00:00 UTC
                </Text>
              </View>

              {/* Entry Position */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Users size={16} color="#FFD700" />
                  <Text className="text-white/60 ml-3 text-sm">Entry Position</Text>
                </View>
                <Text className="text-[#FFD700] font-bold">
                  #{ticketPosition.toLocaleString()} of {totalEntries.toLocaleString()}
                </Text>
              </View>

              {/* Exact Odds */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Trophy size={16} color="#FFD700" />
                  <Text className="text-white/60 ml-3 text-sm">Your Odds</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#FFD700] font-bold">
                    {calculateOdds(ticketPosition, totalEntries)}
                  </Text>
                  <Text className="text-white/40 text-xs">
                    ({calculateOddsPercentage(totalEntries)})
                  </Text>
                </View>
              </View>

              {/* Prize Pool */}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <Ticket size={16} color="#6B7C93" />
                  <Text className="text-white/60 ml-3 text-sm">Prize Pool</Text>
                </View>
                <Text className="text-white font-bold">
                  ${prizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Cryptographic Proof */}
          <View className="px-6 mt-5">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Cryptographic Proof
            </Text>
            <View className="bg-[#22C55E]/10 rounded-2xl border border-[#22C55E]/30 overflow-hidden">
              {/* Ticket Hash */}
              <Pressable
                onPress={() => handleCopy(ticketHash, 'ticketHash')}
                className="p-4 border-b border-[#22C55E]/20 active:bg-white/5"
              >
                <View className="flex-row items-center mb-2">
                  <Fingerprint size={16} color="#22C55E" />
                  <Text className="text-[#22C55E] text-sm font-medium ml-2">
                    Ticket Hash
                  </Text>
                  {copiedField === 'ticketHash' ? (
                    <Check size={14} color="#22C55E" style={{ marginLeft: 'auto' }} />
                  ) : (
                    <Copy size={14} color="#22C55E" style={{ marginLeft: 'auto' }} />
                  )}
                </View>
                <Text className="text-white font-mono text-xs">
                  {ticketHash}
                </Text>
                <Text className="text-white/40 text-xs mt-1">
                  Proves your entry cannot be altered
                </Text>
              </Pressable>

              {/* Pre-Commitment Hash */}
              {commitmentHash && (
                <Pressable
                  onPress={() => handleCopy(commitmentHash, 'commitment')}
                  className="p-4 active:bg-white/5"
                >
                  <View className="flex-row items-center mb-2">
                    <Lock size={16} color="#22C55E" />
                    <Text className="text-[#22C55E] text-sm font-medium ml-2">
                      Draw Commitment Hash
                    </Text>
                    {copiedField === 'commitment' ? (
                      <Check size={14} color="#22C55E" style={{ marginLeft: 'auto' }} />
                    ) : (
                      <Copy size={14} color="#22C55E" style={{ marginLeft: 'auto' }} />
                    )}
                  </View>
                  <Text className="text-white font-mono text-xs" numberOfLines={2}>
                    {commitmentHash}
                  </Text>
                  <Text className="text-white/40 text-xs mt-1">
                    Published before draw - locks outcome in advance
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Countdown for Active Tickets */}
          {ticket.status === 'active' && (
            <View className="px-6 mt-5">
              <View className="bg-[#1E3A5F]/30 rounded-2xl p-5 border border-[#2E4A6F]/50">
                <View className="flex-row items-center justify-center mb-4">
                  <Clock size={18} color="#FFD700" />
                  <Text className="text-white/70 ml-2 text-sm font-medium">
                    Draw in
                  </Text>
                </View>

                <View className="flex-row justify-center items-center">
                  <View className="items-center mx-2">
                    <View className="bg-[#0A1628] rounded-xl px-4 py-2">
                      <Text className="text-white text-2xl font-bold">
                        {formatTime(timeLeft.hours)}
                      </Text>
                    </View>
                    <Text className="text-white/50 text-xs mt-1">HRS</Text>
                  </View>

                  <Text className="text-[#FFD700] text-xl font-bold">:</Text>

                  <View className="items-center mx-2">
                    <View className="bg-[#0A1628] rounded-xl px-4 py-2">
                      <Text className="text-white text-2xl font-bold">
                        {formatTime(timeLeft.minutes)}
                      </Text>
                    </View>
                    <Text className="text-white/50 text-xs mt-1">MIN</Text>
                  </View>

                  <Text className="text-[#FFD700] text-xl font-bold">:</Text>

                  <View className="items-center mx-2">
                    <View className="bg-[#0A1628] rounded-xl px-4 py-2">
                      <Text className="text-white text-2xl font-bold">
                        {formatTime(timeLeft.seconds)}
                      </Text>
                    </View>
                    <Text className="text-white/50 text-xs mt-1">SEC</Text>
                  </View>
                </View>

                <Text className="text-white/40 text-xs text-center mt-3">
                  Tickets freeze at draw time - no changes possible
                </Text>
              </View>
            </View>
          )}

          {/* View Draw Details Button (for past tickets) */}
          {ticket.status !== 'active' && ticket.drawId && (
            <View className="px-6 mt-5">
              <Pressable
                onPress={handleViewDraw}
                className="bg-[#1E3A5F]/40 rounded-2xl p-4 border border-[#2E4A6F]/50 flex-row items-center justify-between active:bg-[#1E3A5F]/60"
              >
                <View className="flex-row items-center">
                  <Shield size={20} color="#FFD700" />
                  <View className="ml-3">
                    <Text className="text-white font-medium">View Draw Verification</Text>
                    <Text className="text-white/50 text-xs">
                      See seed reveal & winner selection proof
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#FFD700" />
              </Pressable>
            </View>
          )}

          {/* Why This Is Fair Link */}
          <View className="px-6 mt-5">
            <Pressable
              onPress={handleWhyFair}
              className="flex-row items-center justify-center py-3 active:opacity-70"
            >
              <Shield size={14} color="#22C55E" />
              <Text className="text-[#22C55E] text-sm ml-2">
                Why this is fair & verifiable
              </Text>
              <ExternalLink size={12} color="#22C55E" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          {/* Footer */}
          <View className="px-6 mt-4">
            <Text className="text-white/30 text-xs text-center">
              This receipt is cryptographically secured.{'\n'}
              Results announced at 00:00 UTC daily.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
