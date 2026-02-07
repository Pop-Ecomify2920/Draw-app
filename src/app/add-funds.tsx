import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Wallet,
  Plus,
  Check,
  AlertCircle,
  Smartphone,
} from 'lucide-react-native';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useAuthStore } from '@/lib/state/auth-store';
import {
  getOfferings,
  purchasePackage,
  isRevenueCatEnabled,
} from '@/lib/revenuecatClient';
import type { PurchasesPackage } from 'react-native-purchases';
import { isApiConfigured } from '@/lib/api';
import { BackendWalletService } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from '@/lib/hooks/useUser';
import { lotteryKeys } from '@/lib/hooks/useLottery';

interface WalletPackage {
  identifier: string;
  displayName: string;
  amount: number;
  price: string;
  rcPackage: PurchasesPackage | null;
}

const MANUAL_AMOUNTS = [10, 25, 50, 100];

export default function AddFundsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const walletBalance = useLotteryStore(s => s.walletBalance);
  const addToWallet = useLotteryStore(s => s.addToWallet);

  const [packages, setPackages] = useState<WalletPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<WalletPackage | null>(null);
  const [selectedManualAmount, setSelectedManualAmount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedAmount, setPurchasedAmount] = useState(0);

  const isWeb = Platform.OS === 'web';
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  // Show manual deposit when backend is configured (for testing without RevenueCat)
  const useManualDeposit = isApiConfigured();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);
    setError(null);

    if (!isRevenueCatEnabled()) {
      // No RevenueCat: use manual deposit if backend configured
      setIsLoading(false);
      if (!isApiConfigured()) {
        setError('Payments are not yet configured. Please check back later.');
      }
      return;
    }

    const result = await getOfferings();

    if (!result.ok) {
      setIsLoading(false);
      if (result.reason === 'web_not_supported') {
        setError('web');
      } else if (!isApiConfigured()) {
        setError('Unable to load payment options. Please try again.');
      }
      // If API configured, we still show manual deposit - no error
      return;
    }

    const offerings = result.data;
    const currentOffering = offerings.current;

    if (!currentOffering) {
      setIsLoading(false);
      if (!isApiConfigured()) setError('No payment options available.');
      return;
    }

    // Map packages to our wallet amounts
    const walletPackages: WalletPackage[] = [];

    const packageMapping = [
      { identifier: '$rc_custom_wallet_5', amount: 5 },
      { identifier: '$rc_custom_wallet_10', amount: 10 },
      { identifier: '$rc_custom_wallet_20', amount: 20 },
      { identifier: '$rc_custom_wallet_50', amount: 50 },
    ];

    for (const mapping of packageMapping) {
      const pkg = currentOffering.availablePackages.find(
        p => p.identifier === mapping.identifier
      );

      if (pkg) {
        walletPackages.push({
          identifier: mapping.identifier,
          displayName: `$${mapping.amount} Wallet Funds`,
          amount: mapping.amount,
          price: pkg.product.priceString,
          rcPackage: pkg,
        });
      }
    }

    setPackages(walletPackages);
    if (walletPackages.length > 0) {
      // Select $10 by default if available, otherwise first package
      const defaultPkg = walletPackages.find(p => p.amount === 10) ?? walletPackages[0];
      setSelectedPackage(defaultPkg);
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSelectPackage = (pkg: WalletPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPackage(pkg);
    setError(null);
  };

  const handleManualDeposit = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to add funds.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsProcessing(true);
    setError(null);

    const response = await BackendWalletService.deposit(selectedManualAmount, 'manual');

    if (response.success && response.data) {
      addToWallet(selectedManualAmount);
      setPurchasedAmount(selectedManualAmount);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: lotteryKeys.currentDraw() });

      setTimeout(() => router.back(), 1500);
    } else {
      setIsProcessing(false);
      const msg = response.error || 'Failed to add funds.';
      setError(
        msg.includes('Unauthorized') || msg.includes('401') || msg.includes('Not authenticated')
          ? 'Please sign in to add funds.'
          : msg.includes('fetch') || msg.includes('Network') || msg.includes('Failed to fetch')
          ? 'Cannot reach server. Make sure the backend is running at http://localhost:3000'
          : msg
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage?.rcPackage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsProcessing(true);
    setError(null);

    const result = await purchasePackage(selectedPackage.rcPackage);

    if (result.ok) {
      // Purchase successful - add funds to wallet
      await addToWallet(selectedPackage.amount);
      setPurchasedAmount(selectedPackage.amount);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Go back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } else {
      // Purchase failed or cancelled
      setIsProcessing(false);
      if (result.reason === 'sdk_error') {
        // User likely cancelled - don't show error
        console.log('Purchase cancelled or failed:', result.error);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-6 pt-4 pb-6">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10 mr-4"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <Text className="text-white text-xl font-bold flex-1">Add Funds</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Balance */}
          <View className="px-6 mb-6">
            <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-4">
                  <Wallet size={24} color="#FFD700" />
                </View>
                <View>
                  <Text className="text-white/60 text-sm">Current Balance</Text>
                  <Text className="text-white text-2xl font-bold">${walletBalance.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="px-6 items-center py-12">
              <ActivityIndicator size="large" color="#FFD700" />
              <Text className="text-white/60 mt-4">Loading payment options...</Text>
            </View>
          )}

          {/* Web Not Supported */}
          {error === 'web' && (
            <View className="px-6 items-center py-12">
              <View className="w-20 h-20 rounded-full bg-[#FFD700]/20 items-center justify-center mb-4">
                <Smartphone size={40} color="#FFD700" />
              </View>
              <Text className="text-white text-xl font-bold text-center">Use the Mobile App</Text>
              <Text className="text-white/60 mt-3 text-center leading-6">
                Purchases are only available in the mobile app. Please open Daily Dollar Lotto on your iPhone or Android device to add funds.
              </Text>
            </View>
          )}

          {/* Error State */}
          {error && error !== 'web' && (
            <View className="px-6 items-center py-12">
              <View className="w-20 h-20 rounded-full bg-red-500/20 items-center justify-center mb-4">
                <AlertCircle size={40} color="#EF4444" />
              </View>
              <Text className="text-white text-xl font-bold text-center">Oops!</Text>
              <Text className="text-white/60 mt-3 text-center">{error}</Text>
              <Pressable
                onPress={loadOfferings}
                className="mt-6 px-6 py-3 bg-white/10 rounded-xl"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Success State */}
          {success && (
            <View className="px-6 items-center py-12">
              <View className="w-20 h-20 rounded-full bg-[#22C55E]/20 items-center justify-center mb-4">
                <Check size={40} color="#22C55E" />
              </View>
              <Text className="text-white text-xl font-bold">Funds Added!</Text>
              <Text className="text-white/60 mt-2">${purchasedAmount.toFixed(2)} added to your wallet</Text>
            </View>
          )}

          {/* Manual Deposit - always shown when backend configured */}
          {!isLoading && !success && useManualDeposit && (
            <>
              <View className="px-6">
                <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                  Select Amount
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {MANUAL_AMOUNTS.map((amount) => (
                    <Pressable
                      key={amount}
                      onPress={() => { setSelectedManualAmount(amount); setError(null); }}
                      className="w-1/2 p-1"
                    >
                      <View
                        className={`rounded-xl py-4 items-center border ${
                          selectedManualAmount === amount
                            ? 'bg-[#FFD700]/20 border-[#FFD700]'
                            : 'bg-[#1E3A5F]/20 border-[#2E4A6F]/30'
                        }`}
                      >
                        <Text
                          className={`text-2xl font-bold ${
                            selectedManualAmount === amount ? 'text-[#FFD700]' : 'text-white'
                          }`}
                        >
                          ${amount}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="px-6 mt-6">
                <View className="bg-[#1E3A5F]/20 rounded-xl p-4 border border-[#2E4A6F]/30">
                  <Text className="text-white/60 text-sm text-center">
                    {!isAuthenticated
                      ? 'Sign in first to add funds.'
                      : `Add $${selectedManualAmount} to your wallet for testing. Each ticket costs $1.`}
                  </Text>
                </View>
              </View>

              {!isAuthenticated && (
                <View className="px-6 mt-4">
                  <Pressable
                    onPress={() => router.push('/sign-in')}
                    className="py-3 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/50"
                  >
                    <Text className="text-[#FFD700] font-semibold text-center">Sign In to Add Funds</Text>
                  </Pressable>
                </View>
              )}
              <View className="px-6 mt-6">
                <Pressable
                  onPress={handleManualDeposit}
                  disabled={isProcessing || !isAuthenticated}
                  className="active:opacity-80"
                >
                  <LinearGradient
                    colors={isAuthenticated ? ['#FFD700', '#FFA500'] : ['#4A5568', '#374151']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16 }}
                  >
                    <View className="py-5 flex-row items-center justify-center">
                      {isProcessing ? (
                        <>
                          <ActivityIndicator color={isAuthenticated ? '#0A1628' : '#9CA3AF'} size="small" />
                          <Text className={`text-lg font-bold ml-2 ${isAuthenticated ? 'text-[#0A1628]' : 'text-white/60'}`}>Adding...</Text>
                        </>
                      ) : (
                        <>
                          <Plus size={24} color={isAuthenticated ? '#0A1628' : '#9CA3AF'} />
                          <Text className={`text-lg font-bold ml-2 ${isAuthenticated ? 'text-[#0A1628]' : 'text-white/60'}`}>
                            Add ${selectedManualAmount}
                          </Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              <View className="px-6 mt-6">
                <Text className="text-white/30 text-xs text-center">
                  Manual deposit for development and testing. Balance is stored in your account.
                </Text>
              </View>
            </>
          )}

          {/* Package Selection (RevenueCat) */}
          {!isLoading && !error && !success && !useManualDeposit && packages.length > 0 && (
            <>
              <View className="px-6">
                <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                  Select Amount
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {packages.map((pkg) => (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => handleSelectPackage(pkg)}
                      className="w-1/2 p-1"
                    >
                      <View
                        className={`rounded-xl py-4 items-center border ${
                          selectedPackage?.identifier === pkg.identifier
                            ? 'bg-[#FFD700]/20 border-[#FFD700]'
                            : 'bg-[#1E3A5F]/20 border-[#2E4A6F]/30'
                        }`}
                      >
                        <Text
                          className={`text-2xl font-bold ${
                            selectedPackage?.identifier === pkg.identifier ? 'text-[#FFD700]' : 'text-white'
                          }`}
                        >
                          ${pkg.amount}
                        </Text>
                        <Text
                          className={`text-sm mt-1 ${
                            selectedPackage?.identifier === pkg.identifier ? 'text-[#FFD700]/70' : 'text-white/50'
                          }`}
                        >
                          {pkg.price}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Purchase Info */}
              <View className="px-6 mt-6">
                <View className="bg-[#1E3A5F]/20 rounded-xl p-4 border border-[#2E4A6F]/30">
                  <Text className="text-white/60 text-sm text-center">
                    You'll receive ${selectedPackage?.amount ?? 0} in wallet funds to purchase lottery tickets. Each ticket costs $1.
                  </Text>
                </View>
              </View>

              {/* Purchase Button */}
              <View className="px-6 mt-6">
                <Pressable
                  onPress={handlePurchase}
                  disabled={!selectedPackage || isProcessing}
                  className="active:opacity-80"
                >
                  <LinearGradient
                    colors={selectedPackage ? ['#FFD700', '#FFA500'] : ['#6B7C93', '#4A5568']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16 }}
                  >
                    <View className="py-5 flex-row items-center justify-center">
                      {isProcessing ? (
                        <>
                          <ActivityIndicator color="#0A1628" size="small" />
                          <Text className="text-[#0A1628] text-lg font-bold ml-2">Processing...</Text>
                        </>
                      ) : (
                        <>
                          <Plus size={24} color={selectedPackage ? '#0A1628' : '#9CA3AF'} />
                          <Text
                            className={`text-lg font-bold ml-2 ${
                              selectedPackage ? 'text-[#0A1628]' : 'text-gray-400'
                            }`}
                          >
                            Add ${selectedPackage?.amount ?? 0} for {selectedPackage?.price ?? '$0'}
                          </Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Legal Text */}
              <View className="px-6 mt-6">
                <Text className="text-white/30 text-xs text-center">
                  Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account. Funds are added instantly and are non-refundable.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
