import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import {
  X,
  Play,
  Users,
  Crown,
  Ticket,
  Trophy,
  DollarSign,
  Share2,
  Zap,
  Clock,
  Shield,
  ChevronRight,
  HelpCircle,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LobbyHowToPlayScreen() {
  const router = useRouter();
  const [showingDemo, setShowingDemo] = useState(false);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const playButtonScale = useSharedValue(1);

  React.useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handlePlayDemo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowingDemo(true);
    // Demo would play here - for now show a placeholder
    setTimeout(() => setShowingDemo(false), 3000);
  };

  const steps = [
    {
      icon: Crown,
      title: 'Host or Join',
      description: 'Create your own room as a host, or join an existing room with a 6-character code.',
      color: '#FFD700',
    },
    {
      icon: Share2,
      title: 'Invite Friends',
      description: 'Share your room code with friends, coworkers, or event attendees. Anyone with the code can join.',
      color: '#22C55E',
    },
    {
      icon: Ticket,
      title: 'Buy Tickets',
      description: 'Each player buys a $1 ticket from their wallet balance. No limits on how many rooms you can join!',
      color: '#3B82F6',
    },
    {
      icon: Trophy,
      title: 'Win Together',
      description: 'The host starts the draw when ready. One lucky winner takes the entire prize pool!',
      color: '#F97316',
    },
  ];

  const benefits = [
    {
      icon: Users,
      title: 'Better Odds',
      description: 'Smaller groups mean higher chances of winning compared to the daily draw.',
    },
    {
      icon: DollarSign,
      title: 'Growing Prize',
      description: 'Every player adds to the pot. More friends = bigger prizes!',
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'No waiting for midnight. The host decides when to draw.',
    },
    {
      icon: Shield,
      title: 'Secure & Fair',
      description: 'Same provably fair system as the daily draw. Every ticket has an equal chance.',
    },
  ];

  const faqs = [
    {
      question: 'How much does a ticket cost?',
      answer: '$1 per ticket, same as the daily draw. Uses your existing wallet balance.',
    },
    {
      question: 'Is there a limit on room size?',
      answer: 'Rooms can have 2-100 participants. The host sets the limit when creating.',
    },
    {
      question: 'What percentage goes to the winner?',
      answer: '95% of all ticket sales go directly to the prize pool. Same as the daily draw.',
    },
    {
      question: 'Can I join multiple rooms?',
      answer: 'Yes! Unlike the daily draw, there\'s no limit on how many lobby rooms you can join.',
    },
    {
      question: 'When does the draw happen?',
      answer: 'The host decides! They can start the draw anytime once at least 2 tickets are sold.',
    },
  ];

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Demo Overlay */}
      {showingDemo && (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="absolute inset-0 z-50 items-center justify-center"
          style={{ backgroundColor: 'rgba(10, 22, 40, 0.98)' }}
        >
          <View className="items-center px-8">
            <View className="w-20 h-20 rounded-full bg-[#FFD700]/20 items-center justify-center mb-6">
              <Play size={40} color="#FFD700" fill="#FFD700" />
            </View>
            <Text className="text-white text-xl font-bold mb-2">Demo Playing...</Text>
            <Text className="text-white/60 text-center">
              Watch how a typical Lobby draw works from start to finish.
            </Text>
            <View className="mt-8 w-64 h-2 bg-[#1E3A5F] rounded-full overflow-hidden">
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: '#FFD700',
                  width: '100%',
                }}
              />
            </View>
          </View>
        </Animated.View>
      )}

      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#FFD700]/20 items-center justify-center mr-3">
                <HelpCircle size={20} color="#FFD700" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">How Lobby Works</Text>
                <Text className="text-white/50 text-sm">Private draws explained</Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-[#1E3A5F]/50 items-center justify-center active:opacity-70"
            >
              <X size={20} color="#6B7C93" />
            </Pressable>
          </View>

          {/* Video Demo Section */}
          <View className="px-6 mt-6">
            <Pressable onPress={handlePlayDemo} className="active:opacity-90">
              <View className="bg-[#1E3A5F] rounded-2xl overflow-hidden border border-[#2E4A6F]">
                <View
                  className="items-center justify-center py-16"
                  style={{ backgroundColor: '#0F2847' }}
                >
                  <Animated.View style={pulseStyle}>
                    <View className="w-20 h-20 rounded-full bg-[#FFD700]/20 items-center justify-center border-2 border-[#FFD700]">
                      <Play size={32} color="#FFD700" fill="#FFD700" />
                    </View>
                  </Animated.View>
                  <Text className="text-white font-bold mt-4">Watch Demo</Text>
                  <Text className="text-white/50 text-sm mt-1">See Lobby in action</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* How It Works Steps */}
          <View className="px-6 mt-8">
            <Text className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wide">
              How It Works
            </Text>
            {steps.map((step, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(index * 100).duration(400)}
              >
                <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 mb-3 flex-row items-start border border-[#2E4A6F]/30">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <step.icon size={24} color={step.color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <View className="w-6 h-6 rounded-full bg-[#0A1628] items-center justify-center mr-2">
                        <Text className="text-white/60 text-xs font-bold">{index + 1}</Text>
                      </View>
                      <Text className="text-white font-semibold">{step.title}</Text>
                    </View>
                    <Text className="text-white/60 text-sm mt-2 leading-5">
                      {step.description}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Benefits */}
          <View className="px-6 mt-8">
            <Text className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wide">
              Why Play in Lobby?
            </Text>
            <View className="flex-row flex-wrap">
              {benefits.map((benefit, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInDown.delay(index * 100 + 400).duration(400)}
                  className="w-1/2 pr-2 mb-3"
                  style={{ paddingRight: index % 2 === 0 ? 6 : 0, paddingLeft: index % 2 === 1 ? 6 : 0 }}
                >
                  <View className="bg-[#1E3A5F]/20 rounded-xl p-4 h-full border border-[#2E4A6F]/20">
                    <View className="w-10 h-10 rounded-full bg-[#FFD700]/10 items-center justify-center mb-3">
                      <benefit.icon size={20} color="#FFD700" />
                    </View>
                    <Text className="text-white font-semibold text-sm">{benefit.title}</Text>
                    <Text className="text-white/50 text-xs mt-1 leading-4">
                      {benefit.description}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* FAQs */}
          <View className="px-6 mt-8">
            <Text className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wide">
              Common Questions
            </Text>
            {faqs.map((faq, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(index * 100 + 800).duration(400)}
              >
                <View className="bg-[#1E3A5F]/20 rounded-xl p-4 mb-3 border border-[#2E4A6F]/20">
                  <Text className="text-white font-semibold">{faq.question}</Text>
                  <Text className="text-white/50 text-sm mt-2 leading-5">{faq.answer}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Example Scenario */}
          <View className="px-6 mt-8">
            <Text className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wide">
              Example Scenario
            </Text>
            <View className="bg-gradient-to-br from-[#1E3A5F]/50 to-[#0F2847]/50 rounded-2xl p-5 border border-[#2E4A6F]">
              <View className="flex-row items-center mb-4">
                <Users size={20} color="#FFD700" />
                <Text className="text-[#FFD700] font-semibold ml-2">Office Friday Pool</Text>
              </View>
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-[#22C55E] mr-3" />
                  <Text className="text-white/70 text-sm flex-1">
                    Sarah creates a room and shares code with 20 coworkers
                  </Text>
                </View>
                <View className="flex-row items-center mt-2">
                  <View className="w-2 h-2 rounded-full bg-[#22C55E] mr-3" />
                  <Text className="text-white/70 text-sm flex-1">
                    Each person buys a $1 ticket → Prize pool: $19.00
                  </Text>
                </View>
                <View className="flex-row items-center mt-2">
                  <View className="w-2 h-2 rounded-full bg-[#22C55E] mr-3" />
                  <Text className="text-white/70 text-sm flex-1">
                    At 5pm Friday, Sarah starts the draw
                  </Text>
                </View>
                <View className="flex-row items-center mt-2">
                  <View className="w-2 h-2 rounded-full bg-[#FFD700] mr-3" />
                  <Text className="text-white/70 text-sm flex-1">
                    One lucky winner takes home $19.00!
                  </Text>
                </View>
              </View>
              <View className="mt-4 pt-4 border-t border-[#2E4A6F]/50">
                <Text className="text-white/50 text-xs text-center">
                  Each player has a 1 in 20 (5%) chance to win $19
                </Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <View className="px-6 mt-8">
            <Pressable
              onPress={handleClose}
              className="active:opacity-90"
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16 }}
              >
                <View className="py-5 flex-row items-center justify-center">
                  <Users size={24} color="#0A1628" />
                  <Text className="text-[#0A1628] text-lg font-bold ml-3">
                    Start Playing
                  </Text>
                  <ChevronRight size={20} color="#0A1628" className="ml-2" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
