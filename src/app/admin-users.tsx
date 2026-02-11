import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, UserCheck, UserX, DollarSign, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { AdminService, type AdminUser } from '@/lib/api/admin';
import * as Haptics from 'expo-haptics';

const UserCard = ({ user, onPress }: { user: AdminUser; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-3 active:bg-[#1E3A5F]/80"
  >
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-semibold text-base">{user.username}</Text>
          {user.isAdmin && (
            <View className="bg-[#FFD700]/20 rounded px-2 py-0.5 ml-2">
              <Text className="text-[#FFD700] text-xs font-semibold">ADMIN</Text>
            </View>
          )}
          {!user.isActive && (
            <View className="bg-red-500/20 rounded px-2 py-0.5 ml-2">
              <Text className="text-red-400 text-xs font-semibold">SUSPENDED</Text>
            </View>
          )}
        </View>
        <Text className="text-white/60 text-sm mb-2">{user.email}</Text>
        <View className="flex-row items-center">
          <View className="flex-row items-center mr-4">
            <DollarSign size={14} color="#22C55E" />
            <Text className="text-white/80 text-sm ml-1">${Number(user.balance).toFixed(2)}</Text>
          </View>
          <Text className="text-white/40 text-xs">
            ID: {user.id.slice(0, 8)}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} color="#FFD700" />
    </View>
  </Pressable>
);

export default function AdminUsersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const response = await AdminService.getUsers({
        page,
        limit: 20,
        search: search || undefined,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to load users');
      }
      return response.data!;
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/admin-user-detail?userId=${userId}` as any);
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
          <Text className="text-white font-bold text-xl ml-2">User Management</Text>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-3 border-b border-[#2E4A6F]">
          <View className="bg-[#1E3A5F]/60 rounded-xl px-4 py-3 flex-row items-center border border-[#2E4A6F]">
            <Search size={20} color="#FFD700" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by username or email..."
              placeholderTextColor="#ffffff60"
              className="flex-1 text-white ml-2"
            />
          </View>
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
              <Text className="text-white/60 mt-4">Loading users...</Text>
            </View>
          ) : isError ? (
            <View className="bg-red-500/20 rounded-xl p-4 border border-red-500/40">
              <Text className="text-red-400">{error instanceof Error ? error.message : 'Failed to load users'}</Text>
            </View>
          ) : data?.users && data.users.length > 0 ? (
            <>
              <View className="mb-3">
                <Text className="text-white/60 text-sm">
                  Showing {data.users.length} of {data.total} users
                </Text>
              </View>
              {data.users.map((user) => (
                <UserCard key={user.id} user={user} onPress={() => handleUserPress(user.id)} />
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
                    className={`px-4 py-2 rounded-lg mr-2 ${page === 1 ? 'bg-[#1E3A5F]/30' : 'bg-[#1E3A5F]/60'}`}
                  >
                    <Text className={page === 1 ? 'text-white/30' : 'text-white'}>Previous</Text>
                  </Pressable>
                  <Text className="text-white mx-4">Page {page} of {Math.ceil(data.total / data.limit)}</Text>
                  <Pressable
                    onPress={() => {
                      if (page < Math.ceil(data.total / data.limit)) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPage(page + 1);
                      }
                    }}
                    disabled={page >= Math.ceil(data.total / data.limit)}
                    className={`px-4 py-2 rounded-lg ml-2 ${page >= Math.ceil(data.total / data.limit) ? 'bg-[#1E3A5F]/30' : 'bg-[#1E3A5F]/60'}`}
                  >
                    <Text className={page >= Math.ceil(data.total / data.limit) ? 'text-white/30' : 'text-white'}>Next</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-white/60">No users found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
