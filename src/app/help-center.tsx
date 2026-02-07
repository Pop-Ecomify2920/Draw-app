import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  ChevronRight,
  FileQuestion,
  Ticket,
  CreditCard,
  Trophy,
  Shield,
  Play,
  Sparkles,
} from 'lucide-react-native';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I buy a ticket?',
    answer: 'From the Home screen, tap "Buy Ticket" and confirm your purchase. Each ticket costs $1 and you can buy one per day.',
  },
  {
    question: 'When is the daily draw?',
    answer: 'The draw happens at 00:00 UTC every day. Ticket sales close at draw time.',
  },
  {
    question: 'How do I know if I won?',
    answer: 'You\'ll receive a notification if you win. You can also check your ticket status in the "My Tickets" tab.',
  },
  {
    question: 'How do I withdraw winnings?',
    answer: 'Winnings are automatically added to your wallet. You can withdraw to your linked bank account from the Profile section.',
  },
  {
    question: 'What is the annual ticket limit?',
    answer: 'You can purchase a maximum of 365 tickets per calendar year to promote responsible play.',
  },
];

interface ContactOption {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action: () => void;
}

export default function HelpCenterScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const contactOptions: ContactOption[] = [
    {
      icon: MessageCircle,
      title: 'Live Chat',
      subtitle: 'Chat with our support team',
      action: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    },
    {
      icon: Mail,
      title: 'Email Support',
      subtitle: 'support@dailydollarlotto.com',
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL('mailto:support@dailydollarlotto.com');
      },
    },
    {
      icon: Phone,
      title: 'Phone Support',
      subtitle: '1-800-DDL-HELP',
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL('tel:1-800-335-4357');
      },
    },
  ];

  const [expandedFAQ, setExpandedFAQ] = React.useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFAQ(expandedFAQ === index ? null : index);
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
          <Text className="text-white text-xl font-bold flex-1">Help Center</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Help */}
          <View className="px-6 mb-6">
            <View className="bg-[#1E3A5F]/40 rounded-2xl p-5 border border-[#2E4A6F]/50">
              <View className="flex-row items-center mb-4">
                <HelpCircle size={24} color="#FFD700" />
                <Text className="text-white font-semibold text-lg ml-3">How can we help?</Text>
              </View>
              <View className="flex-row flex-wrap">
                {[
                  { icon: Ticket, label: 'Tickets' },
                  { icon: CreditCard, label: 'Payments' },
                  { icon: Trophy, label: 'Winnings' },
                  { icon: Shield, label: 'Account' },
                ].map((item, index) => (
                  <Pressable
                    key={index}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    className="w-1/2 p-2"
                  >
                    <View className="bg-[#0A1628]/50 rounded-xl p-4 items-center active:opacity-70">
                      <item.icon size={24} color="#FFD700" />
                      <Text className="text-white/80 text-sm mt-2">{item.label}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Demo Win Section */}
          <View className="px-6 mb-6">
            <View className="bg-gradient-to-r from-[#FFD700]/10 to-[#FF6B6B]/10 rounded-2xl p-5 border border-[#FFD700]/30">
              <View className="flex-row items-center mb-3">
                <Sparkles size={22} color="#FFD700" />
                <Text className="text-white font-semibold text-lg ml-3">See What Winning Looks Like</Text>
              </View>
              <Text className="text-white/60 text-sm mb-4">
                Curious about the winning experience? Try our demonstration to see the celebration animation when you win.
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/demo-win');
                }}
                className="bg-[#FFD700] rounded-xl py-3 flex-row items-center justify-center active:opacity-90"
              >
                <Play size={18} color="#0A1628" fill="#0A1628" />
                <Text className="text-[#0A1628] font-bold ml-2">View Demo Win</Text>
              </Pressable>
              <Text className="text-white/40 text-xs text-center mt-3">
                This is a demonstration only - no actual prize awarded
              </Text>
            </View>
          </View>

          {/* FAQs */}
          <View className="px-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Frequently Asked Questions
            </Text>
            {faqs.map((faq, index) => (
              <Pressable
                key={index}
                onPress={() => toggleFAQ(index)}
                className="mb-3"
              >
                <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30 overflow-hidden">
                  <View className="flex-row items-center p-4">
                    <FileQuestion size={20} color="#FFD700" />
                    <Text className="text-white font-medium ml-3 flex-1">{faq.question}</Text>
                    <ChevronRight
                      size={20}
                      color="#6B7C93"
                      style={{
                        transform: [{ rotate: expandedFAQ === index ? '90deg' : '0deg' }],
                      }}
                    />
                  </View>
                  {expandedFAQ === index && (
                    <View className="px-4 pb-4 pt-0">
                      <View className="bg-[#0A1628]/50 rounded-xl p-3">
                        <Text className="text-white/70 text-sm leading-5">{faq.answer}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Contact Options */}
          <View className="px-6 mt-6">
            <Text className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
              Contact Us
            </Text>
            <View className="bg-[#1E3A5F]/20 rounded-2xl border border-[#2E4A6F]/30">
              {contactOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <View key={index}>
                    {index > 0 && <View className="h-px bg-white/5 mx-4" />}
                    <Pressable
                      onPress={option.action}
                      className="flex-row items-center p-4 active:bg-white/5"
                    >
                      <View className="w-10 h-10 rounded-xl bg-[#FFD700]/20 items-center justify-center mr-4">
                        <Icon size={20} color="#FFD700" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-medium">{option.title}</Text>
                        <Text className="text-white/50 text-sm">{option.subtitle}</Text>
                      </View>
                      <ChevronRight size={20} color="#6B7C93" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Support Hours */}
          <View className="px-6 mt-6">
            <View className="bg-[#1E3A5F]/10 rounded-xl p-4">
              <Text className="text-white/40 text-xs text-center">
                Support available 24/7
                {'\n'}Average response time: under 2 hours
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
