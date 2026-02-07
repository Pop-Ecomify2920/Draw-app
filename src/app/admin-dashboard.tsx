import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, Users, CreditCard, Ticket, Trophy, DollarSign, TrendingUp, ChevronRight, Settings, FileText } from 'lucide-react-native';
import { useUserProfile } from '@/lib/hooks';
import * as Haptics from 'expo-haptics';

const StatCard = ({ icon: Icon, label, value, color = '#FFD700' }: { icon: any; label: string; value: string | number; color?: string }) => (
  <View className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F]">
    <View className="flex-row items-center mb-2">
      <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: color + '20' }}>
        <Icon size={16} color={color} />
      </View>
      <Text className="text-white/60 text-xs ml-2">{label}</Text>
    </View>
    <Text className="text-white font-bold text-lg">{typeof value === 'number' ? value.toLocaleString() : value}</Text>
  </View>
);

const AdminMenuItem = ({ 
  icon: Icon, 
  title, 
  description, 
  onPress, 
  color = '#FFD700' 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  onPress: () => void; 
  color?: string;
}) => (
  <Pressable
    onPress={onPress}
    className="bg-[#1E3A5F]/60 rounded-xl p-4 border border-[#2E4A6F] mb-3 active:bg-[#1E3A5F]/80"
  >
    <View className="flex-row items-center">
      <View className="w-10 h-10 rounded-lg items-center justify-center" style={{ backgroundColor: color + '20' }}>
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-white font-semibold text-base">{title}</Text>
        <Text className="text-white/60 text-xs mt-0.5">{description}</Text>
      </View>
      <ChevronRight size={20} color="#FFD700" />
    </View>
  </Pressable>
);

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useUserProfile();
  const stats = profile?.adminStats;

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const navigateTo = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path as any);
  };

  if (isLoading && !stats) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
        <Text className="text-white/60 mt-4">Loading admin panel...</Text>
      </View>
    );
  }

  const errorMsg = isError ? (error instanceof Error ? error.message : 'Failed to load') : (!profile?.isAdmin && !stats ? 'Admin access required' : '');

  return (
    <View className="flex-1 bg-[#0A1628]">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center px-4 py-3 border-b border-[#2E4A6F]">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#FFD700" />
          </Pressable>
          <Text className="text-white font-bold text-xl ml-2">Admin Control Panel</Text>
        </View>

        <ScrollView
          className="flex-1 px-4 py-4"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FFD700" />
          }
        >
          {errorMsg ? (
            <View className="bg-red-500/20 rounded-xl p-4 mb-4 border border-red-500/40">
              <Text className="text-red-400">{errorMsg}</Text>
            </View>
          ) : stats ? (
            <>
              {/* Quick Stats Overview */}
              <Text className="text-[#FFD700] font-semibold text-sm mb-3">Platform Overview</Text>
              <View className="flex-row flex-wrap -mx-1 mb-6">
                <View className="w-1/2 px-1 mb-2">
                  <StatCard icon={DollarSign} label="Total Deposits" value={`$${Number(stats.overview?.totalDeposits ?? 0).toFixed(2)}`} color="#22C55E" />
                </View>
                <View className="w-1/2 px-1 mb-2">
                  <StatCard icon={Users} label="Total Users" value={stats.overview?.totalUsers ?? 0} color="#3B82F6" />
                </View>
                <View className="w-1/2 px-1 mb-2">
                  <StatCard icon={Ticket} label="Ticket Sales" value={stats.overview?.totalTicketPurchases ?? 0} color="#FFD700" />
                </View>
                <View className="w-1/2 px-1 mb-2">
                  <StatCard icon={TrendingUp} label="Net Revenue" value={`$${Number(stats.overview?.netRevenue ?? 0).toFixed(2)}`} color="#A855F7" />
                </View>
              </View>

              {/* Admin Controls */}
              <Text className="text-[#FFD700] font-semibold text-sm mb-3">Admin Controls</Text>
              
              <AdminMenuItem
                icon={Users}
                title="User Management"
                description="View all users, suspend accounts, adjust balances"
                onPress={() => navigateTo('/admin-users')}
                color="#3B82F6"
              />
              
              <AdminMenuItem
                icon={Trophy}
                title="Draw Management"
                description="Monitor draws, view results, trigger manual draws"
                onPress={() => navigateTo('/admin-draws')}
                color="#A855F7"
              />
              
              <AdminMenuItem
                icon={FileText}
                title="Transaction Monitoring"
                description="View all transactions, export reports"
                onPress={() => navigateTo('/admin-transactions')}
                color="#22C55E"
              />
              
              <AdminMenuItem
                icon={BarChart3}
                title="Lobby Management"
                description="Monitor all lobbies and room activity"
                onPress={() => navigateTo('/admin-lobbies')}
                color="#06B6D4"
              />

              <Text className="text-white/40 text-xs mt-6 text-center">
                Admin access • ollie.bryant08@icloud.com
              </Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
