import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Key, ArrowLeft, Lock, Check } from 'lucide-react-native';
import { useConfirmPasswordReset } from '@/lib/hooks';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const confirmMutation = useConfirmPasswordReset();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!email || !code || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (code.length !== 6) {
      setError('Reset code must be 6 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    confirmMutation.mutate(
      { email: email.trim().toLowerCase(), code: code.toUpperCase(), newPassword },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSuccess(true);
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message || 'Failed to reset password');
        },
      }
    );
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
              <Check size={40} color="#22C55E" />
            </View>
            <Text className="text-white text-2xl font-bold text-center">Password Reset</Text>
            <Text className="text-white/60 mt-3 text-center">
              Your password has been changed. You can now sign in with your new password.
            </Text>
            <Pressable
              onPress={() => router.replace('/sign-in')}
              className="mt-8 w-full active:opacity-80"
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16 }}
              >
                <View className="py-4 items-center">
                  <Text className="text-[#0A1628] text-lg font-bold">Sign In</Text>
                </View>
              </LinearGradient>
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
          <View className="flex-row items-center px-6 pt-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-1 px-6 justify-center">
            <Animated.View entering={FadeIn.delay(100)} className="mb-8">
              <View className="w-16 h-16 rounded-2xl bg-[#FFD700]/20 items-center justify-center mb-4">
                <Key size={32} color="#FFD700" />
              </View>
              <Text className="text-white text-2xl font-bold">Reset Password</Text>
              <Text className="text-white/60 mt-2">
                Enter the 6-character code from your email and choose a new password.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200)}>
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="#6B7C93"
                  className="bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4 py-4 text-white"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!params.email}
                />
              </View>
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">Reset Code</Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6))}
                  placeholder="XXXXXX"
                  placeholderTextColor="#6B7C93"
                  className="bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4 py-4 text-white font-mono text-lg tracking-widest"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">New Password</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <Lock size={20} color="#6B7C93" />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-4 px-3 text-white"
                    secureTextEntry
                  />
                </View>
              </View>
              <View className="mb-6">
                <Text className="text-white/60 text-sm mb-2 ml-1">Confirm Password</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <Lock size={20} color="#6B7C93" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-4 px-3 text-white"
                    secureTextEntry
                  />
                </View>
              </View>

              {error ? (
                <View className="bg-red-500/10 rounded-xl p-3 mb-4 border border-red-500/30">
                  <Text className="text-red-400 text-center text-sm">{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={confirmMutation.isPending}
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
                      {confirmMutation.isPending ? 'Resetting...' : 'Reset Password'}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
