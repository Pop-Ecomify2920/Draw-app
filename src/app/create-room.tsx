import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { X, Crown, Users, Sparkles, AlertCircle } from 'lucide-react-native';
import { useCreateRoom } from '@/lib/hooks';
import { useAuthStore } from '@/lib/state/auth-store';
import { isApiConfigured } from '@/lib/api';

export default function CreateRoomScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const createRoomMutation = useCreateRoom();

  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createButtonScale = useSharedValue(1);

  const createButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleCreate = async () => {
    if (!user) return;

    // Validation
    const trimmedName = roomName.trim();
    if (trimmedName.length < 3) {
      setError('Room name must be at least 3 characters');
      return;
    }
    if (trimmedName.length > 30) {
      setError('Room name must be 30 characters or less');
      return;
    }

    const maxPart = parseInt(maxParticipants, 10);
    if (isNaN(maxPart) || maxPart < 2 || maxPart > 100) {
      setError('Max participants must be between 2 and 100');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    createButtonScale.value = withSequence(withSpring(0.95), withSpring(1));

    setIsCreating(true);
    setError(null);

    try {
      if (isApiConfigured()) {
        const result = await createRoomMutation.mutateAsync({
          name: trimmedName,
          maxParticipants: maxPart,
        });
        const roomId = result?.id ?? (result as any)?.lobby?.id;
        if (!roomId) {
          throw new Error('Room created but no ID returned');
        }
        router.replace(`/room/${roomId}`);
      } else {
        const { useLobbyStore } = await import('@/lib/state/lobby-store');
        const room = useLobbyStore.getState().createRoom(trimmedName, user.id, user.username, maxPart);
        await useLobbyStore.getState().saveToStorage(user.id);
        router.replace(`/room/${room.id}`);
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const presetNames = [
    'Friday Night Draw',
    'Office Pool',
    'Family Lotto',
    'Weekend Winners',
    'Friends Raffle',
  ];

  return (
    <View className="flex-1 bg-[#0A1628]">
      <LinearGradient
        colors={['#0F2847', '#0A1628']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-6 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#FFD700]/20 items-center justify-center mr-3">
                <Crown size={20} color="#FFD700" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Create Room</Text>
                <Text className="text-white/50 text-sm">Host a private draw</Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-[#1E3A5F]/50 items-center justify-center active:opacity-70"
            >
              <X size={20} color="#6B7C93" />
            </Pressable>
          </View>

          <View className="flex-1 px-6">
            {/* Room Name Input */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
                Room Name
              </Text>
              <TextInput
                value={roomName}
                onChangeText={text => {
                  setRoomName(text);
                  setError(null);
                }}
                placeholder="Enter a name for your room"
                placeholderTextColor="#6B7C93"
                className="bg-[#1E3A5F]/50 rounded-2xl px-4 py-4 text-white text-lg border border-[#2E4A6F]"
                maxLength={30}
                autoFocus
              />
              <Text className="text-white/40 text-xs mt-2 text-right">
                {roomName.length}/30 characters
              </Text>
            </Animated.View>

            {/* Quick Name Suggestions */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mt-4">
              <Text className="text-white/40 text-xs mb-2">Quick suggestions:</Text>
              <View className="flex-row flex-wrap">
                {presetNames.map((name, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setRoomName(name);
                      setError(null);
                      Haptics.selectionAsync();
                    }}
                    className="bg-[#1E3A5F]/30 rounded-full px-3 py-2 mr-2 mb-2 active:opacity-70"
                  >
                    <Text className="text-white/60 text-xs">{name}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* Max Participants */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mt-6">
              <Text className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wide">
                Max Participants
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  value={maxParticipants}
                  onChangeText={text => {
                    const num = text.replace(/[^0-9]/g, '');
                    setMaxParticipants(num);
                    setError(null);
                  }}
                  placeholder="50"
                  placeholderTextColor="#6B7C93"
                  keyboardType="number-pad"
                  className="bg-[#1E3A5F]/50 rounded-2xl px-4 py-4 text-white text-lg border border-[#2E4A6F] flex-1"
                  maxLength={3}
                />
                <View className="ml-4 flex-row items-center">
                  <Users size={16} color="#6B7C93" />
                  <Text className="text-white/50 text-sm ml-2">players</Text>
                </View>
              </View>
              <Text className="text-white/40 text-xs mt-2">
                Between 2 and 100 participants
              </Text>
            </Animated.View>

            {/* Error Message */}
            {error && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                className="mt-4 bg-[#EF4444]/20 rounded-xl p-4 flex-row items-center"
              >
                <AlertCircle size={20} color="#EF4444" />
                <Text className="text-[#EF4444] ml-3 flex-1">{error}</Text>
              </Animated.View>
            )}

            {/* Info Card */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mt-6">
              <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color="#FFD700" />
                  <Text className="text-white/60 text-sm ml-2 font-medium">
                    How it works
                  </Text>
                </View>
                <Text className="text-white/50 text-sm leading-5">
                  You'll get a unique 6-character code to share with players.
                  Each player buys a $1 ticket from their wallet.
                  As host, you decide when to draw the winner!
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Create Button */}
          <View className="px-6 pb-8">
            <Animated.View style={createButtonStyle}>
              <Pressable
                onPress={handleCreate}
                disabled={isCreating || roomName.trim().length < 3}
                className="active:opacity-90"
              >
                <LinearGradient
                  colors={
                    roomName.trim().length >= 3
                      ? ['#FFD700', '#FFA500']
                      : ['#2E4A6F', '#1E3A5F']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-5 flex-row items-center justify-center">
                    <Crown
                      size={24}
                      color={roomName.trim().length >= 3 ? '#0A1628' : '#6B7C93'}
                    />
                    <Text
                      className={`text-lg font-bold ml-3 ${
                        roomName.trim().length >= 3 ? 'text-[#0A1628]' : 'text-[#6B7C93]'
                      }`}
                    >
                      {isCreating ? 'Creating Room...' : 'Create Room'}
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
