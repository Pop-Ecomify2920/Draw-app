import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bell,
  Trophy,
  Clock,
  Megaphone,
  Mail,
  Shield,
  Wallet,
  BellOff,
} from 'lucide-react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import { useNotificationPrefsStore } from '@/lib/state/notification-prefs-store';

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const preferences = useNotificationPrefsStore(s => s.preferences);
  const loadPreferences = useNotificationPrefsStore(s => s.loadPreferences);
  const updatePreference = useNotificationPrefsStore(s => s.updatePreference);
  const isLoading = useNotificationPrefsStore(s => s.isLoading);

  useEffect(() => {
    if (user?.id) {
      loadPreferences(user.id);
    }
  }, [user?.id, loadPreferences]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleToggle = async (key: keyof typeof preferences, currentValue: boolean) => {
    if (!user?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updatePreference(user.id, key, !currentValue);
  };

  const handleToggleAll = async () => {
    if (!user?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const allEnabled = preferences.pushEnabled && preferences.emailEnabled;

    // Toggle main switches
    await updatePreference(user.id, 'pushEnabled', !allEnabled);
    await updatePreference(user.id, 'emailEnabled', !allEnabled);
  };

  const notificationSettings = [
    {
      key: 'drawResults' as const,
      icon: Trophy,
      title: 'Draw Results',
      description: 'Get notified when daily draws complete',
    },
    {
      key: 'drawReminders' as const,
      icon: Clock,
      title: 'Draw Reminders',
      description: 'Reminder before ticket sales close',
    },
    {
      key: 'winNotifications' as const,
      icon: Trophy,
      title: 'Win Notifications',
      description: 'Instant notification when you win',
    },
    {
      key: 'depositConfirmations' as const,
      icon: Wallet,
      title: 'Deposit Confirmations',
      description: 'Confirmation when you add funds',
    },
    {
      key: 'withdrawalUpdates' as const,
      icon: Wallet,
      title: 'Withdrawal Updates',
      description: 'Status updates on withdrawals',
    },
    {
      key: 'accountAlerts' as const,
      icon: Shield,
      title: 'Account Alerts',
      description: 'Security & account notifications',
    },
    {
      key: 'promotionalOffers' as const,
      icon: Megaphone,
      title: 'Promotions & News',
      description: 'Special offers and announcements',
    },
  ];

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
          <Text className="text-white text-xl font-bold flex-1">Notifications</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Master Toggles */}
          <View className="px-6 mb-6">
            <View className="bg-[#1E3A5F]/40 rounded-2xl border border-[#2E4A6F]/50">
              {/* Push Notifications */}
              <View className="p-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-4">
                      <Bell size={24} color="#FFD700" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">Push Notifications</Text>
                      <Text className="text-white/50 text-sm mt-1">Alerts on your device</Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.pushEnabled}
                    onValueChange={() => handleToggle('pushEnabled', preferences.pushEnabled)}
                    trackColor={{ false: '#2E4A6F', true: '#FFD700' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View className="h-px bg-white/10 mx-5" />

              {/* Email Notifications */}
              <View className="p-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 items-center justify-center mr-4">
                      <Mail size={24} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">Email Notifications</Text>
                      <Text className="text-white/50 text-sm mt-1">Updates to your email</Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.emailEnabled}
                    onValueChange={() => handleToggle('emailEnabled', preferences.emailEnabled)}
                    trackColor={{ false: '#2E4A6F', true: '#3B82F6' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Quiet Hours */}
          <View className="px-6 mb-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Quiet Hours
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl p-4 border border-[#2E4A6F]/30">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center mr-4">
                    <BellOff size={20} color={preferences.quietHoursEnabled ? '#FFD700' : '#6B7C93'} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Enable Quiet Hours</Text>
                    <Text className="text-white/50 text-sm">
                      {preferences.quietHoursStart} - {preferences.quietHoursEnd}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.quietHoursEnabled}
                  onValueChange={() => handleToggle('quietHoursEnabled', preferences.quietHoursEnabled)}
                  trackColor={{ false: '#2E4A6F', true: '#FFD700' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* Individual Settings */}
          <View className="px-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Notification Types
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              {notificationSettings.map((setting, index) => {
                const Icon = setting.icon;
                const isEnabled = preferences[setting.key];
                return (
                  <View key={setting.key}>
                    {index > 0 && <View className="h-px bg-white/5 mx-4" />}
                    <View className="flex-row items-center p-4">
                      <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center mr-4">
                        <Icon size={20} color={isEnabled ? '#FFD700' : '#6B7C93'} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-medium">{setting.title}</Text>
                        <Text className="text-white/50 text-sm">{setting.description}</Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => handleToggle(setting.key, isEnabled)}
                        trackColor={{ false: '#2E4A6F', true: '#FFD700' }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Info */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4">
              <Text className="text-white/40 text-xs text-center">
                Your notification preferences are saved automatically.
                {'\n'}Important security notifications will always be sent.
              </Text>
            </View>
          </View>

          {/* Last Updated */}
          {preferences.lastUpdated && (
            <View className="px-6 mt-4">
              <Text className="text-white/30 text-xs text-center">
                Last updated: {new Date(preferences.lastUpdated).toLocaleString()}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
