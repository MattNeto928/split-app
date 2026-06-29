import React, { ReactNode } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/Colors';

type ScreenProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  contentStyle,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const c = Colors.light;

  // Bottom breathing room: safe-area inset + a base gap. When a footer is
  // pinned, the footer owns the inset, so content just needs a normal gap.
  const contentPaddingBottom = footer ? Spacing.xl : Spacing.xl + insets.bottom;
  // With no header, content sits flush to the top — pad past the status bar /
  // notch / Dynamic Island so nothing renders underneath it.
  const contentPaddingTop = header ? 0 : insets.top + Spacing.sm;

  const innerContentStyle = [
    styles.content,
    { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom },
    contentStyle,
  ];

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={innerContentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, innerContentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }, style]}>
      {header}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: c.background,
              borderTopColor: c.border,
              // Sit the action(s) lower, closer to the bottom edge.
              paddingBottom: Spacing.sm + insets.bottom,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
});
