import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SplitProvider } from '@/contexts/SplitContext';
import { UpdateHandler } from '@/components/UpdateHandler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const appState = useRef(AppState.currentState);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    OutfitRegular: Outfit_400Regular,
    OutfitMedium: Outfit_500Medium,
    OutfitSemiBold: Outfit_600SemiBold,
    OutfitBold: Outfit_700Bold,
    OutfitExtraBold: Outfit_800ExtraBold,
  });

  // Track app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const handleReset = useCallback(() => {
    // Send the user back to a known-good starting point after a crash.
    SplashScreen.hideAsync();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary onReset={handleReset}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider value={DefaultTheme}>
            <SplitProvider>
              <ToastProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'none', // Disable animations completely for reliability
                    gestureEnabled: false, // Disable gestures
                    gestureDirection: 'horizontal',
                    fullScreenGestureEnabled: false,
                    animationDuration: 0, // No animation duration
                    animationTypeForReplace: 'pop',
                    presentation: 'card', // Use simple card presentation
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="+not-found" />
                  <Stack.Screen name="split/people" />
                  <Stack.Screen name="split/camera" />
                  <Stack.Screen name="split/review" />
                  <Stack.Screen name="split/items" />
                  <Stack.Screen name="split/tip" />
                  <Stack.Screen name="split/results" />
                </Stack>
                <StatusBar style="dark" />
                <UpdateHandler />
              </ToastProvider>
            </SplitProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
