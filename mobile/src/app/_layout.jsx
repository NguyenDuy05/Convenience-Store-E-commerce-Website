import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { useReducedMotion } from 'react-native-reanimated';
import { SessionProvider } from '../context/Session';
import { colors } from '../theme/tokens';
import { Screen, Notice } from '../components/ui';
import WelcomeFlow, { BrandSplash } from '../features/onboarding/WelcomeFlow';
import { ToastProvider } from '../context/Toast';
import { configurationError } from '../services/api';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      retry: (count, error) => count < 1 && (!error.response || error.response.status >= 500),
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});
export const unstable_settings = { initialRouteName: '(tabs)' };
export default function Layout() {
  const [loaded, fontError] = useFonts({
    Baloo: require('../../assets/fonts/baloo-2-variable.ttf'),
    Inter: require('../../assets/fonts/inter-variable.ttf'),
  });
  const reduce = useReducedMotion();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
  if (!loaded && !fontError)
    return (
      <SafeAreaProvider>
        <BrandSplash />
      </SafeAreaProvider>
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <ToastProvider>
              <WelcomeFlow>
                <StatusBar style="dark" />
                {configurationError ? (
                  <Screen>
                    <Notice error>{configurationError}</Notice>
                  </Screen>
                ) : (
                  <Stack
                    screenOptions={{
                      headerTintColor: colors.ink,
                      headerStyle: { backgroundColor: colors.paper },
                      headerShadowVisible: false,
                      contentStyle: { backgroundColor: colors.paper },
                      animation: reduce ? 'none' : 'slide_from_right',
                      headerBackTitle: 'Back',
                      headerTitleStyle: { fontFamily: 'Baloo', fontSize: 24 },
                    }}
                  >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="login"
                      options={{ title: 'Your QUICK account', presentation: 'modal' }}
                    />
                    {[
                      'product/[id]',
                      'checkout',
                      'payment-result',
                      'order/[id]',
                      'profile',
                      'password',
                      'reset-password',
                      'addresses',
                      'membership',
                      'wallet',
                      'notifications',
                      'reviews',
                      'support',
                      'support/[id]',
                      'promotions',
                    ].map((name) => (
                      <Stack.Screen
                        key={name}
                        name={name}
                        options={{
                          title:
                            {
                              'product/[id]': 'A closer look',
                              'order/[id]': 'Your pickup',
                              'payment-result': 'Payment',
                              'reset-password': 'Reset password',
                              'support/[id]': 'Support request',
                            }[name] || name[0].toUpperCase() + name.slice(1),
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </WelcomeFlow>
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
