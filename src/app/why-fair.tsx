import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Shield,
  Lock,
  Key,
  Eye,
  Hash,
  CheckCircle2,
  Users,
  Clock,
  FileText,
} from 'lucide-react-native';

export default function WhyFairScreen() {
  const router = useRouter();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const steps = [
    {
      icon: Lock,
      title: 'Before Ticket Sales',
      description: 'We generate a secret random seed and publish its cryptographic hash (the "commitment"). This hash is visible to everyone but reveals nothing about the seed itself.',
      color: '#FFD700',
    },
    {
      icon: Users,
      title: 'During Ticket Sales',
      description: 'Players buy tickets. Each ticket gets a position number and a unique hash. The commitment hash is shown on every ticket, proving the outcome was already locked.',
      color: '#3B82F6',
    },
    {
      icon: Clock,
      title: 'Sales Close',
      description: 'At midnight UTC, ticket sales freeze. No more entries can be added, modified, or removed. The total pool and all positions are permanently locked.',
      color: '#8B5CF6',
    },
    {
      icon: Key,
      title: 'Seed Revealed',
      description: 'We reveal the original seed. The winner is selected by computing: (seed hash mod total_entries) + 1. This mathematical operation is deterministic and verifiable.',
      color: '#22C55E',
    },
    {
      icon: Eye,
      title: 'Anyone Can Verify',
      description: 'Users can independently verify that (1) the revealed seed hashes to the commitment, and (2) the winner position is correctly computed from the seed.',
      color: '#EC4899',
    },
  ];

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
          <Text className="text-white text-lg font-semibold">Why This Is Fair</Text>
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
          {/* Hero Section */}
          <View className="px-6 mt-6 items-center">
            <View className="w-20 h-20 rounded-full bg-[#22C55E]/20 items-center justify-center">
              <Shield size={40} color="#22C55E" />
            </View>
            <Text className="text-white text-2xl font-bold mt-4 text-center">
              Provably Fair System
            </Text>
            <Text className="text-white/60 text-sm text-center mt-2 px-4">
              Our lottery uses cryptographic commitment schemes - the same technology
              used by blockchain systems - to ensure complete transparency and fairness.
            </Text>
          </View>

          {/* Key Guarantee */}
          <View className="px-6 mt-6">
            <View className="bg-[#22C55E]/10 rounded-2xl p-5 border border-[#22C55E]/30">
              <View className="flex-row items-center mb-3">
                <CheckCircle2 size={24} color="#22C55E" />
                <Text className="text-[#22C55E] font-bold text-lg ml-2">
                  The Guarantee
                </Text>
              </View>
              <Text className="text-white/80 text-sm leading-6">
                We <Text className="text-white font-bold">cannot manipulate</Text> the outcome
                because we publish the commitment hash{' '}
                <Text className="text-white font-bold">before</Text> you buy your ticket. Changing
                the seed after publishing would require breaking cryptographic hash functions -
                something even supercomputers cannot do.
              </Text>
            </View>
          </View>

          {/* How It Works */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-xs font-medium mb-4 uppercase tracking-wide">
              How It Works
            </Text>

            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <View key={index} className="flex-row mb-4">
                  {/* Timeline */}
                  <View className="items-center mr-4">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${step.color}20` }}
                    >
                      <StepIcon size={20} color={step.color} />
                    </View>
                    {index < steps.length - 1 && (
                      <View className="w-0.5 flex-1 bg-white/10 my-2" />
                    )}
                  </View>

                  {/* Content */}
                  <View className="flex-1 pb-4">
                    <Text className="text-white font-semibold text-base">
                      {step.title}
                    </Text>
                    <Text className="text-white/60 text-sm mt-1 leading-5">
                      {step.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Technical Details */}
          <View className="px-6 mt-2">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Technical Details
            </Text>
            <View className="bg-[#1E3A5F]/30 rounded-2xl border border-[#2E4A6F]/50 overflow-hidden">
              <View className="p-4 border-b border-white/5">
                <View className="flex-row items-center mb-2">
                  <Hash size={16} color="#FFD700" />
                  <Text className="text-white/80 ml-2 text-sm font-medium">
                    Commitment Hash
                  </Text>
                </View>
                <Text className="text-white/50 text-xs font-mono">
                  hash("DDL-COMMIT-" + seed)
                </Text>
                <Text className="text-white/40 text-xs mt-1">
                  One-way function: hash → seed is computationally impossible
                </Text>
              </View>

              <View className="p-4 border-b border-white/5">
                <View className="flex-row items-center mb-2">
                  <Key size={16} color="#22C55E" />
                  <Text className="text-white/80 ml-2 text-sm font-medium">
                    Winner Selection
                  </Text>
                </View>
                <Text className="text-white/50 text-xs font-mono">
                  (hash("DDL-WINNER-" + seed) mod total_entries) + 1
                </Text>
                <Text className="text-white/40 text-xs mt-1">
                  Deterministic: same seed always produces same winner
                </Text>
              </View>

              <View className="p-4">
                <View className="flex-row items-center mb-2">
                  <FileText size={16} color="#3B82F6" />
                  <Text className="text-white/80 ml-2 text-sm font-medium">
                    Ticket Hash
                  </Text>
                </View>
                <Text className="text-white/50 text-xs font-mono">
                  hash(ticket_id:draw_id:timestamp:position)
                </Text>
                <Text className="text-white/40 text-xs mt-1">
                  Proves ticket data cannot be altered after purchase
                </Text>
              </View>
            </View>
          </View>

          {/* Comparison */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-xs font-medium mb-3 uppercase tracking-wide">
              Traditional vs Provably Fair
            </Text>
            <View className="flex-row">
              <View className="flex-1 mr-2">
                <View className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                  <Text className="text-red-400 font-semibold mb-2">Traditional</Text>
                  <Text className="text-white/50 text-xs leading-5">
                    • Trust the operator{'\n'}
                    • Results are opaque{'\n'}
                    • No way to verify{'\n'}
                    • Can be manipulated
                  </Text>
                </View>
              </View>
              <View className="flex-1 ml-2">
                <View className="bg-[#22C55E]/10 rounded-xl p-4 border border-[#22C55E]/20">
                  <Text className="text-[#22C55E] font-semibold mb-2">Provably Fair</Text>
                  <Text className="text-white/50 text-xs leading-5">
                    • Trust mathematics{'\n'}
                    • Full transparency{'\n'}
                    • Anyone can verify{'\n'}
                    • Cannot be rigged
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/20 rounded-2xl p-4 border border-[#2E4A6F]/30">
              <Text className="text-white/60 text-sm text-center leading-5">
                This system provides the same level of transparency and verifiability
                as regulated lottery platforms, using proven cryptographic techniques.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
