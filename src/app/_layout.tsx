import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAuthStore } from '@/lib/state/auth-store';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const loadAuth = useAuthStore(s => s.loadAuth);
  const isLoading = useAuthStore(s => s.isLoading);

  useEffect(() => {
    const timer = setTimeout(() => {
      useAuthStore.setState({ isLoading: false });
    }, 3000);
    loadAuth()
      .finally(() => {
        clearTimeout(timer);
        useAuthStore.setState({ isLoading: false });
        SplashScreen.hideAsync();
      })
      .catch(() => {
        clearTimeout(timer);
        useAuthStore.setState({ isLoading: false });
        SplashScreen.hideAsync();
      });
    return () => clearTimeout(timer);
  }, [loadAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A1628', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: '#fff', marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A1628' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="purchase"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="ticket-details"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="payment-methods"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="self-exclusion"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="spending-limits"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="help-center"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="add-funds"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="sign-in"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="demo-win"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="account-settings"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="draw-details"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="draw-history"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="why-fair"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="draw-stats"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="create-room"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="join-room"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="lobby-how-to-play"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="room/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
