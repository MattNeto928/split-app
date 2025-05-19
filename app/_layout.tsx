import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
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

import { useColorScheme } from '@/hooks/useColorScheme';
import { SplitProvider } from '@/contexts/SplitContext';
import { UpdateHandler } from '@/components/UpdateHandler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    OutfitRegular: Outfit_400Regular,
    OutfitMedium: Outfit_500Medium,
    OutfitSemiBold: Outfit_600SemiBold,
    OutfitBold: Outfit_700Bold,
    OutfitExtraBold: Outfit_800ExtraBold,
  });

  // Disable global navigation safeguard
  useEffect(() => {
    if (pathname === '/split/process') {
      console.log('🌍 GLOBAL NAVIGATION MONITOR: Detected process screen');
      console.log('🌍 Global navigation safeguard disabled to prevent conflicts');

      // No timeout set - let natural navigation happen

      return () => {
        // No cleanup needed
      };
    }
  }, [pathname]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');

        // Disabled automatic navigation
        if (pathname === '/split/process') {
          console.log('🌍 App came to foreground while on process screen, but navigation is disabled');
          // No automatic navigation
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [pathname]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SplitProvider>
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
              <Stack.Screen name="split/process" />
              <Stack.Screen name="split/items" />
              <Stack.Screen name="split/tip" />
              <Stack.Screen name="split/results" />
            </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <UpdateHandler />
          </SplitProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
