import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius } from '@/constants/Colors';

type IconButtonVariant = 'plain' | 'soft' | 'solid';

export type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  variant?: IconButtonVariant;
  style?: StyleProp<ViewStyle>;
};

const c = Colors.light;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 22,
  color,
  variant = 'plain',
  style,
}: IconButtonProps) {
  const iconColor =
    color ?? (variant === 'solid' ? c.onAccent : variant === 'soft' ? c.accent : c.text);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        variant === 'soft' && { backgroundColor: c.accentSubtle },
        variant === 'solid' && { backgroundColor: pressed ? c.accentPressed : c.accent },
        variant === 'plain' && pressed && { opacity: 0.6 },
        (variant === 'soft' || variant === 'solid') && pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
