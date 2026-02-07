import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Trophy,
  Shield,
  Copy,
  Check,
  Hash,
  Users,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Ticket,
} from 'lucide-react-native';
import { useDrawHistoryStore } from '@/lib/state/draw-history-store';
import {
  verifyDrawAsync,
  verifyWinnerSelection,
  formatVerificationTimestamp,
  type Draw,
  type VerificationResult,
} from '@/lib/crypto/provably-fair';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { BackendLotteryService } from '@/lib/api/backend';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function backendDrawToDraw(b: { id: string; draw_date: string; prize_pool: string | number; total_entries: number; commitment_hash: string; seed?: string; status: string; winning_position?: number; drawn_at?: string; winner?: { username: string } }): Draw {
  const dateStr = typeof b.draw_date === 'string' ? b.draw_date.split('T')[0] : b.draw_date;
  return {
    id: b.id,
    date: dateStr,
    commitmentHash: b.commitment_hash,
    totalEntries: b.total_entries,
    prizePool: parseFloat(String(b.prize_pool)) || 0,
    seed: b.seed,
    status: b.status as Draw['status'],
    winningPosition: b.winning_position,
    winnerUsername: b.winner?.username,
    seedRevealedAt: b.drawn_at,
  };
}

export default function DrawDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ drawId: string }>();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [apiDraw, setApiDraw] = useState<Draw | null | undefined>(undefined);

  const getDrawById = useDrawHistoryStore(s => s.getDrawById);
  const loadDraws = useDrawHistoryStore(s => s.loadDraws);

  const storeDraw = params.drawId ? getDrawById(params.drawId) : null;
  const isBackendDraw = params.drawId && UUID_REGEX.test(params.drawId);
  const draw = isBackendDraw ? (apiDraw ?? null) : storeDraw;

  useEffect(() => {
    loadDraws();
  }, []);

  useEffect(() => {
    if (!isBackendDraw || !params.drawId) return;
    BackendLotteryService.getDrawById(params.drawId).then(res => {
      setApiDraw(res.success && res.data ? backendDrawToDraw(res.data) : null);
    });
  }, [params.drawId, isBackendDraw]);

  useEffect(() => {
    if (!draw || draw.status !== 'drawn' || !draw.seed) {
      setVerification(null);
      return;
    }
    verifyDrawAsync(draw).then(setVerification);
  }, [draw?.id, draw?.status, draw?.seed]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleCopy = async (value: string, field: string) => {
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isBackendDraw && apiDraw === undefined) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <Text className="text-white/70">Loading draw...</Text>
        <Pressable onPress={handleClose} className="mt-4">
          <Text className="text-[#FFD700]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!draw) {
    return (
      <View className="flex-1 bg-[#0A1628] items-center justify-center">
        <Text className="text-white">Draw not found</Text>
        <Pressable onPress={handleClose} className="mt-4">
          <Text className="text-[#FFD700]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const commitmentValid = verification?.commitmentMatches ?? false;
  const winnerValid = verification?.winnerCorrect ?? false;

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
          <Text className="text-white text-lg font-semibold">Draw Verification</Text>
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
          {/* Verification Status Banner */}
          <View className="px-6 mt-6">
            <View
              className={`rounded-2xl p-5 border ${verification === null && draw.status === 'drawn'
                ? 'bg-white/5 border-white/10'
                : verification?.isValid
                  ? 'bg-[#22C55E]/10 border-[#22C55E]/30'
                  : draw.status === 'open'
                    ? 'bg-[#FFD700]/10 border-[#FFD700]/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
            >
              <View className="flex-row items-center justify-center">
                {verification?.isValid ? (
                  <>
                    <CheckCircle2 size={28} color="#22C55E" />
                    <Text className="text-[#22C55E] text-xl font-bold ml-3">
                      Verified Fair
                    </Text>
                  </>
                ) : verification === null && draw.status === 'drawn' ? (
                  <>
                    <Clock size={28} color="#6B7C93" />
                    <Text className="text-white/70 text-xl font-bold ml-3">
                      Verifying...
                    </Text>
                  </>
                ) : draw.status === 'open' ? (
                  <>
                    <Clock size={28} color="#FFD700" />
                    <Text className="text-[#FFD700] text-xl font-bold ml-3">
                      Draw Pending
                    </Text>
                  </>
                ) : (
                  <>
                    <XCircle size={28} color="#EF4444" />
                    <Text className="text-red-500 text-xl font-bold ml-3">
                      Verification Failed
                    </Text>
                  </>
                )}
              </View>
              <Text className="text-white/60 text-sm text-center mt-2">
                {verification === null && draw.status === 'drawn'
                  ? 'Verifying...'
                  : verification?.isValid
                    ? 'All cryptographic proofs verified successfully'
                    : draw.status === 'open'
                      ? 'Verification available after draw completes'
                      : 'Contact support if you believe this is an error'}
              </Text>
            </View>
          </View>

          {/* Draw Info */}
          <View className="px-6 mt-5">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Draw Information
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl border border-[#2E4A6F]/50 overflow-hidden">
              {/* Draw ID */}
              <Pressable
                onPress={() => handleCopy(draw.id, 'drawId')}
                className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5"
              >
                <View className="flex-row items-center">
                  <Hash size={16} color="#6B7C93" />
                  <Text className="text-white/60 ml-3 text-sm">Draw ID</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white font-mono text-xs mr-2">{draw.id}</Text>
                  {copiedField === 'drawId' ? (
                    <Check size={14} color="#22C55E" />
                  ) : (
                    <Copy size={14} color="#6B7C93" />
                  )}
                </View>
              </Pressable>

              {/* Date */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Calendar size={16} color="#6B7C93" />
                  <Text className="text-white/60 ml-3 text-sm">Draw Date</Text>
                </View>
                <Text className="text-white text-sm">
                  {format(new Date(draw.date), 'MMMM d, yyyy')}
                </Text>
              </View>

              {/* Total Entries */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Users size={16} color="#FFD700" />
                  <Text className="text-white/60 ml-3 text-sm">Total Entries</Text>
                </View>
                <Text className="text-[#FFD700] font-bold">
                  {draw.totalEntries.toLocaleString()}
                </Text>
              </View>

              {/* Prize Pool */}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <Trophy size={16} color="#FFD700" />
                  <Text className="text-white/60 ml-3 text-sm">Prize Pool</Text>
                </View>
                <Text className="text-[#FFD700] font-bold">
                  ${draw.prizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Winner Info (if drawn) */}
          {draw.status === 'drawn' && draw.winningTicketId && (
            <View className="px-6 mt-5">
              <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
                Winner
              </Text>
              <View className="bg-[#22C55E]/10 rounded-2xl border border-[#22C55E]/30 p-5">
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full bg-[#22C55E]/20 items-center justify-center">
                    <Trophy size={28} color="#22C55E" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white font-bold text-lg">
                      {draw.winnerUsername ?? 'Anonymous'}
                    </Text>
                    <Text className="text-white/50 text-sm">{draw.winningTicketId}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[#22C55E] font-bold text-xl">
                      ${draw.prizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text className="text-white/40 text-xs">
                      Position #{draw.winningPosition}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Cryptographic Proof */}
          <View className="px-6 mt-5">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Cryptographic Verification
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl border border-[#2E4A6F]/50 overflow-hidden">
              {/* Pre-Commitment Hash */}
              <Pressable
                onPress={() => handleCopy(draw.commitmentHash, 'commitment')}
                className="p-4 border-b border-white/5 active:bg-white/5"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Lock size={16} color="#FFD700" />
                    <Text className="text-white/80 ml-2 text-sm font-medium">
                      Pre-Commitment Hash
                    </Text>
                  </View>
                  {copiedField === 'commitment' ? (
                    <Check size={14} color="#22C55E" />
                  ) : (
                    <Copy size={14} color="#6B7C93" />
                  )}
                </View>
                <Text className="text-white font-mono text-xs" numberOfLines={2}>
                  {draw.commitmentHash}
                </Text>
                {draw.commitmentPublishedAt && (
                  <Text className="text-white/40 text-xs mt-1">
                    Published: {formatVerificationTimestamp(draw.commitmentPublishedAt)}
                  </Text>
                )}
              </Pressable>

              {/* Revealed Seed (only after draw) */}
              {draw.seed && (
                <Pressable
                  onPress={() => handleCopy(draw.seed!, 'seed')}
                  className="p-4 border-b border-white/5 active:bg-white/5"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <Key size={16} color="#22C55E" />
                      <Text className="text-white/80 ml-2 text-sm font-medium">
                        Revealed Seed
                      </Text>
                    </View>
                    {copiedField === 'seed' ? (
                      <Check size={14} color="#22C55E" />
                    ) : (
                      <Copy size={14} color="#6B7C93" />
                    )}
                  </View>
                  <Text className="text-white font-mono text-xs">
                    {draw.seed}
                  </Text>
                  {draw.seedRevealedAt && (
                    <Text className="text-white/40 text-xs mt-1">
                      Revealed: {formatVerificationTimestamp(draw.seedRevealedAt)}
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Verification Results */}
              {draw.status === 'drawn' && draw.seed && (
                <>
                  {/* Hash Verification */}
                  <View className="p-4 border-b border-white/5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Shield size={16} color={commitmentValid ? '#22C55E' : '#EF4444'} />
                        <Text className="text-white/80 ml-2 text-sm">
                          Commitment Hash Match
                        </Text>
                      </View>
                      {commitmentValid ? (
                        <View className="flex-row items-center bg-[#22C55E]/20 px-2 py-1 rounded">
                          <CheckCircle2 size={14} color="#22C55E" />
                          <Text className="text-[#22C55E] text-xs font-medium ml-1">
                            VERIFIED
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-red-500/20 px-2 py-1 rounded">
                          <XCircle size={14} color="#EF4444" />
                          <Text className="text-red-500 text-xs font-medium ml-1">
                            FAILED
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-white/40 text-xs mt-2">
                      Verifies hash(seed) = commitment hash
                    </Text>
                  </View>

                  {/* Winner Selection Verification */}
                  <View className="p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ticket size={16} color={winnerValid ? '#22C55E' : '#EF4444'} />
                        <Text className="text-white/80 ml-2 text-sm">
                          Winner Selection
                        </Text>
                      </View>
                      {winnerValid ? (
                        <View className="flex-row items-center bg-[#22C55E]/20 px-2 py-1 rounded">
                          <CheckCircle2 size={14} color="#22C55E" />
                          <Text className="text-[#22C55E] text-xs font-medium ml-1">
                            VERIFIED
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-red-500/20 px-2 py-1 rounded">
                          <XCircle size={14} color="#EF4444" />
                          <Text className="text-red-500 text-xs font-medium ml-1">
                            FAILED
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-white/40 text-xs mt-2">
                      Verifies seed deterministically selects position #{draw.winningPosition}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* How to Verify Independently */}
          <View className="px-6 mt-5">
            <View className="bg-[#1E3A5F]/20 rounded-2xl p-4 border border-[#2E4A6F]/30">
              <Text className="text-white/70 text-sm font-medium mb-2">
                Verify Independently
              </Text>
              <Text className="text-white/50 text-xs leading-5">
                1. Copy the seed and commitment hash above{'\n'}
                2. Compute SHA-256(seed) and verify it matches the commitment hash{'\n'}
                3. Take first 16 hex chars of seed, interpret as BigInt{'\n'}
                4. Compute (that value mod {draw.totalEntries}){'\n'}
                5. Verify it equals winning position #{draw.winningPosition} (0-indexed)
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View className="px-6 mt-6">
            <Text className="text-white/30 text-xs text-center">
              This draw was executed using a provably fair{'\n'}
              cryptographic random selection system.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
