import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  Ticket,
  Wallet,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Shield,
  Lock,
} from 'lucide-react-native';
import { useLotteryStore, Ticket as TicketType } from '@/lib/state/lottery-store';
import { useCurrentDraw, usePurchaseTicket } from '@/lib/hooks';

type PurchaseStep = 'confirm' | 'processing' | 'success' | 'error';

export default function PurchaseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<PurchaseStep>('confirm');
  const [purchasedTicket, setPurchasedTicket] = useState<TicketType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Get current draw data from API
  const { data: currentDrawData } = useCurrentDraw();
  const purchaseTicketMutation = usePurchaseTicket();

  const walletBalance = useLotteryStore(s => s.walletBalance);
  const currentPrizePool = useLotteryStore(s => s.currentPrizePool);
  const ticketsPurchasedThisYear = useLotteryStore(s => s.ticketsPurchasedThisYear);

  const buttonScale = useSharedValue(1);
  const checkScale = useSharedValue(0);

  const canPurchase = walletBalance >= 1 && ticketsPurchasedThisYear < 365;

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handlePurchase = useCallback(async () => {
    if (!canPurchase) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    setStep('processing');

    // Get draw ID from API data or generate one
    const drawId = currentDrawData?.drawId || `DRAW-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

    purchaseTicketMutation.mutate(drawId, {
      onSuccess: (data) => {
        setPurchasedTicket(data.ticket);
        setStep('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        checkScale.value = withSpring(1, { damping: 10, stiffness: 100 });
      },
      onError: (error) => {
        setErrorMessage(error.message || 'Purchase failed');
        setStep('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  }, [canPurchase, currentDrawData, purchaseTicketMutation, buttonScale, checkScale]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewTicket = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/ticket-details');
  };

  // Use API data with fallbacks
  const estimatedPool = (currentDrawData?.prizePool ?? currentPrizePool) + 0.95;
  const commitmentHash = currentDrawData?.commitmentHash;

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4">
          <View />
          <Text className="text-white text-lg font-semibold">Purchase Ticket</Text>
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {step === 'confirm' && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              className="flex-1 px-6 pt-8"
            >
              {/* Ticket Preview */}
              <View className="items-center mb-8">
                <View className="w-24 h-24 rounded-3xl bg-[#FFD700]/20 items-center justify-center mb-4">
                  <Ticket size={48} color="#FFD700" />
                </View>
                <Text className="text-white text-2xl font-bold">Daily Lotto Ticket</Text>
                <Text className="text-white/60 text-sm mt-2">
                  One chance to win today's prize pool
                </Text>
              </View>

              {/* Order Summary */}
              <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
                <Text className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wide">
                  Order Summary
                </Text>

                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-white/80">Ticket Price</Text>
                  <Text className="text-white font-semibold">$1.00</Text>
                </View>

                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-white/80">Prize Pool</Text>
                  <Text className="text-[#FFD700] font-semibold">
                    ${estimatedPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View className="h-px bg-white/10 my-3" />

                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-medium">Your Balance After</Text>
                  <Text className="text-white font-bold text-lg">
                    ${(walletBalance - 1).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Draw Commitment Hash (Provably Fair) */}
              {commitmentHash && (
                <View className="bg-[#22C55E]/10 rounded-xl p-4 mt-4 border border-[#22C55E]/30">
                  <View className="flex-row items-center mb-2">
                    <Lock size={16} color="#22C55E" />
                    <Text className="text-[#22C55E] text-sm font-medium ml-2">
                      Pre-Committed Draw Hash
                    </Text>
                  </View>
                  <Text className="text-white/60 text-xs font-mono">
                    {commitmentHash.substring(0, 32)}...
                  </Text>
                  <Text className="text-white/40 text-xs mt-1">
                    This hash locks the draw outcome before you buy
                  </Text>
                </View>
              )}

              {/* Wallet Info */}
              <View className="flex-row items-center bg-[#1E3A5F]/20 rounded-xl p-4 mt-4 border border-[#2E4A6F]/30">
                <Wallet size={20} color="#FFD700" />
                <Text className="text-white/70 ml-3 flex-1">Wallet Balance</Text>
                <Text className="text-[#FFD700] font-bold">${walletBalance.toFixed(2)}</Text>
              </View>

              {/* Annual Limit Warning */}
              {ticketsPurchasedThisYear >= 350 && (
                <View className="flex-row items-center bg-[#FFA500]/10 rounded-xl p-4 mt-4 border border-[#FFA500]/30">
                  <AlertTriangle size={20} color="#FFA500" />
                  <Text className="text-[#FFA500] ml-3 flex-1 text-sm">
                    You have {365 - ticketsPurchasedThisYear} tickets remaining this year
                  </Text>
                </View>
              )}

              {/* Security Badge */}
              <View className="flex-row items-center justify-center mt-6">
                <Shield size={14} color="#22C55E" />
                <Text className="text-[#22C55E] text-xs ml-2">
                  Provably fair & verifiable transaction
                </Text>
              </View>

              {/* Purchase Button */}
              <View className="mt-auto pt-8">
                <Animated.View style={buttonAnimStyle}>
                  <Pressable
                    onPress={handlePurchase}
                    disabled={!canPurchase}
                    className="active:opacity-90"
                  >
                    <LinearGradient
                      colors={canPurchase ? ['#FFD700', '#FFA500'] : ['#6B7C93', '#4A5568']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 16 }}
                    >
                      <View className="py-5 flex-row items-center justify-center">
                        <Sparkles size={24} color={canPurchase ? '#0A1628' : '#9CA3AF'} />
                        <Text
                          className={`text-lg font-bold ml-3 ${canPurchase ? 'text-[#0A1628]' : 'text-gray-400'}`}
                        >
                          Confirm Purchase - $1.00
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                <Text className="text-white/40 text-center text-xs mt-3">
                  By purchasing, you agree to our Terms & Conditions
                </Text>
              </View>
            </Animated.View>
          )}

          {step === 'processing' && (
            <Animated.View
              entering={FadeIn}
              className="flex-1 items-center justify-center px-6"
            >
              <View className="w-20 h-20 rounded-full border-4 border-[#FFD700] border-t-transparent animate-spin" />
              <Text className="text-white text-xl font-bold mt-6">Processing...</Text>
              <Text className="text-white/60 text-sm mt-2">
                Securing your ticket
              </Text>
            </Animated.View>
          )}

          {step === 'success' && purchasedTicket && (
            <Animated.View
              entering={FadeIn}
              className="flex-1 items-center justify-center px-6"
            >
              <Animated.View
                style={[checkAnimStyle, {
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#22C55E20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }]}
              >
                <Check size={48} color="#22C55E" />
              </Animated.View>

              <Text className="text-white text-2xl font-bold mt-6">
                Ticket Purchased!
              </Text>
              <Text className="text-white/60 text-sm mt-2 text-center">
                Your ticket has been entered into today's draw
              </Text>

              {/* Ticket ID */}
              <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 mt-6 border border-[#2E4A6F]/50 w-full">
                <Text className="text-white/60 text-center text-sm mb-2">
                  Your Ticket ID
                </Text>
                <Text className="text-[#FFD700] text-2xl font-bold text-center">
                  {purchasedTicket.id}
                </Text>
                <View className="mt-3 pt-3 border-t border-white/10">
                  <Text className="text-white/40 text-xs text-center">
                    Position #{purchasedTicket.position} of {purchasedTicket.totalEntriesAtPurchase}
                  </Text>
                </View>
              </View>

              <View className="w-full mt-auto pt-8">
                <Pressable
                  onPress={handleViewTicket}
                  className="active:opacity-80"
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16 }}
                  >
                    <View className="py-5 items-center justify-center">
                      <Text className="text-[#0A1628] text-lg font-bold">
                        View Your Receipt
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={handleClose}
                  className="py-4 items-center active:opacity-70 mt-2"
                >
                  <Text className="text-white/60 font-medium">Back to Home</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {step === 'error' && (
            <Animated.View
              entering={FadeIn}
              className="flex-1 items-center justify-center px-6"
            >
              <View className="w-24 h-24 rounded-full bg-red-500/20 items-center justify-center">
                <X size={48} color="#EF4444" />
              </View>

              <Text className="text-white text-2xl font-bold mt-6">
                Purchase Failed
              </Text>
              <Text className="text-white/60 text-sm mt-2 text-center">
                You may have already purchased a ticket today or reached your annual limit
              </Text>

              <Pressable
                onPress={handleClose}
                className="mt-8 active:opacity-80"
              >
                <View className="bg-[#1E3A5F] px-8 py-4 rounded-xl">
                  <Text className="text-white font-semibold">Go Back</Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
