import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, Elevation, Radius, Spacing } from '@/constants/Colors';

export type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: 'e0' | 'e1' | 'e2';
  padded?: boolean;
  onPress?: () => void;
};

export function Card({
  children,
  style,
  elevation = 'e1',
  padded = true,
  onPress,
}: CardProps) {
  const c = Colors.light;

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    Elevation[elevation],
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  padded: {
    padding: Spacing.lg,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default Card;
