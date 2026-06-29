import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/Colors';

export type PillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

const c = Colors.light;

export function Pill({ label, selected = false, onPress, leftIcon, style }: PillProps) {
  const fg = selected ? c.accent : c.secondaryText;
  const borderColor = selected ? c.accent : c.border;
  const backgroundColor = selected ? c.accentSubtle : c.surface;

  const content = (
    <View style={styles.content}>
      {leftIcon ? <Ionicons name={leftIcon} size={15} color={fg} /> : null}
      <ThemedText type="bodySm" style={[styles.label, { color: fg }]}>
        {label}
      </ThemedText>
    </View>
  );

  if (!onPress) {
    return <View style={[styles.base, { borderColor, backgroundColor }, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        { borderColor, backgroundColor },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontFamily: 'OutfitSemiBold',
  },
});
