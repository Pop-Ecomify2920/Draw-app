import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Mail, Lock, Eye, EyeOff, Ticket } from 'lucide-react-native';
import { useSignIn } from '@/lib/hooks';

export default function SignInScreen() {
  const router = useRouter();
  const signInMutation = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    signInMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)');
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message || 'Sign in failed');
        },
      }
    );
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/forgot-password');
  };

  const handleSignUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sign-up');
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 px-6 justify-center">
            {/* Logo */}
            <Animated.View
              entering={FadeIn.delay(100)}
              className="items-center mb-10"
            >
              <View className="w-20 h-20 rounded-3xl bg-[#FFD700]/20 items-center justify-center mb-4">
                <Ticket size={40} color="#FFD700" />
              </View>
              <Text className="text-white text-3xl font-bold">Daily Dollar Lotto</Text>
              <Text className="text-white/60 mt-2">Sign in to continue</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(200)}>
              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">Email</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <Mail size={20} color="#6B7C93" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-4 px-3 text-white"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-2">
                <Text className="text-white/60 text-sm mb-2 ml-1">Password</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <Lock size={20} color="#6B7C93" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-4 px-3 text-white"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#6B7C93" />
                    ) : (
                      <Eye size={20} color="#6B7C93" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <Pressable onPress={handleForgotPassword} className="self-end mb-6">
                <Text className="text-[#FFD700] text-sm">Forgot password?</Text>
              </Pressable>

              {/* Error Message */}
              {error ? (
                <View className="bg-red-500/10 rounded-xl p-3 mb-4 border border-red-500/30">
                  <Text className="text-red-400 text-center text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <Pressable
                onPress={handleSignIn}
                disabled={signInMutation.isPending}
                className="active:opacity-80"
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-4 items-center">
                    <Text className="text-[#0A1628] text-lg font-bold">
                      {signInMutation.isPending ? 'Signing in...' : 'Sign In'}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Sign Up Link */}
            <Animated.View
              entering={FadeInDown.delay(300)}
              className="flex-row justify-center mt-8"
            >
              <Text className="text-white/60">Don't have an account? </Text>
              <Pressable onPress={handleSignUp}>
                <Text className="text-[#FFD700] font-semibold">Sign Up</Text>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
