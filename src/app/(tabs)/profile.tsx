import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  User,
  Wallet,
  CreditCard,
  Shield,
  Bell,
  HelpCircle,
  FileText,
  ChevronRight,
  LogOut,
  Trophy,
  Ticket,
  AlertTriangle,
  DollarSign,
  LogIn,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';
import { useLotteryStore } from '@/lib/state/lottery-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { useSignOut, useUserProfile } from '@/lib/hooks';
import { isApiConfigured } from '@/lib/api';
import * as Haptics from 'expo-haptics';

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  iconColor?: string;
}

const MenuItem = ({ icon: Icon, label, value, onPress, danger, iconColor }: MenuItemProps) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center py-4 px-4 active:bg-white/5 rounded-xl"
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: (iconColor ?? (danger ? '#EF4444' : '#FFD700')) + '20' }}
      >
        <Icon size={20} color={iconColor ?? (danger ? '#EF4444' : '#FFD700')} />
      </View>
      <Text
        className={`flex-1 ml-3 font-medium ${danger ? 'text-red-400' : 'text-white'}`}
      >
        {label}
      </Text>
      {value && <Text className="text-white/50 mr-2">{value}</Text>}
      <ChevronRight size={20} color={danger ? '#EF4444' : '#6B7C93'} />
    </Pressable>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const signOutMutation = useSignOut();

  const walletBalance = useLotteryStore(s => s.walletBalance);
  const ticketsPurchasedThisYear = useLotteryStore(s => s.ticketsPurchasedThisYear);
  const tickets = useLotteryStore(s => s.tickets);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const { data: profile } = useUserProfile();
  // Show Admin Dashboard when: profile/user has isAdmin, or known admin account (backend still enforces)
  const isAdmin = isApiConfigured() && (
    profile?.isAdmin === true ||
    user?.isAdmin === true ||
    user?.username === 'admin_ollie' ||
    user?.email === 'ollie.bryant08@icloud.com'
  );

  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const wonTickets = tickets.filter(t => t.status === 'won');
  const totalWinnings = wonTickets.reduce((sum, t) => sum + (t.prizeAmount ?? 0), 0);

  // Calculate member since from user createdAt
  const getMemberSince = () => {
    if (!user?.createdAt) return 'New member';
    const date = new Date(user.createdAt);
    return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sign-in');
  };

  const handleSignOutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSignOutModal(true);
  };

  const handleSignOutConfirm = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSignOutModal(false);
    signOutMutation.mutate();
  };

  const handleSignOutCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSignOutModal(false);
  };

  // Not authenticated - show sign in prompt
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-[#0A1628]">
        <LinearGradient
          colors={['#0A1628', '#0F2847', '#0A1628']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        />

        <SafeAreaView className="flex-1" edges={['top']}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="px-6 pt-4 pb-2">
              <Text className="text-white text-2xl font-bold">Profile</Text>
            </View>

            {/* Sign In Prompt */}
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-24 h-24 rounded-full bg-[#FFD700]/20 items-center justify-center mb-6">
                <User size={48} color="#FFD700" />
              </View>
              <Text className="text-white text-2xl font-bold text-center">
                Sign in to your account
              </Text>
              <Text className="text-white/60 text-center mt-3 px-8">
                Create an account or sign in to track your tickets, manage your wallet, and play responsibly.
              </Text>

              <Pressable
                onPress={handleSignIn}
                className="mt-8 active:opacity-80"
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="px-8 py-4 flex-row items-center">
                    <LogIn size={20} color="#0A1628" />
                    <Text className="text-[#0A1628] font-bold text-lg ml-2">Sign In</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => router.push('/sign-up')}
                className="mt-4 active:opacity-70"
              >
                <Text className="text-white/60">
                  Don't have an account? <Text className="text-[#FFD700] font-semibold">Sign Up</Text>
                </Text>
              </Pressable>
            </View>

            {/* Support links still accessible */}
            <View className="px-6 mt-8">
              <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
                Support
              </Text>
              <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
                <MenuItem
                  icon={HelpCircle}
                  label="Help Center"
                  onPress={() => router.push('/help-center')}
                />
                <View className="h-px bg-white/5 mx-4" />
                <MenuItem
                  icon={FileText}
                  label="Terms & Conditions"
                  onPress={() => router.push('/terms')}
                />
              </View>
            </View>

            {/* Version */}
            <View className="items-center mt-8">
              <Text className="text-white/30 text-xs">Daily Dollar Lotto v1.0.0</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Authenticated user view
  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0A1628', '#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-2">
            <Text className="text-white text-2xl font-bold">Profile</Text>
          </View>

          {/* Profile Card */}
          <View className="px-6 mt-4">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/account-settings');
              }}
              className="active:opacity-90"
            >
              <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-full bg-[#FFD700]/20 items-center justify-center">
                    <User size={32} color="#FFD700" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white text-xl font-bold">{user?.username}</Text>
                    <Text className="text-white/50 text-sm mt-1">{getMemberSince()}</Text>
                  </View>
                  <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                    <Settings size={20} color="#FFD700" />
                  </View>
                </View>

                {/* Stats */}
                <View className="flex-row mt-5 pt-5 border-t border-white/10">
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center">
                      <Ticket size={14} color="#FFD700" />
                      <Text className="text-white/60 text-xs ml-1">Tickets</Text>
                    </View>
                    <Text className="text-white font-bold text-lg mt-1">
                      {ticketsPurchasedThisYear}
                    </Text>
                  </View>
                  <View className="w-px bg-white/10" />
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center">
                      <Trophy size={14} color="#22C55E" />
                      <Text className="text-white/60 text-xs ml-1">Wins</Text>
                    </View>
                    <Text className="text-white font-bold text-lg mt-1">
                      {wonTickets.length}
                    </Text>
                  </View>
                  <View className="w-px bg-white/10" />
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center">
                      <Wallet size={14} color="#3B82F6" />
                      <Text className="text-white/60 text-xs ml-1">Won</Text>
                    </View>
                    <Text className="text-[#22C55E] font-bold text-lg mt-1">
                      ${totalWinnings.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Wallet Balance */}
          <View className="px-6 mt-4">
            <Pressable onPress={() => router.push('/add-funds')} className="active:opacity-80">
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16 }}
              >
                <View className="flex-row items-center justify-between p-5">
                  <View className="flex-row items-center">
                    <Wallet size={24} color="#0A1628" />
                    <View className="ml-3">
                      <Text className="text-[#0A1628]/70 text-sm">Wallet Balance</Text>
                      <Text className="text-[#0A1628] text-2xl font-bold">
                        ${walletBalance.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-[#0A1628]/20 px-4 py-2 rounded-full">
                    <Text className="text-[#0A1628] font-semibold">Add Funds</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Menu Sections */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
              Account
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              <MenuItem
                icon={CreditCard}
                label="Payment Methods"
                onPress={() => router.push('/payment-methods')}
              />
              <View className="h-px bg-white/5 mx-4" />
              <MenuItem
                icon={Bell}
                label="Notifications"
                value="On"
                onPress={() => router.push('/notifications')}
              />
            </View>
          </View>

          {isAdmin && (
            <View className="px-6 mt-6">
              <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
                Admin
              </Text>
              <View className="bg-[#FFD700]/10 rounded-2xl border border-[#FFD700]/30">
                <MenuItem
                  icon={ShieldCheck}
                  label="Admin Dashboard"
                  value="Stats & Payments"
                  onPress={() => router.push('/admin-dashboard')}
                  iconColor="#FFD700"
                />
              </View>
            </View>
          )}

          <View className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
              Responsible Play
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              <MenuItem
                icon={Shield}
                label="Self-Exclusion"
                iconColor="#22C55E"
                onPress={() => router.push('/self-exclusion')}
              />
              <View className="h-px bg-white/5 mx-4" />
              <MenuItem
                icon={DollarSign}
                label="Spending Limits"
                iconColor="#22C55E"
                onPress={() => router.push('/spending-limits')}
              />
            </View>
          </View>

          <View className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
              Support
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              <MenuItem
                icon={HelpCircle}
                label="Help Center"
                onPress={() => router.push('/help-center')}
              />
              <View className="h-px bg-white/5 mx-4" />
              <MenuItem
                icon={FileText}
                label="Terms & Conditions"
                onPress={() => router.push('/terms')}
              />
            </View>
          </View>

          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              <MenuItem
                icon={LogOut}
                label="Sign Out"
                danger
                onPress={handleSignOutPress}
              />
            </View>
          </View>

          {/* Version */}
          <View className="items-center mt-8">
            <Text className="text-white/30 text-xs">Daily Dollar Lotto v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={handleSignOutCancel}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-[#1E3A5F] rounded-2xl p-6 w-full max-w-sm border border-[#2E4A6F]">
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-red-500/20 items-center justify-center mb-3">
                <AlertTriangle size={28} color="#EF4444" />
              </View>
              <Text className="text-white text-xl font-bold">Sign Out?</Text>
              <Text className="text-white/60 text-center mt-2">
                Are you sure you want to sign out of your account?
              </Text>
            </View>

            <View className="flex-row mt-4">
              <Pressable
                onPress={handleSignOutCancel}
                className="flex-1 mr-2 active:opacity-80"
              >
                <View className="bg-[#2E4A6F] rounded-xl py-3 items-center">
                  <Text className="text-white font-semibold">Cancel</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={handleSignOutConfirm}
                className="flex-1 ml-2 active:opacity-80"
              >
                <View className="bg-red-500 rounded-xl py-3 items-center">
                  <Text className="text-white font-semibold">Sign Out</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
