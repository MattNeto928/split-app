import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Radius, Spacing, Type } from '@/constants/Colors';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  prefix?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Input({
  label,
  error,
  prefix,
  leftIcon,
  rightSlot,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...rest
}: InputProps) {
  const c = Colors.light;
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.error : focused ? c.accent : c.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <ThemedText type="overline" muted style={styles.label}>
          {label}
        </ThemedText>
      ) : null}

      <View style={[styles.field, { backgroundColor: c.surface, borderColor }]}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={20}
            color={c.mutedText}
            style={styles.leftIcon}
          />
        ) : null}

        {prefix ? (
          <ThemedText type="default" muted style={styles.prefix}>
            {prefix}
          </ThemedText>
        ) : null}

        <TextInput
          style={[styles.input, { color: c.text }, style]}
          placeholderTextColor={c.mutedText}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>

      {error ? (
        <ThemedText type="caption" style={[styles.error, { color: c.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  prefix: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    // Only family + size here — lineHeight (from Type.body) throws off the
    // vertical centering of single-line inputs on iOS; textAlignVertical +
    // includeFontPadding handle Android.
    fontFamily: Type.body.fontFamily,
    fontSize: Type.body.fontSize,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  rightSlot: {
    marginLeft: Spacing.sm,
  },
  error: {
    marginTop: Spacing.xs,
  },
});

export default Input;
