import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  title?: string;
  children?: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const c = Colors.light;

const HEIGHTS: Record<ButtonSize, number> = { lg: 52, md: 44, sm: 38 };

function variantColors(variant: ButtonVariant, pressed: boolean) {
  switch (variant) {
    case 'secondary':
      return { bg: 'transparent', border: c.borderStrong, fg: c.text };
    case 'ghost':
      return { bg: 'transparent', border: 'transparent', fg: c.accent };
    case 'destructive':
      return { bg: pressed ? c.errorSubtle : c.error, border: 'transparent', fg: c.onAccent };
    case 'primary':
    default:
      return { bg: pressed ? c.accentPressed : c.accent, border: 'transparent', fg: c.onAccent };
  }
}

export function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => {
        const v = variantColors(variant, pressed && !isDisabled);
        return [
          styles.base,
          {
            height: HEIGHTS[size],
            backgroundColor: v.bg,
            borderColor: v.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            opacity: isDisabled ? 0.5 : 1,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const v = variantColors(variant, pressed && !isDisabled);
        if (loading) {
          return (
            <ActivityIndicator
              color={variant === 'primary' || variant === 'destructive' ? c.onAccent : c.accent}
            />
          );
        }
        return (
          <View style={styles.content}>
            {leftIcon ? <Ionicons name={leftIcon} size={iconSize} color={v.fg} /> : null}
            {children ?? (
              <ThemedText type="defaultSemiBold" style={[{ color: v.fg }, textStyle]}>
                {title}
              </ThemedText>
            )}
            {rightIcon ? <Ionicons name={rightIcon} size={iconSize} color={v.fg} /> : null}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
