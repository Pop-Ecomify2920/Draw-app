import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  withSpring,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { Trophy, Star, Sparkles, PartyPopper, X, AlertTriangle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Confetti particle component
function ConfettiParticle({ delay, startX }: { delay: number; startX: number }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(height + 100, { duration: 3000, easing: Easing.linear })
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(30, { duration: 500 }),
          withTiming(-30, { duration: 500 })
        ),
        -1,
        true
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 2000 }), -1)
    );
    opacity.value = withDelay(delay + 2500, withTiming(0, { duration: 500 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          width: 10,
          height: 10,
          backgroundColor: randomColor,
          borderRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function DemoWinScreen() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  // Animation values
  const trophyScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const prizeScale = useSharedValue(0);

  // Demo prize amount
  const demoTicketId = 'DDL-DEMO1234';
  const demoPrizeAmount = 1547.82;

  useEffect(() => {
    // Initial haptic burst
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Trophy animation
    trophyScale.value = withDelay(
      300,
      withSpring(1, { damping: 8, stiffness: 100 })
    );

    // Glow pulse
    glowOpacity.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      )
    );

    // Prize reveal
    prizeScale.value = withDelay(
      800,
      withSpring(1, { damping: 10, stiffness: 80 })
    );

    // Show details after animation
    setTimeout(() => {
      setShowDetails(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1200);

    // Additional celebration haptics
    const hapticInterval = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 800);

    return () => clearInterval(hapticInterval);
  }, []);

  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const prizeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: prizeScale.value }],
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    delay: Math.random() * 2000,
    startX: Math.random() * width,
  }));

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#1A0F3C', '#0A1628', '#0F2847']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Confetti */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        {confettiParticles.map((particle) => (
          <ConfettiParticle key={particle.id} delay={particle.delay} startX={particle.startX} />
        ))}
      </View>

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Demo Banner */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          className="mx-4 mt-4 bg-amber-500/20 rounded-2xl p-4 border border-amber-500/50"
        >
          <View className="flex-row items-center justify-center">
            <AlertTriangle size={20} color="#F59E0B" />
            <Text className="text-amber-500 font-bold text-base ml-2">
              DEMONSTRATION WIN
            </Text>
          </View>
          <Text className="text-amber-500/80 text-xs text-center mt-1">
            This is what winning looks like. No actual prize awarded.
          </Text>
        </Animated.View>

        {/* Close button */}
        <Pressable
          onPress={handleClose}
          className="absolute top-16 right-6 w-10 h-10 rounded-full bg-white/10 items-center justify-center z-50"
        >
          <X size={20} color="#fff" />
        </Pressable>

        {/* Main Content */}
        <View className="flex-1 items-center justify-center px-8">
          {/* Glow effect */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 300,
                height: 300,
                borderRadius: 150,
                backgroundColor: '#FFD700',
              },
              glowAnimatedStyle,
            ]}
          />

          {/* Trophy */}
          <Animated.View style={trophyAnimatedStyle} className="items-center">
            <View className="w-32 h-32 rounded-full bg-[#FFD700]/30 items-center justify-center mb-6">
              <View className="w-24 h-24 rounded-full bg-[#FFD700]/50 items-center justify-center">
                <Trophy size={56} color="#FFD700" fill="#FFD700" />
              </View>
            </View>
          </Animated.View>

          {/* Winner text */}
          <Animated.View entering={FadeInUp.delay(400)}>
            <View className="flex-row items-center mb-2">
              <PartyPopper size={24} color="#FFD700" />
              <Text className="text-[#FFD700] text-lg font-bold mx-3">JACKPOT!</Text>
              <PartyPopper size={24} color="#FFD700" style={{ transform: [{ scaleX: -1 }] }} />
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeIn.delay(500)}
            className="text-white text-3xl font-bold text-center mb-4"
          >
            You're a Winner!
          </Animated.Text>

          {/* Prize amount */}
          <Animated.View style={prizeAnimatedStyle} className="items-center">
            <View className="flex-row items-center">
              <Sparkles size={28} color="#FFD700" />
              <Text className="text-[#FFD700] text-6xl font-black mx-4">
                ${demoPrizeAmount.toLocaleString()}
              </Text>
              <Sparkles size={28} color="#FFD700" />
            </View>
          </Animated.View>

          {/* Details */}
          {showDetails && (
            <Animated.View entering={FadeInUp.delay(200)} className="mt-8 w-full">
              <View className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <View className="flex-row justify-between mb-4">
                  <Text className="text-white/60">Winning Ticket</Text>
                  <Text className="text-white font-mono">{demoTicketId}</Text>
                </View>
                <View className="h-px bg-white/10 mb-4" />
                <View className="flex-row justify-between mb-4">
                  <Text className="text-white/60">Prize Pool</Text>
                  <Text className="text-white">${demoPrizeAmount.toLocaleString()}</Text>
                </View>
                <View className="h-px bg-white/10 mb-4" />
                <View className="flex-row justify-between">
                  <Text className="text-white/60">Status</Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    <Text className="text-green-500 font-medium">Demo Winner</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Bottom section */}
        <View className="px-6 pb-6">
          {/* Demo reminder */}
          <View className="bg-[#1E3A5F]/30 rounded-xl p-4 mb-4 flex-row items-center">
            <Star size={20} color="#6B7C93" />
            <Text className="text-white/50 text-sm ml-3 flex-1">
              This is a demonstration. In real wins, funds are automatically added to your wallet.
            </Text>
          </View>

          <Pressable
            onPress={handleClose}
            className="w-full py-4 rounded-2xl bg-[#FFD700] items-center active:opacity-90"
          >
            <Text className="text-[#0A1628] font-bold text-lg">Close Demo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
