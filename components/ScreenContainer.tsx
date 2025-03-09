import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  useSafeArea?: boolean;
  noBottomInset?: boolean;
  noHorizontalPadding?: boolean;
}

/**
 * A container component that properly handles safe area insets for consistent layout
 * across all device types, including those with notches, cutouts, and home indicators.
 */
export function ScreenContainer({
  children,
  style,
  useSafeArea = true,
  noBottomInset = false,
  noHorizontalPadding = false,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  
  const topPadding = useSafeArea ? Math.max(insets.top + 16, 60) : 0;
  const bottomPadding = (useSafeArea && !noBottomInset) ? insets.bottom : 0;
  const horizontalPadding = noHorizontalPadding ? 0 : 20;
  
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: horizontalPadding,
          backgroundColor,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});