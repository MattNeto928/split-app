import { Text, type TextProps, StyleSheet, Platform } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { Type } from '@/constants/Colors';

export type ThemedTextType =
  | 'display'
  | 'title' // h1
  | 'h2'
  | 'h3'
  | 'subtitle'
  | 'default' // body
  | 'defaultSemiBold'
  | 'bodyLg'
  | 'bodySm'
  | 'caption'
  | 'overline'
  | 'link'
  | 'money'
  | 'moneyLg'
  | 'moneySm';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextType;
  muted?: boolean; // render in secondary text color
};

export function ThemedText({ style, lightColor, darkColor, type = 'default', muted, ...rest }: ThemedTextProps) {
  const colorName =
    type === 'link'
      ? 'accent'
      : muted || type === 'caption' || type === 'overline'
        ? 'secondaryText'
        : 'text';

  const color = useThemeColor({ light: lightColor, dark: darkColor }, colorName as 'text' | 'accent' | 'secondaryText');

  return <Text style={[base.text, { color }, styles[type], style]} {...rest} />;
}

const base = StyleSheet.create({
  text: {
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});

const styles = StyleSheet.create({
  display: Type.display,
  title: Type.h1,
  h2: Type.h2,
  h3: Type.h3,
  subtitle: Type.subtitle,
  default: Type.body,
  defaultSemiBold: Type.bodySemibold,
  bodyLg: Type.bodyLg,
  bodySm: Type.bodySm,
  caption: Type.caption,
  overline: Type.overline,
  link: { ...Type.body, fontFamily: 'OutfitMedium' },
  money: { ...Type.money, fontVariant: ['tabular-nums'] },
  moneyLg: { ...Type.moneyLg, fontVariant: ['tabular-nums'] },
  moneySm: { ...Type.moneySm, fontVariant: ['tabular-nums'] },
});
