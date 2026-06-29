import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Elevation, Radius, Spacing } from '@/constants/Colors';

type ToastType = 'info' | 'success' | 'error';

type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

type ToastContextValue = {
  show: (message: string, opts?: ToastOptions) => void;
};

type ActiveToast = {
  id: number;
  message: string;
  type: ToastType;
};

const DEFAULT_DURATION = 2800;
const FADE_DURATION = 220;

const ToastContext = createContext<ToastContextValue | null>(null);

const c = Colors.light;

const TYPE_STYLE: Record<ToastType, { bg: string; border: string; text: string }> = {
  info: { bg: c.surface, border: c.border, text: c.text },
  success: { bg: c.successSubtle, border: c.success, text: c.success },
  error: { bg: c.errorSubtle, border: c.error, text: c.error },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [clearTimer, opacity]);

  const show = useCallback(
    (message: string, opts?: ToastOptions) => {
      const trimmed = message?.trim();
      if (!trimmed) return;

      clearTimer();
      const id = ++idRef.current;
      setToast({ id, message: trimmed, type: opts?.type ?? 'info' });

      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();

      const duration = opts?.duration ?? DEFAULT_DURATION;
      hideTimer.current = setTimeout(() => {
        if (idRef.current === id) dismiss();
      }, duration);
    },
    [clearTimer, dismiss, opacity],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  const tint = toast ? TYPE_STYLE[toast.type] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="none"
        style={[styles.host, { paddingBottom: Spacing.xl + insets.bottom }]}
      >
        {toast && tint ? (
          <Animated.View
            style={[
              styles.toast,
              { backgroundColor: tint.bg, borderColor: tint.border },
              { opacity },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <ThemedText type="defaultSemiBold" lightColor={tint.text} style={styles.text}>
              {toast.message}
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  toast: {
    maxWidth: 440,
    minWidth: 0,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    ...Elevation.e2,
  },
  text: {
    textAlign: 'center',
  },
});
