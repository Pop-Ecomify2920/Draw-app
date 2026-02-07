import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, UserCheck, UserX, DollarSign, TrendingUp, TrendingDown, Calendar, Mail, Shield } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '@/lib/api/admin';
import * as Haptics from 'expo-haptics';

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const queryClient = useQueryClient();

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      const response = await AdminService.getUserDetails(userId!);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load user details');
      }
      return response.data!;
    },
    enabled: !!userId,
  });

  const suspendMutation = useMutation({
    mutationFn: () => AdminService.suspendUser(userId!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'User suspended successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to suspend user');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => AdminService.reactivateUser(userId!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'User reactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to reactivate user');
    },
  });

  const balanceMutation = useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      AdminService.adjustBalance({ userId: userId!, amount: data.amount, reason: data.reason }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Balance adjusted successfully');
      setShowBalanceModal(false);
      setBalanceAmount('');
      setBalanceReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to adjust balance');
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSuspend = () => {
    Alert.alert(
      'Suspend User',
      'Are you sure you want to suspend this user? They will not be able to access their account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: () => suspendMutation.mutate(),
        },
      ]
    );
  };

  const handleReactivate = () => {
    Alert.alert(
      'Reactivate User',
      'Are you sure you want to reactivate this user? They will regain full access to their account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: () => reactivateMutation.mutate(),
        },
      ]
    );
  };

  const handleBalanceAdjust = () => {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!balanceReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the adjustment');
      return;
    }
    balanceMutation.mutate({ amount, reason: balanceReason });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
        <Text className="text-white/60 mt-4">Loading user details...</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="flex-row items-center px-4 py-3 border-b border-[#2E4A6F]">
            <Pressable onPress={handleBack} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#FFD700" />
            </Pressable>
            <Text className="text-white font-bold text-xl ml-2">User Details</Text>
          </View>
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-red-400">{error instanceof Error ? error.message : 'Failed to load user'}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const user = data.user;
  const transactions = data.transactions || [];

  return (
    <View className="flex-1 bg-[#0A1628]">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-[#2E4A6F]">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#FFD700" />
          </Pressable>
          <Text className="text-white font-bold text-xl ml-2">User Details</Text>
        </View>

        <ScrollView
          className="flex-1 px-4 py-4"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FFD700" />
          }
        >
          {/* User Info Card */}
          <View className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-4">
            <View className="flex-row items-center mb-3">
              <Text className="text-white font-bold text-lg">{user.username}</Text>
              {user.isAdmin && (
                <View className="bg-[#FFD700]/20 rounded px-2 py-1 ml-2">
                  <Text className="text-[#FFD700] text-xs font-semibold">ADMIN</Text>
                </View>
              )}
              {!user.isActive && (
                <View className="bg-red-500/20 rounded px-2 py-1 ml-2">
                  <Text className="text-red-400 text-xs font-semibold">SUSPENDED</Text>
                </View>
              )}
            </View>

            <View className="space-y-2">
              <View className="flex-row items-center py-2">
                <Mail size={16} color="#FFD700" />
                <Text className="text-white/80 ml-2">{user.email}</Text>
              </View>
              <View className="flex-row items-center py-2">
                <Calendar size={16} color="#FFD700" />
                <Text className="text-white/80 ml-2">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row items-center py-2">
                <DollarSign size={16} color="#22C55E" />
                <Text className="text-white/80 ml-2">
                  Balance: ${Number(user.balance).toFixed(2)}
                </Text>
              </View>
              {user.pendingBalance > 0 && (
                <View className="flex-row items-center py-2">
                  <DollarSign size={16} color="#FCD34D" />
                  <Text className="text-white/80 ml-2">
                    Pending: ${Number(user.pendingBalance).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Admin Actions */}
          <Text className="text-[#FFD700] font-semibold text-sm mb-3">Admin Actions</Text>
          <View className="mb-4">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowBalanceModal(true);
              }}
              className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-3 active:bg-[#1E3A5F]/80"
            >
              <View className="flex-row items-center">
                <DollarSign size={20} color="#FFD700" />
                <Text className="text-white font-semibold ml-3">Adjust Balance</Text>
              </View>
            </Pressable>

            {user.isActive ? (
              <Pressable
                onPress={handleSuspend}
                disabled={suspendMutation.isPending}
                className="bg-red-500/20 rounded-xl p-4 border border-red-500/40 active:bg-red-500/30"
              >
                <View className="flex-row items-center">
                  <UserX size={20} color="#EF4444" />
                  <Text className="text-red-400 font-semibold ml-3">
                    {suspendMutation.isPending ? 'Suspending...' : 'Suspend Account'}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="bg-green-500/20 rounded-xl p-4 border border-green-500/40 active:bg-green-500/30"
              >
                <View className="flex-row items-center">
                  <UserCheck size={20} color="#22C55E" />
                  <Text className="text-green-400 font-semibold ml-3">
                    {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Account'}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Transaction History */}
          <Text className="text-[#FFD700] font-semibold text-sm mb-3">Recent Transactions</Text>
          {transactions.length > 0 ? (
            <View className="mb-4">
              {transactions.slice(0, 10).map((tx) => (
                <View
                  key={tx.id}
                  className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-2"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-white font-semibold capitalize">
                      {tx.type.replace(/_/g, ' ')}
                    </Text>
                    <Text
                      className={`font-semibold ${
                        tx.type === 'deposit' || tx.type === 'prize_win'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {tx.type === 'deposit' || tx.type === 'prize_win' ? '+' : '-'}$
                      {Number(tx.amount).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white/60 text-xs capitalize">{tx.status}</Text>
                    <Text className="text-white/60 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-[#1E3A5F]/30 rounded-xl p-4 mb-4">
              <Text className="text-white/60 text-center">No transactions found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Balance Adjustment Modal */}
      <Modal visible={showBalanceModal} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/70 justify-center px-4"
          onPress={() => setShowBalanceModal(false)}
        >
          <Pressable
            className="bg-[#0A1628] rounded-2xl border border-[#2E4A6F] p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-white font-bold text-xl mb-4">Adjust Balance</Text>

            <Text className="text-white/60 text-sm mb-2">Amount (use + or -)</Text>
            <TextInput
              value={balanceAmount}
              onChangeText={setBalanceAmount}
              placeholder="e.g., +50.00 or -25.00"
              placeholderTextColor="#ffffff40"
              keyboardType="numeric"
              className="bg-[#1E3A5F]/60 rounded-xl px-4 py-3 text-white border border-[#2E4A6F] mb-4"
            />

            <Text className="text-white/60 text-sm mb-2">Reason</Text>
            <TextInput
              value={balanceReason}
              onChangeText={setBalanceReason}
              placeholder="e.g., Manual adjustment, refund, bonus"
              placeholderTextColor="#ffffff40"
              multiline
              numberOfLines={3}
              className="bg-[#1E3A5F]/60 rounded-xl px-4 py-3 text-white border border-[#2E4A6F] mb-4"
              style={{ textAlignVertical: 'top' }}
            />

            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setShowBalanceModal(false)}
                className="flex-1 bg-[#1E3A5F]/60 rounded-xl py-3 active:bg-[#1E3A5F]/80"
              >
                <Text className="text-white text-center font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleBalanceAdjust}
                disabled={balanceMutation.isPending}
                className="flex-1 bg-[#FFD700] rounded-xl py-3 active:bg-[#FFC700]"
              >
                <Text className="text-[#0A1628] text-center font-semibold">
                  {balanceMutation.isPending ? 'Adjusting...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
