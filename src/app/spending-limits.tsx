import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useUserProfile, useUpdateResponsiblePlay } from '@/lib/hooks';
import { isApiConfigured } from '@/lib/api';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Check,
  AlertTriangle,
} from 'lucide-react-native';

type LimitPeriod = 'daily' | 'weekly' | 'monthly';

interface SpendingLimit {
  period: LimitPeriod;
  amount: number | null;
  spent: number;
}

export default function SpendingLimitsScreen() {
  const router = useRouter();
  const { data: profile } = useUserProfile();
  const updateResponsiblePlay = useUpdateResponsiblePlay();
  const [limits, setLimits] = useState<SpendingLimit[]>([
    { period: 'daily', amount: 1, spent: 0 },
    { period: 'weekly', amount: 7, spent: 3 },
    { period: 'monthly', amount: 30, spent: 12 },
  ]);
  const [editingPeriod, setEditingPeriod] = useState<LimitPeriod | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (profile && isApiConfigured()) {
      const daily = (profile as any).spendingLimitDaily ?? profile?.spendingLimitDaily;
      const monthly = (profile as any).spendingLimitMonthly ?? profile?.spendingLimitMonthly;
      setLimits(prev => prev.map(l => ({
        ...l,
        amount: l.period === 'daily' ? (daily ?? l.amount) : l.period === 'monthly' ? (monthly ?? l.amount) : l.amount,
      })));
    }
  }, [profile]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const getPeriodLabel = (period: LimitPeriod) => {
    switch (period) {
      case 'daily':
        return 'Daily Limit';
      case 'weekly':
        return 'Weekly Limit';
      case 'monthly':
        return 'Monthly Limit';
    }
  };

  const getPeriodDescription = (period: LimitPeriod) => {
    switch (period) {
      case 'daily':
        return 'Maximum $1/day (enforced)';
      case 'weekly':
        return 'Resets every Monday';
      case 'monthly':
        return 'Resets on the 1st';
    }
  };

  const handleEdit = (period: LimitPeriod, currentAmount: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPeriod(period);
    setEditValue(currentAmount?.toString() ?? '');
  };

  const handleSave = async () => {
    const period = editingPeriod;
    if (!period) return;

    const newAmount = parseInt(editValue) || null;
    setLimits(l =>
      l.map(limit =>
        limit.period === period ? { ...limit, amount: newAmount } : limit
      )
    );
    setEditingPeriod(null);
    setEditValue('');

    if (isApiConfigured()) {
      try {
        if (period === 'daily') {
          await updateResponsiblePlay.mutateAsync({ spendingLimitDaily: newAmount });
        } else if (period === 'monthly') {
          await updateResponsiblePlay.mutateAsync({ spendingLimitMonthly: newAmount });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        setLimits(l =>
          l.map(limit =>
            limit.period === period ? { ...limit, amount: limit.amount } : limit
          )
        );
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <Text className="text-white text-xl font-bold flex-1">Spending Limits</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View className="px-6 mb-6">
            <View className="bg-[#22C55E]/10 rounded-2xl p-5 border border-[#22C55E]/30">
              <View className="flex-row items-start">
                <DollarSign size={24} color="#22C55E" />
                <View className="ml-4 flex-1">
                  <Text className="text-[#22C55E] font-semibold text-lg">Stay in Control</Text>
                  <Text className="text-white/70 text-sm mt-2">
                    Set spending limits to help manage your lottery budget. Daily limit is enforced at $1 maximum per ticket.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Limits */}
          <View className="px-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Your Limits
            </Text>
            {limits.map((limit) => (
              <View
                key={limit.period}
                className="bg-[#1E3A5F]/20 rounded-2xl p-4 mb-3 border border-[#2E4A6F]/30"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-3">
                      <Calendar size={20} color="#FFD700" />
                    </View>
                    <View>
                      <Text className="text-white font-semibold">{getPeriodLabel(limit.period)}</Text>
                      <Text className="text-white/50 text-xs">{getPeriodDescription(limit.period)}</Text>
                    </View>
                  </View>
                  {limit.period !== 'daily' && (
                    <Pressable
                      onPress={() => handleEdit(limit.period, limit.amount)}
                      className="active:opacity-70"
                    >
                      <Text className="text-[#FFD700] text-sm font-medium">Edit</Text>
                    </Pressable>
                  )}
                </View>

                {/* Progress */}
                <View className="bg-[#0A1628] rounded-xl p-3">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-white/60 text-sm">Spent</Text>
                    <Text className="text-white font-semibold">
                      ${limit.spent} / ${limit.amount ?? '∞'}
                    </Text>
                  </View>
                  <View className="h-2 bg-[#2E4A6F] rounded-full overflow-hidden">
                    <View
                      className="h-full bg-[#FFD700] rounded-full"
                      style={{
                        width: limit.amount ? `${Math.min((limit.spent / limit.amount) * 100, 100)}%` : '0%',
                      }}
                    />
                  </View>
                  {limit.amount && limit.spent >= limit.amount * 0.8 && (
                    <View className="flex-row items-center mt-2">
                      <AlertTriangle size={14} color="#FFA500" />
                      <Text className="text-[#FFA500] text-xs ml-1">
                        Approaching limit
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Edit Modal */}
          {editingPeriod && (
            <View className="px-6 mt-4">
              <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
                <Text className="text-white font-semibold mb-4">
                  Set {getPeriodLabel(editingPeriod)}
                </Text>
                <View className="flex-row items-center bg-[#0A1628] rounded-xl px-4 mb-4">
                  <Text className="text-white/50 text-xl mr-2">$</Text>
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder="Enter amount"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-3 text-white text-xl"
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                <View className="flex-row">
                  <Pressable
                    onPress={() => {
                      setEditingPeriod(null);
                      setEditValue('');
                    }}
                    className="flex-1 mr-2 active:opacity-80"
                  >
                    <View className="bg-[#2E4A6F] rounded-xl py-3 items-center">
                      <Text className="text-white font-semibold">Cancel</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    className="flex-1 ml-2 active:opacity-80"
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={{ borderRadius: 12 }}
                    >
                      <View className="py-3 items-center flex-row justify-center">
                        <Check size={18} color="#0A1628" />
                        <Text className="text-[#0A1628] font-semibold ml-2">Save</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Info */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4">
              <Text className="text-white/40 text-xs text-center">
                Changes to spending limits take effect immediately.
                {'\n'}Limits cannot be increased for 24 hours after being set.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
