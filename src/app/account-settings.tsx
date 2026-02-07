import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Calendar,
  Edit3,
  Check,
  X,
  Trash2,
  Shield,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { useLotteryStore } from '@/lib/state/lottery-store';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const signOut = useAuthStore(s => s.signOut);

  const ticketsPurchasedThisYear = useLotteryStore(s => s.ticketsPurchasedThisYear);
  const tickets = useLotteryStore(s => s.tickets);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username ?? '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const wonTickets = tickets.filter(t => t.status === 'won');
  const totalWinnings = wonTickets.reduce((sum, t) => sum + (t.prizeAmount ?? 0), 0);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleEditUsername = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewUsername(user?.username ?? '');
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    if (newUsername.trim().length < 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateUser({ username: newUsername.trim() });
    setIsEditingUsername(false);
  };

  const handleCancelEditUsername = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditingUsername(false);
    setNewUsername(user?.username ?? '');
  };

  const handleChangePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    // In production, verify current password on backend
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPasswordModal(false);
    Alert.alert('Success', 'Your password has been updated.');
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowDeleteModal(false);
    await signOut();
    router.replace('/');
    // In production, this would call an API to delete the account
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-6 pt-4 pb-6">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10 mr-4"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <Text className="text-white text-xl font-bold flex-1">Account Settings</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Avatar */}
          <Animated.View entering={FadeInDown.delay(100)} className="items-center px-6 mb-6">
            <View className="w-24 h-24 rounded-full bg-[#FFD700]/20 items-center justify-center mb-4">
              <User size={48} color="#FFD700" />
            </View>
            <Text className="text-white/50 text-sm">Tap to change photo</Text>
          </Animated.View>

          {/* Account Details */}
          <Animated.View entering={FadeInDown.delay(200)} className="px-6 mb-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Account Details
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              {/* Username */}
              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-3">
                      <User size={20} color="#FFD700" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white/50 text-xs">Username</Text>
                      {isEditingUsername ? (
                        <TextInput
                          value={newUsername}
                          onChangeText={setNewUsername}
                          autoFocus
                          className="text-white font-medium text-base py-1"
                          placeholderTextColor="#6B7C93"
                        />
                      ) : (
                        <Text className="text-white font-medium">{user?.username}</Text>
                      )}
                    </View>
                  </View>
                  {isEditingUsername ? (
                    <View className="flex-row">
                      <Pressable
                        onPress={handleCancelEditUsername}
                        className="w-9 h-9 rounded-full bg-white/10 items-center justify-center mr-2"
                      >
                        <X size={18} color="#EF4444" />
                      </Pressable>
                      <Pressable
                        onPress={handleSaveUsername}
                        className="w-9 h-9 rounded-full bg-green-500/20 items-center justify-center"
                      >
                        <Check size={18} color="#22C55E" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleEditUsername}
                      className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
                    >
                      <Edit3 size={16} color="#FFD700" />
                    </Pressable>
                  )}
                </View>
              </View>

              <View className="h-px bg-white/5 mx-4" />

              {/* Email */}
              <View className="p-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 items-center justify-center mr-3">
                    <Mail size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/50 text-xs">Email</Text>
                    <Text className="text-white font-medium">{user?.email}</Text>
                  </View>
                  <View className="bg-green-500/20 px-2 py-1 rounded-lg">
                    <Text className="text-green-500 text-xs">Verified</Text>
                  </View>
                </View>
              </View>

              <View className="h-px bg-white/5 mx-4" />

              {/* Member Since */}
              <View className="p-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 items-center justify-center mr-3">
                    <Calendar size={20} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/50 text-xs">Member Since</Text>
                    <Text className="text-white font-medium">{formatDate(user?.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Account Stats */}
          <Animated.View entering={FadeInDown.delay(300)} className="px-6 mb-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Account Statistics
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30 p-4">
              <View className="flex-row">
                <View className="flex-1 items-center py-2">
                  <Text className="text-[#FFD700] text-2xl font-bold">{ticketsPurchasedThisYear}</Text>
                  <Text className="text-white/50 text-xs mt-1">Tickets This Year</Text>
                </View>
                <View className="w-px bg-white/10" />
                <View className="flex-1 items-center py-2">
                  <Text className="text-[#22C55E] text-2xl font-bold">{wonTickets.length}</Text>
                  <Text className="text-white/50 text-xs mt-1">Total Wins</Text>
                </View>
                <View className="w-px bg-white/10" />
                <View className="flex-1 items-center py-2">
                  <Text className="text-[#3B82F6] text-2xl font-bold">${totalWinnings.toFixed(0)}</Text>
                  <Text className="text-white/50 text-xs mt-1">Winnings</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Security */}
          <Animated.View entering={FadeInDown.delay(400)} className="px-6 mb-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Security
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              <Pressable
                onPress={handleChangePassword}
                className="p-4 flex-row items-center active:bg-white/5 rounded-t-2xl"
              >
                <View className="w-10 h-10 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-3">
                  <Lock size={20} color="#FFD700" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">Change Password</Text>
                  <Text className="text-white/50 text-xs">Update your account password</Text>
                </View>
                <ChevronRight size={20} color="#6B7C93" />
              </Pressable>

              <View className="h-px bg-white/5 mx-4" />

              <Pressable
                onPress={() => router.push('/self-exclusion')}
                className="p-4 flex-row items-center active:bg-white/5 rounded-b-2xl"
              >
                <View className="w-10 h-10 rounded-xl bg-[#22C55E]/20 items-center justify-center mr-3">
                  <Shield size={20} color="#22C55E" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">Self-Exclusion</Text>
                  <Text className="text-white/50 text-xs">Manage responsible gaming settings</Text>
                </View>
                <ChevronRight size={20} color="#6B7C93" />
              </Pressable>
            </View>
          </Animated.View>

          {/* Danger Zone */}
          <Animated.View entering={FadeInDown.delay(500)} className="px-6">
            <Text className="text-red-400/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Danger Zone
            </Text>
            <Pressable
              onPress={handleDeleteAccount}
              className="bg-red-500/10 rounded-2xl border border-red-500/30 p-4 flex-row items-center active:bg-red-500/20"
            >
              <View className="w-10 h-10 rounded-xl bg-red-500/20 items-center justify-center mr-3">
                <Trash2 size={20} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text className="text-red-400 font-medium">Delete Account</Text>
                <Text className="text-red-400/60 text-xs">Permanently delete your account and all data</Text>
              </View>
              <ChevronRight size={20} color="#EF4444" />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-[#1E3A5F] rounded-2xl p-6 w-full max-w-sm border border-[#2E4A6F]">
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-[#FFD700]/20 items-center justify-center mb-3">
                <Lock size={28} color="#FFD700" />
              </View>
              <Text className="text-white text-xl font-bold">Change Password</Text>
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2">Current Password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#6B7C93"
                className="bg-[#0A1628] rounded-xl px-4 py-3 text-white"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white/60 text-sm mb-2">New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor="#6B7C93"
                className="bg-[#0A1628] rounded-xl px-4 py-3 text-white"
              />
            </View>

            <View className="mb-6">
              <Text className="text-white/60 text-sm mb-2">Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
                placeholderTextColor="#6B7C93"
                className="bg-[#0A1628] rounded-xl px-4 py-3 text-white"
              />
            </View>

            <View className="flex-row">
              <Pressable
                onPress={() => setShowPasswordModal(false)}
                className="flex-1 mr-2 active:opacity-80"
              >
                <View className="bg-[#2E4A6F] rounded-xl py-3 items-center">
                  <Text className="text-white font-semibold">Cancel</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={handleSavePassword}
                className="flex-1 ml-2 active:opacity-80"
              >
                <View className="bg-[#FFD700] rounded-xl py-3 items-center">
                  <Text className="text-[#0A1628] font-semibold">Update</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-[#1E3A5F] rounded-2xl p-6 w-full max-w-sm border border-red-500/30">
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-red-500/20 items-center justify-center mb-3">
                <Trash2 size={28} color="#EF4444" />
              </View>
              <Text className="text-white text-xl font-bold">Delete Account?</Text>
              <Text className="text-white/60 text-center mt-2">
                This action cannot be undone. All your data, tickets, and wallet balance will be permanently deleted.
              </Text>
            </View>

            <View className="flex-row mt-4">
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 mr-2 active:opacity-80"
              >
                <View className="bg-[#2E4A6F] rounded-xl py-3 items-center">
                  <Text className="text-white font-semibold">Cancel</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                className="flex-1 ml-2 active:opacity-80"
              >
                <View className="bg-red-500 rounded-xl py-3 items-center">
                  <Text className="text-white font-semibold">Delete</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
