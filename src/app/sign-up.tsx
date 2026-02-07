import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, Check, Ticket, ChevronDown } from 'lucide-react-native';
import Checkbox from 'expo-checkbox';
import { useSignUp } from '@/lib/hooks';
import { isApiConfigured } from '@/lib/api';

const formatDateForAPI = (d: Date) => d.toISOString().split('T')[0];

type DarkDropdownProps<T> = {
  value: T;
  onSelect: (v: T) => void;
  options: { label: string; value: T }[];
  placeholder?: string;
  width?: number;
};

function DarkDropdown<T>({ value, onSelect, options, placeholder, width }: DarkDropdownProps<T>) {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o.value === value);
  const label = selected?.label ?? placeholder ?? 'Select';

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVisible(true);
        }}
        style={width ? { width } : { flex: 1 }}
        className="flex-row items-center justify-between py-3 px-3"
      >
        <Text className="text-[#FFD700] font-semibold text-base">{label}</Text>
        <ChevronDown size={18} color="#FFD700" />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/70 justify-end" onPress={() => setVisible(false)}>
          <Pressable className="max-h-[50%] bg-[#0A1628] rounded-t-2xl border-t border-[#2E4A6F]" onPress={e => e.stopPropagation()}>
            <View className="py-3 border-b border-[#2E4A6F]">
              <Text className="text-white/60 text-center text-sm">Select option</Text>
            </View>
            <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    onSelect(opt.value);
                    setVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`py-4 px-4 ${opt.value === value ? 'bg-[#FFD700]/20' : ''}`}
                >
                  <Text className={opt.value === value ? 'text-[#FFD700] font-semibold' : 'text-white'}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

