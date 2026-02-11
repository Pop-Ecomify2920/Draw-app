import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { AdminService, type AdminTransaction } from '@/lib/api/admin';
import * as Haptics from 'expo-haptics';

const TransactionCard = ({ transaction }: { transaction: AdminTransaction }) => {
  const isCredit = transaction.type === 'deposit' || transaction.type === 'prize_win';
  const statusColor =
    transaction.status === 'completed'
      ? '#22C55E'
      : transaction.status === 'pending'
      ? '#FFD700'
      : transaction.status === 'failed'
      ? '#EF4444'
      : '#6B7280';

  return (
    <View className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            {isCredit ? (
              <TrendingUp size={16} color="#22C55E" />
            ) : (
              <TrendingDown size={16} color="#EF4444" />
            )}
            <Text className="text-white font-semibold ml-2 capitalize">
              {transaction.type.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text className="text-white/60 text-sm">{transaction.username}</Text>
        </View>
        <View className="items-end">
          <Text
            className={`font-bold text-lg ${isCredit ? 'text-green-400' : 'text-red-400'}`}
          >
            {isCredit ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
          </Text>
          <View
            className="px-2 py-0.5 rounded mt-1"
            style={{ backgroundColor: statusColor + '20' }}
          >
            <Text className="text-xs font-semibold uppercase" style={{ color: statusColor }}>
              {transaction.status}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-[#2E4A6F]">
        <Text className="text-white/40 text-xs">
          ID: {transaction.id.slice(0, 8)}...
        </Text>
        <View className="flex-row items-center">
          <Calendar size={12} color="#FFD700" />
          <Text className="text-white/40 text-xs ml-1">
            {new Date(transaction.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function AdminTransactionsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-transactions', page, filterType, filterStatus],
    queryFn: async () => {
      const response = await AdminService.getTransactions({
        page,
        limit: 20,
        type: filterType || undefined,
        status: filterStatus || undefined,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load transactions');
      }
      return response.data!;
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Export Transactions',
      'Export functionality will download transaction data as CSV/JSON. This feature requires additional implementation.',
      [{ text: 'OK' }]
    );
    // In production: call AdminService.exportTransactions() and handle file download
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const transactionTypes = ['', 'deposit', 'withdrawal', 'ticket_purchase', 'prize_win'];
  const statuses = ['', 'completed', 'pending', 'failed'];

  return (
    <View className="flex-1 bg-[#0A1628]">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-[#2E4A6F]">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#FFD700" />
          </Pressable>
          <Text className="text-white font-bold text-xl ml-2 flex-1">Transactions</Text>
          <Pressable
            onPress={handleExport}
            className="bg-[#FFD700]/20 rounded-xl px-3 py-2 active:bg-[#FFD700]/30"
          >
            <View className="flex-row items-center">
              <Download size={16} color="#FFD700" />
              <Text className="text-[#FFD700] font-semibold ml-1">Export</Text>
            </View>
          </Pressable>
        </View>

        {/* Type Filter */}
        <View className="px-4 py-2 border-b border-[#2E4A6F]">
          <Text className="text-white/60 text-xs mb-2">Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {transactionTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterType(type);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg ${
                    filterType === type
                      ? 'bg-[#FFD700]'
                      : 'bg-[#1E3A5F]/60 border border-[#2E4A6F]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      filterType === type ? 'text-[#0A1628]' : 'text-white'
                    }`}
                  >
                    {type ? type.replace(/_/g, ' ').toUpperCase() : 'ALL'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Status Filter */}
        <View className="px-4 py-2 border-b border-[#2E4A6F]">
          <Text className="text-white/60 text-xs mb-2">Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {statuses.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterStatus(status);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg ${
                    filterStatus === status
                      ? 'bg-[#FFD700]'
                      : 'bg-[#1E3A5F]/60 border border-[#2E4A6F]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      filterStatus === status ? 'text-[#0A1628]' : 'text-white'
                    }`}
                  >
                    {status ? status.toUpperCase() : 'ALL'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-4 py-4"
          // refreshControl={
          //   <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FFD700" />
          // }
        >
          {isLoading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator size="large" color="#FFD700" />
              <Text className="text-white/60 mt-4">Loading transactions...</Text>
            </View>
          ) : isError ? (
            <View className="bg-red-500/20 rounded-xl p-4 border border-red-500/40">
              <Text className="text-red-400">
                {error instanceof Error ? error.message : 'Failed to load transactions'}
              </Text>
            </View>
          ) : data?.transactions && data.transactions.length > 0 ? (
            <>
              <View className="mb-3">
                <Text className="text-white/60 text-sm">
                  Showing {data.transactions.length} of {data.total} transactions
                </Text>
              </View>
              {data.transactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}

              {/* Pagination */}
              {data.total > data.limit && (
                <View className="flex-row justify-center items-center mt-4 mb-6">
                  <Pressable
                    onPress={() => {
                      if (page > 1) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPage(page - 1);
                      }
                    }}
                    disabled={page === 1}
                    className={`px-4 py-2 rounded-lg mr-2 ${
                      page === 1 ? 'bg-[#1E3A5F]/30' : 'bg-[#1E3A5F]/60'
                    }`}
                  >
                    <Text className={page === 1 ? 'text-white/30' : 'text-white'}>Previous</Text>
                  </Pressable>
                  <Text className="text-white mx-4">
                    Page {page} of {Math.ceil(data.total / data.limit)}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (page < Math.ceil(data.total / data.limit)) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPage(page + 1);
                      }
                    }}
                    disabled={page >= Math.ceil(data.total / data.limit)}
                    className={`px-4 py-2 rounded-lg ml-2 ${
                      page >= Math.ceil(data.total / data.limit)
                        ? 'bg-[#1E3A5F]/30'
                        : 'bg-[#1E3A5F]/60'
                    }`}
                  >
                    <Text
                      className={
                        page >= Math.ceil(data.total / data.limit) ? 'text-white/30' : 'text-white'
                      }
                    >
                      Next
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-white/60">No transactions found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
