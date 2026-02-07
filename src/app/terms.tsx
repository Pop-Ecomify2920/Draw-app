import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, FileText } from 'lucide-react-native';

const termsContent = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing and using Daily Dollar Lotto, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use this service.',
  },
  {
    title: '2. Eligibility',
    content:
      'You must be at least 18 years old (or the legal gambling age in your jurisdiction) and located in a region where lottery participation is legal. You are responsible for ensuring compliance with local laws.',
  },
  {
    title: '3. Account Registration',
    content:
      'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.',
  },
  {
    title: '4. Ticket Purchases',
    content:
      'Each ticket costs $1.00. You may purchase a maximum of one ticket per day and 365 tickets per calendar year. All purchases are final and non-refundable.',
  },
  {
    title: '5. Daily Draw',
    content:
      'The draw occurs at 00:00 UTC daily. One winning ticket is selected using a provably fair random selection system. The entire prize pool (minus platform fees) is awarded to the winner.',
  },
  {
    title: '6. Prize Distribution',
    content:
      'Winnings are credited to your wallet balance after verification. Withdrawals are subject to identity verification and may take 3-5 business days to process.',
  },
  {
    title: '7. Platform Fees',
    content:
      'A platform fee of 10% is deducted from the prize pool to cover operational costs. This fee is automatically calculated before prize distribution.',
  },
  {
    title: '8. Responsible Gaming',
    content:
      'We encourage responsible gaming. Self-exclusion and spending limit tools are available. If you feel you have a gambling problem, please seek help from a professional organization.',
  },
  {
    title: '9. Privacy',
    content:
      'Your personal information is collected and processed in accordance with our Privacy Policy. We implement industry-standard security measures to protect your data.',
  },
  {
    title: '10. Limitation of Liability',
    content:
      'Daily Dollar Lotto is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: '11. Changes to Terms',
    content:
      'We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.',
  },
  {
    title: '12. Contact',
    content:
      'For questions about these Terms, please contact us at legal@dailydollarlotto.com or through our Help Center.',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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
          <Text className="text-white text-xl font-bold flex-1">Terms & Conditions</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View className="px-6 mb-6">
            <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-4">
                  <FileText size={24} color="#FFD700" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Legal Agreement</Text>
                  <Text className="text-white/50 text-sm mt-1">Last updated: January 2025</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Terms Content */}
          <View className="px-6">
            {termsContent.map((section, index) => (
              <View key={index} className="mb-6">
                <Text className="text-[#FFD700] font-semibold mb-2">{section.title}</Text>
                <Text className="text-white/70 text-sm leading-6">{section.content}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View className="px-6 mt-4">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4">
              <Text className="text-white/40 text-xs text-center">
                By using Daily Dollar Lotto, you acknowledge that you have read,
                {'\n'}understood, and agree to these Terms & Conditions.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
