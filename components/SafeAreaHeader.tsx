import React, { ReactNode } from 'react';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { IconButton } from '@/components/IconButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/Colors';

interface SafeAreaHeaderProps {
  title: string;
  onBack?: () => void;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  showBackButton?: boolean;
  backButtonColor?: string;
  backButtonBgColor?: string;
  right?: ReactNode;
}

export function SafeAreaHeader({
  title,
  onBack,
  containerStyle,
  titleStyle,
  showBackButton = true,
  backButtonColor,
  backButtonBgColor,
  right,
}: SafeAreaHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = Colors.light;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.sm,
          backgroundColor: c.background,
        },
        containerStyle,
      ]}
    >
      <View style={styles.side}>
        {showBackButton ? (
          <IconButton
            icon="arrow-back"
            onPress={handleBack}
            accessibilityLabel="Go back"
            size={24}
            color={backButtonColor}
            variant={backButtonBgColor ? 'soft' : 'plain'}
            style={backButtonBgColor ? { backgroundColor: backButtonBgColor } : undefined}
          />
        ) : null}
      </View>

      <ThemedText type="h3" numberOfLines={1} style={[styles.title, titleStyle]}>
        {title}
      </ThemedText>

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    width: '100%',
  },
  // Fixed-width side slots keep the title optically centered regardless of
  // whether a back button or right action is present.
  side: {
    minWidth: 44,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
