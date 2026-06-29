import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/Colors';

export type DividerProps = {
  perforated?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ perforated, color, style }: DividerProps) {
  const c = Colors.light;

  if (perforated) {
    return (
      <View
        style={[
          styles.perforated,
          { borderColor: color ?? c.borderStrong },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[styles.solid, { backgroundColor: color ?? c.border }, style]}
    />
  );
}

const styles = StyleSheet.create({
  solid: {
    height: 1,
    width: '100%',
  },
  perforated: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    width: '100%',
  },
});

export default Divider;
