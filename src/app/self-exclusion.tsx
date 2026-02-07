import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Clock,
  CalendarX,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { useUpdateResponsiblePlay } from '@/lib/hooks';
import { isApiConfigured } from '@/lib/api';

type ExclusionPeriod = '24h' | '7d' | '30d' | '6m' | 'permanent';

interface ExclusionOption {
  id: ExclusionPeriod;
  label: string;
  description: string;
}

const exclusionOptions: ExclusionOption[] = [
  { id: '24h', label: '24 Hours', description: 'Take a short break' },
  { id: '7d', label: '7 Days', description: 'One week cooldown' },
  { id: '30d', label: '30 Days', description: 'One month break' },
  { id: '6m', label: '6 Months', description: 'Extended break' },
  { id: 'permanent', label: 'Permanent', description: 'Close account permanently' },
];

export default function SelfExclusionScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const updateResponsiblePlay = useUpdateResponsiblePlay();
  const [selectedPeriod, setSelectedPeriod] = useState<ExclusionPeriod | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Calculate end date based on period
  const getEndDate = (period: ExclusionPeriod): Date => {
    const now = new Date();
    switch (period) {
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      case 'permanent':
        return new Date(9999, 11, 31); // Far future date
      default:
        return now;
    }
  };

  const getPeriodLabel = (period: ExclusionPeriod): string => {
    const option = exclusionOptions.find(o => o.id === period);
    return option?.label ?? period;
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSelectPeriod = (period: ExclusionPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPeriod(period);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowConfirm(true);
  };

  const handleActivate = async () => {
    if (!selectedPeriod) return;

    setIsActivating(true);

    try {
      if (isApiConfigured()) {
        const endDate = getEndDate(selectedPeriod);
        await updateResponsiblePlay.mutateAsync({
          selfExcludedUntil: endDate.toISOString(),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      // Show error if backend fails
    } finally {
      setIsActivating(false);
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
          <Text className="text-white text-xl font-bold flex-1">Self-Exclusion</Text>
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
                <Shield size={24} color="#22C55E" />
                <View className="ml-4 flex-1">
                  <Text className="text-[#22C55E] font-semibold text-lg">Responsible Gaming</Text>
                  <Text className="text-white/70 text-sm mt-2">
                    Self-exclusion allows you to take a break from playing. During this period, you won't be able to purchase tickets.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Exclusion Options */}
          <View className="px-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Select Exclusion Period
            </Text>
            {exclusionOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleSelectPeriod(option.id)}
                className="mb-3 active:opacity-80"
              >
                <View
                  className={`rounded-2xl p-4 border ${
                    selectedPeriod === option.id
                      ? 'bg-[#FFD700]/10 border-[#FFD700]'
                      : 'bg-[#1E3A5F]/20 border-[#2E4A6F]/30'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${
                        selectedPeriod === option.id ? 'bg-[#FFD700]/20' : 'bg-white/5'
                      }`}
                    >
                      {option.id === 'permanent' ? (
                        <CalendarX size={20} color={selectedPeriod === option.id ? '#FFD700' : '#6B7C93'} />
                      ) : (
                        <Clock size={20} color={selectedPeriod === option.id ? '#FFD700' : '#6B7C93'} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`font-semibold ${selectedPeriod === option.id ? 'text-[#FFD700]' : 'text-white'}`}>
                        {option.label}
                      </Text>
                      <Text className="text-white/50 text-sm">{option.description}</Text>
                    </View>
                    {selectedPeriod === option.id && (
                      <View className="w-6 h-6 rounded-full bg-[#FFD700] items-center justify-center">
                        <Check size={14} color="#0A1628" />
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Warning for permanent */}
          {selectedPeriod === 'permanent' && (
            <View className="px-6 mt-4">
              <View className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <View className="flex-row items-start">
                  <AlertTriangle size={20} color="#EF4444" />
                  <Text className="text-red-400 text-sm ml-3 flex-1">
                    Permanent exclusion cannot be reversed. Your account will be closed and any remaining balance will be refunded.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Confirm Button */}
          {selectedPeriod && !showConfirm && (
            <View className="px-6 mt-6">
              <Pressable onPress={handleConfirm} className="active:opacity-80">
                <View className="bg-[#EF4444] rounded-2xl py-4 items-center">
                  <Text className="text-white font-bold">
                    Activate Self-Exclusion
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Confirmation Dialog */}
          {showConfirm && (
            <View className="px-6 mt-6">
              <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
                <Text className="text-white font-semibold text-lg mb-2">Are you sure?</Text>
                <Text className="text-white/70 text-sm mb-4">
                  You will not be able to purchase tickets for the selected period. This action cannot be undone early.
                </Text>
                <View className="flex-row">
                  <Pressable
                    onPress={() => setShowConfirm(false)}
                    className="flex-1 mr-2 active:opacity-80"
                  >
                    <View className="bg-[#2E4A6F] rounded-xl py-3 items-center">
                      <Text className="text-white font-semibold">Cancel</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={handleActivate}
                    disabled={isActivating}
                    className="flex-1 ml-2 active:opacity-80"
                  >
                    <View className="bg-[#EF4444] rounded-xl py-3 items-center">
                      <Text className="text-white font-semibold">
                        {isActivating ? 'Activating...' : 'Confirm'}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Help */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4">
              <Text className="text-white/40 text-xs text-center">
                Need help? Contact our support team for assistance with responsible gaming resources.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