export default function SignUpScreen() {
  const router = useRouter();
  const signUpMutation = useSignUp();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const currentYear = new Date().getFullYear();
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(currentYear - 25);
  const [confirmAge18, setConfirmAge18] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const maxBirthYear = currentYear - 18;
  const years = useMemo(
    () => Array.from({ length: 82 }, (_, i) => maxBirthYear - i),
    [maxBirthYear]
  );
  const daysInMonth = useMemo(
    () => getDaysInMonth(birthYear, birthMonth),
    [birthYear, birthMonth]
  );
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  useEffect(() => {
    setBirthDay((d) => (d > daysInMonth ? daysInMonth : d));
  }, [daysInMonth]);

  const dateOfBirth = useMemo(() => {
    const d = new Date(birthYear, birthMonth - 1, Math.min(birthDay, daysInMonth));
    return isNaN(d.getTime()) ? null : d;
  }, [birthYear, birthMonth, birthDay, daysInMonth]);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  ];

  const handleSignUp = async () => {
    setError('');

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!passwordRequirements.every(r => r.met)) {
      setError('Please meet all password requirements');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (isApiConfigured()) {
      if (!dateOfBirth) {
        setError('Please enter your date of birth');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        setError('You must be 18 or older to create an account');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (!confirmAge18) {
        setError('Please confirm you are 18 years or older');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    signUpMutation.mutate(
      {
        email,
        password,
        username,
        dateOfBirth: dateOfBirth ? formatDateForAPI(dateOfBirth) : '',
        confirmAge18: confirmAge18 || !isApiConfigured(),
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSuccess(true);
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message || 'Sign up failed');
        },
      }
    );
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
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
              <Check size={48} color="#22C55E" />
            </View>
            <Text className="text-white text-2xl font-bold text-center">Account Created!</Text>
            <Text className="text-white/60 mt-3 text-center">
              We've sent a verification email to
            </Text>
            <Text className="text-[#FFD700] font-semibold mt-1">{email}</Text>
            <Text className="text-white/60 mt-3 text-center px-4">
              Please check your inbox and verify your email to access all features.
            </Text>

            <View className="w-full mt-8">
              <Pressable onPress={handleContinue} className="active:opacity-80">
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-4 items-center">
                    <Text className="text-[#0A1628] text-lg font-bold">Continue to App</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
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

          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Animated.View entering={FadeIn.delay(100)} className="mt-6 mb-8">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-3">
                  <Ticket size={24} color="#FFD700" />
                </View>
                <View>
                  <Text className="text-white text-2xl font-bold">Create Account</Text>
                  <Text className="text-white/60">Join Daily Dollar Lotto</Text>
                </View>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(200)}>
              {/* Username Input */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">Username</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <User size={20} color="#6B7C93" />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-4 px-3 text-white"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

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
              
              {/* Date of Birth (18+ verification) - Month, Day, Year pickers */}
              {isApiConfigured() && (
                <View className="mb-4">
                  <Text className="text-white/60 text-sm mb-2 ml-1">Date of Birth (must be 18+)</Text>
                  {/* Selected date display - prominent so user can see their choice */}
                  <View className="mb-2 py-2 px-4 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/40">
                    <Text className="text-[#FFD700] font-semibold text-center">
                      {dateOfBirth ? dateOfBirth.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : 'Select month, day, and year below'}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-[#1E3A5F]/60 rounded-xl border-2 border-[#FFD700]/30 overflow-hidden">
                    <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#2E4A6F' }}>
                      <DarkDropdown
                        value={birthMonth}
                        onSelect={setBirthMonth}
                        options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
                      />
                    </View>
                    <View style={{ width: 70, borderRightWidth: 1, borderRightColor: '#2E4A6F' }}>
                      <DarkDropdown
                        value={birthDay}
                        onSelect={setBirthDay}
                        options={days.map(d => ({ label: String(d), value: d }))}
                        width={70}
                      />
                    </View>
                    <View style={{ width: 90 }}>
                      <DarkDropdown
                        value={birthYear}
                        onSelect={setBirthYear}
                        options={years.map(y => ({ label: String(y), value: y }))}
                        width={90}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Password Input */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">Password</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <Lock size={20} color="#6B7C93" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
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
              

              {/* Password Requirements */}
              <View className="mb-4 bg-[#1E3A5F]/20 rounded-xl p-3 border border-[#2E4A6F]/30">
                {passwordRequirements.map((req, index) => (
                  <View key={index} className="flex-row items-center py-1">
                    <View
                      className={`w-5 h-5 rounded-full items-center justify-center mr-2 ${
                        req.met ? 'bg-[#22C55E]/20' : 'bg-white/5'
                      }`}
                    >
                      {req.met && <Check size={12} color="#22C55E" />}
                    </View>
                    <Text className={req.met ? 'text-[#22C55E] text-sm' : 'text-white/40 text-sm'}>
                      {req.label}
                    </Text>
                  </View>
                ))}
              </View>


              18+ Confirmation Checkbox
              {isApiConfigured() && (
                <Pressable
                  onPress={() => setConfirmAge18(!confirmAge18)}
                  className="flex-row items-center mb-4 bg-[#1E3A5F]/20 rounded-xl p-4 border border-[#2E4A6F]/30"
                >
                  <Checkbox
                    value={confirmAge18}
                    onValueChange={setConfirmAge18}
                    color={confirmAge18 ? '#FFD700' : undefined}
                  />
                  <Text className="text-white/90 text-sm ml-3 flex-1">
                    I confirm I am 18 years or older and agree to the age restrictions for this service.
                  </Text>
                </Pressable>
              )}

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text className="text-white/60 text-sm mb-2 ml-1">Confirm Password</Text>
                <View className="flex-row items-center bg-[#1E3A5F]/40 rounded-xl border border-[#2E4A6F]/50 px-4">
                  <Lock size={20} color="#6B7C93" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#6B7C93"
                    className="flex-1 py-4 px-3 text-white"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  {confirmPassword && password === confirmPassword && (
                    <Check size={20} color="#22C55E" />
                  )}
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-red-500/10 rounded-xl p-3 mb-4 border border-red-500/30">
                  <Text className="text-red-400 text-center text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Sign Up Button */}
              <Pressable
                onPress={handleSignUp}
                disabled={signUpMutation.isPending}
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
                      {signUpMutation.isPending ? 'Creating Account...' : 'Create Account'}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Terms */}
              <Text className="text-white/40 text-xs text-center mt-4">
                By creating an account, you agree to our{' '}
                <Text className="text-[#FFD700]">Terms & Conditions</Text> and{' '}
                <Text className="text-[#FFD700]">Privacy Policy</Text>
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

