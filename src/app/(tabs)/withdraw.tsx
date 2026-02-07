import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  Wallet,
  Building2,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
} from 'lucide-react-native';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { useAppStatsStore, type Transaction, type WithdrawalRequest } from '@/lib/state/app-stats-store';

type WithdrawMethod = 'bank' | 'card' | null;

interface LinkedAccount {
  id: string;
  type: 'bank' | 'card';
  name: string;
  lastFour: string;
  isDefault: boolean;
}

export default function WithdrawScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const walletBalance = useLotteryStore(s => s.walletBalance);

  // Real transaction and withdrawal data
  const userTransactions = useAppStatsStore(s => s.userTransactions);
  const userWithdrawals = useAppStatsStore(s => s.userWithdrawals);
  const requestWithdrawal = useAppStatsStore(s => s.requestWithdrawal);
  const loadUserTransactions = useAppStatsStore(s => s.loadUserTransactions);

  const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  // Mock linked accounts - in production, these would come from user's saved payment methods
  // This is a placeholder until payment integration is set up
  const [linkedAccounts] = useState<LinkedAccount[]>([]);

  // Load user transactions on mount
  useEffect(() => {
    if (user?.id) {
      loadUserTransactions(user.id);
    }
  }, [user?.id, loadUserTransactions]);

  const handleSelectMethod = (method: WithdrawMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMethod(method);
  };

  const handleAmountPreset = (preset: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (preset <= walletBalance) {
      setAmount(preset.toString());
    }
  };

  const handleWithdrawAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(walletBalance.toFixed(2));
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (withdrawAmount > walletBalance) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }

    if (withdrawAmount < 10) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Minimum Withdrawal', 'The minimum withdrawal amount is $10.');
      return;
    }

    if (linkedAccounts.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Payment Setup Required',
        'Withdrawal processing will be available once payment integration is configured. Please contact support or wait for the feature to be enabled.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Create real withdrawal request
    if (user?.id) {
      const defaultAccount = linkedAccounts.find(a => a.isDefault) || linkedAccounts[0];
      const result = await requestWithdrawal(
        user.id,
        withdrawAmount,
        defaultAccount.type === 'bank' ? 'Bank Transfer' : 'Card',
        `${defaultAccount.name} •••• ${defaultAccount.lastFour}`
      );

      if (result.success) {
        setPendingRequestId(result.requestId || null);
        setShowSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', result.error || 'Failed to process withdrawal');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    setIsProcessing(false);
  };

  const handleAddPaymentMethod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/payment-methods');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft size={20} color="#22C55E" />;
      case 'purchase':
        return <ArrowUpRight size={20} color="#FFD700" />;
      case 'win':
        return <ArrowDownLeft size={20} color="#22C55E" />;
      case 'withdrawal_request':
      case 'withdrawal_completed':
        return <ArrowUpRight size={20} color="#6B7C93" />;
      case 'withdrawal_failed':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <ArrowUpRight size={20} color="#6B7C93" />;
    }
  };

  const getWithdrawalStatusColor = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending':
        return '#FFD700';
      case 'processing':
        return '#3B82F6';
      case 'completed':
        return '#22C55E';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7C93';
    }
  };

  // Pending withdrawals count
  const pendingWithdrawals = userWithdrawals.filter(w => w.status === 'pending' || w.status === 'processing');

  // Unauthenticated view
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-20 h-20 rounded-full bg-[#FFD700]/20 items-center justify-center mb-6">
              <Wallet size={40} color="#FFD700" />
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-3">
              Withdraw Winnings
            </Text>
            <Text className="text-white/60 text-center mb-8">
              Sign in to withdraw your lottery winnings to your bank or card
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/sign-in');
              }}
              className="w-full py-4 rounded-2xl bg-[#FFD700] items-center active:opacity-90"
            >
              <Text className="text-[#0A1628] font-bold text-lg">Sign In</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Transaction History View
  if (showHistory) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-bold">Transaction History</Text>
              <Text className="text-white/50 text-sm mt-1">All your account activity</Text>
            </View>
            <Pressable
              onPress={() => setShowHistory(false)}
              className="bg-[#1E3A5F] px-4 py-2 rounded-xl active:opacity-70"
            >
              <Text className="text-white font-medium">Close</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Pending Withdrawals */}
            {pendingWithdrawals.length > 0 && (
              <View className="mt-4">
                <Text className="text-white/60 text-sm font-medium mb-3">Pending Withdrawals</Text>
                {pendingWithdrawals.map((withdrawal) => (
                  <View
                    key={withdrawal.id}
                    className="bg-[#1E3A5F]/30 rounded-xl p-4 mb-3 border border-[#2E4A6F]/50"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-[#FFD700]/20 items-center justify-center">
                          <Clock size={20} color="#FFD700" />
                        </View>
                        <View className="ml-3">
                          <Text className="text-white font-medium">
                            ${withdrawal.amount.toFixed(2)}
                          </Text>
                          <Text className="text-white/50 text-xs">{withdrawal.paymentDetails}</Text>
                        </View>
                      </View>
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${getWithdrawalStatusColor(withdrawal.status)}20` }}
                      >
                        <Text style={{ color: getWithdrawalStatusColor(withdrawal.status) }} className="text-xs font-medium capitalize">
                          {withdrawal.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-white/40 text-xs mt-2">
                      Requested: {formatDate(withdrawal.requestedAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Transaction List */}
            <View className="mt-4 mb-8">
              <Text className="text-white/60 text-sm font-medium mb-3">All Transactions</Text>
              {userTransactions.length === 0 ? (
                <View className="bg-[#1E3A5F]/20 rounded-xl p-8 items-center">
                  <History size={32} color="#6B7C93" />
                  <Text className="text-white/50 mt-3">No transactions yet</Text>
                </View>
              ) : (
                userTransactions.map((transaction) => (
                  <View
                    key={transaction.id}
                    className="bg-[#1E3A5F]/20 rounded-xl p-4 mb-2"
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-[#0A1628]/50 items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-white font-medium">{transaction.description}</Text>
                        <Text className="text-white/40 text-xs">{formatDate(transaction.timestamp)}</Text>
                      </View>
                      <Text className={`font-bold ${transaction.amount >= 0 ? 'text-green-500' : 'text-white'}`}>
                        {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Success view
  if (showSuccess) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <SafeAreaView className="flex-1 items-center justify-center px-8" edges={['top']}>
          <Animated.View entering={FadeInUp.delay(100)} className="items-center">
            <View className="w-24 h-24 rounded-full bg-green-500/20 items-center justify-center mb-6">
              <CheckCircle2 size={48} color="#22C55E" />
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-3">
              Withdrawal Requested
            </Text>
            <Text className="text-white/60 text-center mb-2">
              ${parseFloat(amount).toFixed(2)} withdrawal is being processed
            </Text>
            <View className="flex-row items-center mt-2">
              <Clock size={16} color="#6B7C93" />
              <Text className="text-white/40 text-sm ml-2">
                Expected: 1-3 business days
              </Text>
            </View>
            {pendingRequestId && (
              <Text className="text-white/30 text-xs mt-4">
                Request ID: {pendingRequestId.slice(0, 12)}...
              </Text>
            )}
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(400)} className="w-full mt-12">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSuccess(false);
                setAmount('');
                setSelectedMethod(null);
                setPendingRequestId(null);
              }}
              className="w-full py-4 rounded-2xl bg-[#1E3A5F] items-center active:opacity-90"
            >
              <Text className="text-white font-semibold">Done</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  const withdrawAmount = parseFloat(amount) || 0;
  const canWithdraw = withdrawAmount >= 10 && withdrawAmount <= walletBalance && linkedAccounts.length > 0;

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Withdraw</Text>
            <Text className="text-white/50 text-sm mt-1">Transfer funds to your account</Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHistory(true);
            }}
            className="bg-[#1E3A5F] p-3 rounded-xl active:opacity-70"
          >
            <History size={20} color="#FFD700" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <Animated.View entering={FadeInDown.delay(100)} className="px-6 mt-4">
            <LinearGradient
              colors={['#1E3A5F', '#0F2847']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 24 }}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white/60 text-sm">Available Balance</Text>
                  <Text className="text-white text-4xl font-bold mt-1">
                    ${walletBalance.toFixed(2)}
                  </Text>
                </View>
                <View className="w-14 h-14 rounded-2xl bg-[#FFD700]/20 items-center justify-center">
                  <Wallet size={28} color="#FFD700" />
                </View>
              </View>

              {/* Pending Withdrawals Notice */}
              {pendingWithdrawals.length > 0 && (
                <View className="mt-4 pt-4 border-t border-white/10 flex-row items-center">
                  <Clock size={16} color="#FFD700" />
                  <Text className="text-[#FFD700] text-sm ml-2">
                    {pendingWithdrawals.length} pending withdrawal{pendingWithdrawals.length > 1 ? 's' : ''}
                  </Text>
                  <Pressable
                    onPress={() => setShowHistory(true)}
                    className="ml-auto"
                  >
                    <Text className="text-white/50 text-sm">View</Text>
                  </Pressable>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Withdrawal Amount */}
          <Animated.View entering={FadeInDown.delay(200)} className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-3">
              Withdrawal Amount
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
              <View className="flex-row items-center">
                <Text className="text-white/50 text-3xl mr-2">$</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#6B7C93"
                  keyboardType="decimal-pad"
                  className="flex-1 text-white text-3xl font-bold"
                  style={{ fontSize: 32 }}
                />
                {walletBalance > 0 && (
                  <Pressable
                    onPress={handleWithdrawAll}
                    className="bg-[#FFD700]/20 px-3 py-2 rounded-xl active:opacity-70"
                  >
                    <Text className="text-[#FFD700] text-sm font-semibold">MAX</Text>
                  </Pressable>
                )}
              </View>

              {/* Quick amounts */}
              <View className="flex-row mt-4 gap-2">
                {[10, 25, 50, 100].map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => handleAmountPreset(preset)}
                    disabled={preset > walletBalance}
                    className={`flex-1 py-2 rounded-xl items-center ${
                      preset > walletBalance
                        ? 'bg-white/5 opacity-40'
                        : 'bg-[#0A1628]/50 active:opacity-70'
                    }`}
                  >
                    <Text className={`font-medium ${preset > walletBalance ? 'text-white/30' : 'text-white/70'}`}>
                      ${preset}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Minimum notice */}
            <View className="flex-row items-center mt-3 px-1">
              <AlertCircle size={14} color="#6B7C93" />
              <Text className="text-white/40 text-xs ml-2">
                Minimum withdrawal: $10.00
              </Text>
            </View>
          </Animated.View>

          {/* Withdrawal Method */}
          <Animated.View entering={FadeInDown.delay(300)} className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-3">
              Withdraw To
            </Text>

            {linkedAccounts.length === 0 ? (
              <Pressable
                onPress={handleAddPaymentMethod}
                className="bg-[#1E3A5F]/20 rounded-2xl p-6 border border-dashed border-[#FFD700]/30 items-center active:opacity-70"
              >
                <View className="w-12 h-12 rounded-full bg-[#FFD700]/10 items-center justify-center mb-3">
                  <Plus size={24} color="#FFD700" />
                </View>
                <Text className="text-white font-semibold mb-1">Add Payment Method</Text>
                <Text className="text-white/50 text-sm text-center">
                  Link a bank account or card to withdraw funds
                </Text>
              </Pressable>
            ) : (
              <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
                {linkedAccounts.map((account, index) => (
                  <Pressable
                    key={account.id}
                    onPress={() => handleSelectMethod(account.type)}
                    className="p-4 active:bg-white/5"
                  >
                    {index > 0 && <View className="h-px bg-white/5 -mt-4 mb-4 -mx-4" />}
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-xl bg-[#0A1628]/50 items-center justify-center mr-4">
                        {account.type === 'bank' ? (
                          <Building2 size={24} color="#FFD700" />
                        ) : (
                          <CreditCard size={24} color="#FFD700" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-medium">{account.name}</Text>
                        <Text className="text-white/50 text-sm">•••• {account.lastFour}</Text>
                      </View>
                      {account.isDefault && (
                        <View className="bg-green-500/20 px-2 py-1 rounded-lg mr-2">
                          <Text className="text-green-500 text-xs">Default</Text>
                        </View>
                      )}
                      <ChevronRight size={20} color="#6B7C93" />
                    </View>
                  </Pressable>
                ))}

                <Pressable
                  onPress={handleAddPaymentMethod}
                  className="p-4 flex-row items-center active:bg-white/5 border-t border-white/5"
                >
                  <View className="w-12 h-12 rounded-xl bg-[#FFD700]/10 items-center justify-center mr-4">
                    <Plus size={24} color="#FFD700" />
                  </View>
                  <Text className="text-[#FFD700] font-medium">Add New Method</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Processing Time */}
          <Animated.View entering={FadeInDown.delay(400)} className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4 flex-row items-center">
              <Clock size={18} color="#6B7C93" />
              <Text className="text-white/40 text-sm ml-3 flex-1">
                Withdrawals typically take 1-3 business days
              </Text>
            </View>
          </Animated.View>

          {/* Recent Transactions Quick View */}
          {userTransactions.length > 0 && (
            <Animated.View entering={FadeInDown.delay(500)} className="px-6 mt-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white/60 text-sm font-medium">Recent Activity</Text>
                <Pressable onPress={() => setShowHistory(true)}>
                  <Text className="text-[#FFD700] text-sm">See All</Text>
                </Pressable>
              </View>
              <View className="bg-[#1E3A5F]/20 rounded-xl">
                {userTransactions.slice(0, 3).map((transaction, index) => (
                  <View
                    key={transaction.id}
                    className={`p-4 flex-row items-center ${index > 0 ? 'border-t border-white/5' : ''}`}
                  >
                    <View className="w-8 h-8 rounded-full bg-[#0A1628]/50 items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-white text-sm" numberOfLines={1}>{transaction.description}</Text>
                      <Text className="text-white/40 text-xs">{formatDate(transaction.timestamp)}</Text>
                    </View>
                    <Text className={`font-medium ${transaction.amount >= 0 ? 'text-green-500' : 'text-white'}`}>
                      {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Withdraw Button */}
        <View className="px-6 pb-6 pt-4 border-t border-white/5">
          <Pressable
            onPress={handleWithdraw}
            disabled={!canWithdraw || isProcessing}
            className={`py-4 rounded-2xl items-center ${
              canWithdraw && !isProcessing
                ? 'bg-[#FFD700] active:opacity-90'
                : 'bg-[#FFD700]/30'
            }`}
          >
            {isProcessing ? (
              <Text className="text-[#0A1628]/50 font-bold text-lg">Processing...</Text>
            ) : (
              <Text className={`font-bold text-lg ${canWithdraw ? 'text-[#0A1628]' : 'text-[#0A1628]/50'}`}>
                {withdrawAmount > 0 ? `Withdraw $${withdrawAmount.toFixed(2)}` : 'Enter Amount'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
