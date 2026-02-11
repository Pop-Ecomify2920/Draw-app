import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trophy, Users, DollarSign, Calendar, Play } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService, type AdminDraw } from '@/lib/api/admin';
import * as Haptics from 'expo-haptics';

const DrawCard = ({ draw, onTrigger }: { draw: AdminDraw; onTrigger?: () => void }) => {
  const statusColor =
    draw.status === 'drawn'
      ? '#22C55E'
      : draw.status === 'open'
      ? '#FFD700'
      : '#6B7280';

  return (
    <View className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Trophy size={16} color="#FFD700" />
            <Text className="text-white font-semibold text-base ml-2">
              {new Date(draw.drawDate).toLocaleDateString()}
            </Text>
          </View>
          <View
            className="self-start px-2 py-0.5 rounded"
            style={{ backgroundColor: statusColor + '20' }}
          >
            <Text className="text-xs font-semibold uppercase" style={{ color: statusColor }}>
              {draw.status}
            </Text>
          </View>
        </View>
        {draw.status === 'open' && onTrigger && (
          <Pressable
            onPress={onTrigger}
            className="bg-[#FFD700]/20 rounded-xl px-4 py-2 active:bg-[#FFD700]/30"
          >
            <View className="flex-row items-center">
              <Play size={16} color="#FFD700" />
              <Text className="text-[#FFD700] font-semibold ml-1">Trigger</Text>
            </View>
          </Pressable>
        )}
      </View>

      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text className="text-white/60 text-xs mb-1">Prize Pool</Text>
          <View className="flex-row items-center">
            <DollarSign size={14} color="#22C55E" />
            <Text className="text-white font-semibold ml-1">
              ${Number(draw.prizePool).toFixed(2)}
            </Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-white/60 text-xs mb-1">Tickets</Text>
          <View className="flex-row items-center">
            <Users size={14} color="#3B82F6" />
            <Text className="text-white font-semibold ml-1">{draw.ticketCount}</Text>
          </View>
        </View>
        {draw.winnerId && (
          <View className="flex-1">
            <Text className="text-white/60 text-xs mb-1">Winner</Text>
            <Text className="text-[#FFD700] font-semibold" numberOfLines={1}>
              {draw.winnerUsername || 'Unknown'}
            </Text>
          </View>
        )}
      </View>

      {draw.drawnAt && (
        <View className="mt-3 pt-3 border-t border-[#2E4A6F]">
          <Text className="text-white/40 text-xs">
            Drawn: {new Date(draw.drawnAt).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function AdminDrawsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-draws', page, filterStatus],
    queryFn: async () => {
      const response = await AdminService.getDraws({
        page,
        limit: 20,
        status: filterStatus || undefined,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load draws');
      }
      return response.data!;
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (drawId: string) => AdminService.triggerDraw(drawId),
    onSuccess: (response) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const winner = response.data?.winner;
      Alert.alert(
        'Draw Complete',
        winner
          ? `Winner: ${winner.username}\nTicket: ${winner.ticketId.slice(0, 8)}...`
          : 'Draw completed successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to trigger draw');
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleTriggerDraw = (drawId: string, drawDate: string) => {
    Alert.alert(
      'Trigger Draw',
      `Are you sure you want to manually trigger the draw for ${new Date(
        drawDate
      ).toLocaleDateString()}? This will select a winner immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trigger',
          onPress: () => triggerMutation.mutate(drawId),
        },
      ]
    );
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-[#2E4A6F]">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#FFD700" />
          </Pressable>
          <Text className="text-white font-bold text-xl ml-2">Draw Management</Text>
        </View>

        {/* Filters */}
        <View className="px-4 py-3 border-b border-[#2E4A6F]">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {['', 'open', 'drawn', 'cancelled'].map((status) => (
                <Pressable
                  key={status}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterStatus(status);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl ${
                    filterStatus === status
                      ? 'bg-[#FFD700]'
                      : 'bg-[#1E3A5F]/60 border border-[#2E4A6F]'
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      filterStatus === status ? 'text-[#0A1628]' : 'text-white'
                    }`}
                  >
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
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
              <Text className="text-white/60 mt-4">Loading draws...</Text>
            </View>
          ) : isError ? (
            <View className="bg-red-500/20 rounded-xl p-4 border border-red-500/40">
              <Text className="text-red-400">
                {error instanceof Error ? error.message : 'Failed to load draws'}
              </Text>
            </View>
          ) : data?.draws && data.draws.length > 0 ? (
            <>
              <View className="mb-3">
                <Text className="text-white/60 text-sm">
                  Showing {data.draws.length} of {data.total} draws
                </Text>
              </View>
              {data.draws.map((draw) => (
                <DrawCard
                  key={draw.id}
                  draw={draw}
                  onTrigger={
                    draw.status === 'open' && draw.ticketCount > 0
                      ? () => handleTriggerDraw(draw.id, draw.drawDate)
                      : undefined
                  }
                />
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
              <Text className="text-white/60">No draws found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
