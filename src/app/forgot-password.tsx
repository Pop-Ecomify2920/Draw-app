import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Mail, ArrowLeft, Check, Send } from 'lucide-react-native';
import { useResetPassword } from '@/lib/hooks';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const resetPasswordMutation = useResetPassword();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setError('');

    if (!email) {
      setError('Please enter your email');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    resetPasswordMutation.mutate(email, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccess(true);
      },
      onError: (err) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err.message || 'Failed to send reset email');
      },
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleBackToSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/sign-in');
  };

  if (success) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Animated.View entering={FadeIn} className="items-center">
            <View className="w-24 h-24 rounded-full bg-[#22C55E]/20 items-center justify-center mb-6">
              <Send size={40} color="#22C55E" />
            </View>
            <Text className="text-white text-2xl font-bold text-center">Check Your Email</Text>
            <Text className="text-white/60 mt-3 text-center">
              We've sent password reset instructions to
            </Text>
            <Text className="text-[#FFD700] font-semibold mt-1">{email}</Text>
            <Text className="text-white/60 mt-4 text-center px-4">
              Check your email for a 6-character reset code. Enter it on the next screen to set a new password.
            </Text>

            <View className="w-full mt-8">
              <Pressable
                onPress={() => router.replace({ pathname: '/reset-password', params: { email } })}
                className="active:opacity-80 mb-3"
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-4 items-center">
                    <Text className="text-[#0A1628] text-lg font-bold">Enter Reset Code</Text>
                  </View>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={handleBackToSignIn} className="active:opacity-80">
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-4 items-center">
                    <Text className="text-[#0A1628] text-lg font-bold">Back to Sign In</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            <Pressable onPress={handleResetPassword} className="mt-4 py-3">
              <Text className="text-white/60">Didn't receive email? <Text className="text-[#FFD700]">Resend</Text></Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

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
          {/* Header */}
          <View className="flex-row items-center px-6 pt-4">
            <Pressable
              onPress={handleBack}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-1 px-6 justify-center">
            {/* Title */}
            <Animated.View entering={FadeIn.delay(100)} className="mb-8">
              <View className="w-16 h-16 rounded-2xl bg-[#FFD700]/20 items-center justify-center mb-4">
                <Mail size={32} color="#FFD700" />
              </View>
              <Text className="text-white text-2xl font-bold">Forgot Password?</Text>
              <Text className="text-white/60 mt-2">
                No worries! Enter your email and we'll send you reset instructions.
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(200)}>
              {/* Email Input */}
              <View className="mb-6">
                <Text className="text-white/60 text-sm mb-2 ml-1">Email Address</Text>
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

              {/* Error Message */}
              {error ? (
                <View className="bg-red-500/10 rounded-xl p-3 mb-4 border border-red-500/30">
                  <Text className="text-red-400 text-center text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Reset Button */}
              <Pressable
                onPress={handleResetPassword}
                disabled={resetPasswordMutation.isPending}
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
                      {resetPasswordMutation.isPending ? 'Sending...' : 'Send Reset Code'}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Back to Sign In */}
            <Animated.View
              entering={FadeInDown.delay(300)}
              className="flex-row justify-center mt-8"
            >
              <Text className="text-white/60">Remember your password? </Text>
              <Pressable onPress={handleBack}>
                <Text className="text-[#FFD700] font-semibold">Sign In</Text>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
