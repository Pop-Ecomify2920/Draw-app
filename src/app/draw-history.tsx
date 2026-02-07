import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Trophy,
  Users,
  ChevronRight,
  Calendar,
  Shield,
  CheckCircle2,
} from 'lucide-react-native';
import { useDrawHistoryStore } from '@/lib/state/draw-history-store';
import { Draw, verifyDraw } from '@/lib/crypto/provably-fair';
import { format } from 'date-fns';

const DrawHistoryCard = ({ draw, onPress }: { draw: Draw; onPress: () => void }) => {
  const verification = draw.status === 'drawn' && draw.seed ? verifyDraw(draw) : null;

  return (
    <Pressable
      onPress={onPress}
      className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50 mb-3 active:bg-[#1E3A5F]/50"
    >
      <View className="flex-row items-start justify-between">
        {/* Left side - Draw info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Calendar size={14} color="#6B7C93" />
            <Text className="text-white/60 text-sm ml-2">
              {format(new Date(draw.date), 'MMM d, yyyy')}
            </Text>
          </View>

          <Text className="text-white font-mono text-xs mt-1 opacity-50">
            {draw.id}
          </Text>

          {/* Stats row */}
          <View className="flex-row items-center mt-3">
            <View className="flex-row items-center mr-4">
              <Users size={12} color="#FFD700" />
              <Text className="text-white/70 text-xs ml-1">
                {draw.totalEntries.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Trophy size={12} color="#22C55E" />
              <Text className="text-[#22C55E] text-xs ml-1 font-medium">
                ${draw.prizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Right side - Winner & Status */}
        <View className="items-end">
          {verification?.isValid ? (
            <View className="flex-row items-center bg-[#22C55E]/20 px-2 py-1 rounded">
              <CheckCircle2 size={12} color="#22C55E" />
              <Text className="text-[#22C55E] text-xs font-medium ml-1">
                Verified
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center bg-[#FFD700]/20 px-2 py-1 rounded">
              <Shield size={12} color="#FFD700" />
              <Text className="text-[#FFD700] text-xs font-medium ml-1">
                Pending
              </Text>
            </View>
          )}

          {draw.winnerUsername && (
            <Text className="text-white text-sm font-medium mt-2">
              {draw.winnerUsername}
            </Text>
          )}
          {draw.winningTicketId && (
            <Text className="text-white/40 text-xs">
              {draw.winningTicketId}
            </Text>
          )}

          <ChevronRight size={16} color="#6B7C93" style={{ marginTop: 8 }} />
        </View>
      </View>
    </Pressable>
  );
};

export default function DrawHistoryScreen() {
  const router = useRouter();

  const draws = useDrawHistoryStore(s => s.draws);
  const loadDraws = useDrawHistoryStore(s => s.loadDraws);
  const getPastDraws = useDrawHistoryStore(s => s.getPastDraws);

  useEffect(() => {
    loadDraws();
  }, []);

  const pastDraws = getPastDraws();

  // Calculate stats
  const totalPrizesPaid = pastDraws.reduce((sum, d) => sum + d.prizePool, 0);
  const totalEntries = pastDraws.reduce((sum, d) => sum + d.totalEntries, 0);
  const verifiedDraws = pastDraws.filter(d => {
    if (d.status === 'drawn' && d.seed) {
      const result = verifyDraw(d);
      return result.isValid;
    }
    return false;
  }).length;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleDrawPress = (drawId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/draw-details?drawId=${drawId}`);
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4">
          <View className="w-10" />
          <Text className="text-white text-lg font-semibold">Draw History</Text>
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Summary */}
          <View className="px-6 mt-6">
            <View className="flex-row">
              <View className="flex-1 bg-[#1E3A5F]/40 rounded-2xl p-4 mr-2 border border-[#2E4A6F]/50">
                <View className="flex-row items-center">
                  <Trophy size={16} color="#22C55E" />
                  <Text className="text-white/60 text-xs ml-2">Total Prizes</Text>
                </View>
                <Text className="text-[#22C55E] text-xl font-bold mt-2">
                  ${totalPrizesPaid.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </Text>
              </View>

              <View className="flex-1 bg-[#1E3A5F]/40 rounded-2xl p-4 ml-2 border border-[#2E4A6F]/50">
                <View className="flex-row items-center">
                  <Users size={16} color="#FFD700" />
                  <Text className="text-white/60 text-xs ml-2">Total Entries</Text>
                </View>
                <Text className="text-[#FFD700] text-xl font-bold mt-2">
                  {totalEntries.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Verification Status */}
            <View className="bg-[#22C55E]/10 rounded-2xl p-4 mt-3 border border-[#22C55E]/30">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Shield size={20} color="#22C55E" />
                  <View className="ml-3">
                    <Text className="text-[#22C55E] font-semibold">
                      Cryptographically Verified
                    </Text>
                    <Text className="text-white/50 text-xs">
                      All draws use provably fair selection
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[#22C55E] font-bold text-lg">
                    {verifiedDraws}/{pastDraws.length}
                  </Text>
                  <Text className="text-white/40 text-xs">verified</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Past Draws List */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Recent Draws
            </Text>

            {pastDraws.length > 0 ? (
              pastDraws.map(draw => (
                <DrawHistoryCard
                  key={draw.id}
                  draw={draw}
                  onPress={() => handleDrawPress(draw.id)}
                />
              ))
            ) : (
              <View className="bg-[#1E3A5F]/20 rounded-2xl p-6 items-center">
                <Calendar size={40} color="#6B7C93" />
                <Text className="text-white/50 mt-3 text-center">
                  No past draws yet
                </Text>
                <Text className="text-white/30 text-sm mt-1 text-center">
                  Check back after the first draw completes
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="px-6 mt-6">
            <Text className="text-white/30 text-xs text-center">
              All draws are recorded and cryptographically verified.{'\n'}
              Click any draw to see full verification details.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
