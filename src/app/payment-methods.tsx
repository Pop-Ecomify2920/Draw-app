import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  Check,
} from 'lucide-react-native';

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiry: string;
  isDefault: boolean;
}

const mockPaymentMethods: PaymentMethod[] = [
  { id: '1', type: 'visa', last4: '4242', expiry: '12/26', isDefault: true },
  { id: '2', type: 'mastercard', last4: '8888', expiry: '03/25', isDefault: false },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [showAddCard, setShowAddCard] = useState(false);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSetDefault = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentMethods(methods =>
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
  };

  const handleDelete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPaymentMethods(methods => methods.filter(m => m.id !== id));
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'visa':
        return 'VISA';
      case 'mastercard':
        return 'MC';
      case 'amex':
        return 'AMEX';
      default:
        return 'CARD';
    }
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
          <Text className="text-white text-xl font-bold flex-1">Payment Methods</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Payment Methods List */}
          <View className="px-6">
            {paymentMethods.map((method) => (
              <View
                key={method.id}
                className="bg-[#1E3A5F]/40 rounded-2xl p-4 mb-3 border border-[#2E4A6F]/50"
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-10 rounded-lg bg-white/10 items-center justify-center mr-4">
                    <Text className="text-white font-bold text-xs">{getCardIcon(method.type)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">•••• {method.last4}</Text>
                    <Text className="text-white/50 text-sm">Expires {method.expiry}</Text>
                  </View>
                  {method.isDefault && (
                    <View className="bg-[#22C55E]/20 px-3 py-1 rounded-full mr-2">
                      <Text className="text-[#22C55E] text-xs font-semibold">Default</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row mt-4 pt-4 border-t border-white/10">
                  {!method.isDefault && (
                    <Pressable
                      onPress={() => handleSetDefault(method.id)}
                      className="flex-row items-center mr-6 active:opacity-70"
                    >
                      <Check size={16} color="#FFD700" />
                      <Text className="text-[#FFD700] text-sm ml-2">Set Default</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleDelete(method.id)}
                    className="flex-row items-center active:opacity-70"
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text className="text-red-400 text-sm ml-2">Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {paymentMethods.length === 0 && (
              <View className="bg-[#1E3A5F]/20 rounded-2xl p-8 items-center">
                <CreditCard size={48} color="#6B7C93" />
                <Text className="text-white/50 mt-4 text-center">
                  No payment methods added yet
                </Text>
              </View>
            )}
          </View>

          {/* Add New Card */}
          <View className="px-6 mt-6">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAddCard(!showAddCard);
              }}
              className="active:opacity-80"
            >
              <View className="bg-[#1E3A5F]/20 rounded-2xl p-4 border border-[#2E4A6F]/30 border-dashed flex-row items-center justify-center">
                <Plus size={20} color="#FFD700" />
                <Text className="text-[#FFD700] font-semibold ml-2">Add Payment Method</Text>
              </View>
            </Pressable>
          </View>

          {showAddCard && (
            <View className="px-6 mt-4">
              <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
                <Text className="text-white font-semibold mb-4">Add New Card</Text>

                <View className="mb-4">
                  <Text className="text-white/60 text-sm mb-2">Card Number</Text>
                  <TextInput
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#6B7C93"
                    className="bg-[#0A1628] rounded-xl px-4 py-3 text-white"
                    keyboardType="numeric"
                  />
                </View>

                <View className="flex-row mb-4">
                  <View className="flex-1 mr-2">
                    <Text className="text-white/60 text-sm mb-2">Expiry</Text>
                    <TextInput
                      placeholder="MM/YY"
                      placeholderTextColor="#6B7C93"
                      className="bg-[#0A1628] rounded-xl px-4 py-3 text-white"
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-white/60 text-sm mb-2">CVC</Text>
                    <TextInput
                      placeholder="123"
                      placeholderTextColor="#6B7C93"
                      className="bg-[#0A1628] rounded-xl px-4 py-3 text-white"
                      keyboardType="numeric"
                      secureTextEntry
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowAddCard(false);
                  }}
                  className="active:opacity-80"
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 12 }}
                  >
                    <View className="py-4 items-center">
                      <Text className="text-[#0A1628] font-bold">Save Card</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {/* Info */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4">
              <Text className="text-white/40 text-xs text-center">
                Your payment information is encrypted and securely stored.
                {'\n'}We never store your full card number.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
