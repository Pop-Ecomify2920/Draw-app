import React, { useState, useRef } from 'react';
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
import { X, LogIn as JoinIcon, Users, AlertCircle, Ticket } from 'lucide-react-native';
import { useJoinRoom } from '@/lib/hooks';
import { useLobbyStore } from '@/lib/state/lobby-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { isApiConfigured } from '@/lib/api';

export default function JoinRoomScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const joinRoomMutation = useJoinRoom();
  const joinRoom = useLobbyStore(s => s.joinRoom);
  const getRoomByCode = useLobbyStore(s => s.getRoomByCode);
  const saveToStorage = useLobbyStore(s => s.saveToStorage);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [previewRoom, setPreviewRoom] = useState<{
    name: string;
    participants: number;
    prizePool: number;
    status: string;
  } | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const joinButtonScale = useSharedValue(1);

  const joinButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: joinButtonScale.value }],
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleCodeChange = (text: string, index: number) => {
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newCode = code.split('');

    if (char.length === 0) {
      // Backspace
      newCode[index] = '';
      setCode(newCode.join(''));
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (char.length === 1) {
      newCode[index] = char;
      setCode(newCode.join(''));
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check for room preview when code is complete
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        checkRoomPreview(fullCode);
      }
    } else if (char.length > 1) {
      // Pasted code
      const pastedCode = char.slice(0, 6);
      setCode(pastedCode);
      if (pastedCode.length === 6) {
        checkRoomPreview(pastedCode);
        inputRefs.current[5]?.focus();
      }
    }

    setError(null);
  };

  const checkRoomPreview = (roomCode: string) => {
    if (!isApiConfigured()) {
      const room = getRoomByCode(roomCode);
      if (room) {
        setPreviewRoom({
          name: room.name,
          participants: room.participants.length,
          prizePool: room.prizePool,
          status: room.status,
        });
      } else {
        setPreviewRoom(null);
      }
    } else {
      setPreviewRoom({ name: 'Room', participants: 0, prizePool: 0, status: 'open' });
    }
  };

  const handleJoin = async () => {
    if (!user || code.length !== 6) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    joinButtonScale.value = withSequence(withSpring(0.95), withSpring(1));

    setIsJoining(true);
    setError(null);

    try {
      if (isApiConfigured()) {
        const result = await joinRoomMutation.mutateAsync(code);
        router.replace(`/room/${result.id}`);
      } else {
        const room = joinRoom(code, user.id, user.username);
        if (!room) {
          setError('Room not found or no longer accepting players');
          return;
        }
        await saveToStorage(user.id);
        router.replace(`/room/${room.id}`);
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return '#6B7C93';
      case 'open':
        return '#22C55E';
      case 'locked':
        return '#FFA500';
      default:
        return '#6B7C93';
    }
  };

  const codeChars = code.padEnd(6, ' ').split('');

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
                <JoinIcon size={20} color="#FFD700" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Join Room</Text>
                <Text className="text-white/50 text-sm">Enter access code</Text>
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
            {/* Code Input */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text className="text-white/60 text-sm font-medium mb-4 uppercase tracking-wide text-center">
                Enter 6-Character Code
              </Text>
              <View className="flex-row justify-center">
                {codeChars.map((char, index) => (
                  <View key={index} className="mx-1">
                    <TextInput
                      ref={ref => {
                        inputRefs.current[index] = ref;
                      }}
                      value={char.trim()}
                      onChangeText={text => handleCodeChange(text, index)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !codeChars[index].trim() && index > 0) {
                          handleCodeChange('', index);
                        }
                      }}
                      maxLength={6}
                      autoCapitalize="characters"
                      className="w-12 h-14 bg-[#1E3A5F]/50 rounded-xl text-white text-2xl font-bold text-center border border-[#2E4A6F]"
                      style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
                    />
                  </View>
                ))}
              </View>
              <Text className="text-white/40 text-xs mt-4 text-center">
                Ask the room host for the access code
              </Text>
            </Animated.View>

            {/* Room Preview */}
            {previewRoom && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                className="mt-6"
              >
                <View className="bg-[#1E3A5F]/50 rounded-2xl p-4 border border-[#22C55E]/50">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white font-bold text-lg">{previewRoom.name}</Text>
                    <View
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: `${getStatusColor(previewRoom.status)}20` }}
                    >
                      <Text
                        className="text-xs font-medium capitalize"
                        style={{ color: getStatusColor(previewRoom.status) }}
                      >
                        {previewRoom.status}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Users size={16} color="#6B7C93" />
                      <Text className="text-white/60 text-sm ml-2">
                        {previewRoom.participants} player{previewRoom.participants !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ticket size={16} color="#FFD700" />
                      <Text className="text-[#FFD700] font-semibold ml-2">
                        ${previewRoom.prizePool.toFixed(2)} pool
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

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
            <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mt-6">
              <View className="bg-[#1E3A5F]/30 rounded-2xl p-4 border border-[#2E4A6F]/50">
                <View className="flex-row items-center mb-3">
                  <Users size={16} color="#FFD700" />
                  <Text className="text-white/60 text-sm ml-2 font-medium">
                    What happens next?
                  </Text>
                </View>
                <Text className="text-white/50 text-sm leading-5">
                  Once you join, you can buy a $1 ticket from your wallet balance.
                  The more players who join, the bigger the prize pool!
                  The host will draw the winner when ready.
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Join Button */}
          <View className="px-6 pb-8">
            <Animated.View style={joinButtonStyle}>
              <Pressable
                onPress={handleJoin}
                disabled={isJoining || code.length !== 6}
                className="active:opacity-90"
              >
                <LinearGradient
                  colors={code.length === 6 ? ['#FFD700', '#FFA500'] : ['#2E4A6F', '#1E3A5F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="py-5 flex-row items-center justify-center">
                    <JoinIcon size={24} color={code.length === 6 ? '#0A1628' : '#6B7C93'} />
                    <Text
                      className={`text-lg font-bold ml-3 ${
                        code.length === 6 ? 'text-[#0A1628]' : 'text-[#6B7C93]'
                      }`}
                    >
                      {isJoining ? 'Joining...' : 'Join Room'}
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
