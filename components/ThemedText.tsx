import { Text, type TextProps, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'caption' | 'amount';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'amount' ? styles.amount : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: 'OutfitRegular',
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 2, // Reduced padding to prevent UI issues
  },
  defaultSemiBold: {
    fontFamily: 'OutfitSemiBold',
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 2, // Reduced padding to prevent UI issues
  },
  title: {
    fontFamily: 'OutfitBold',
    fontSize: 32,
    letterSpacing: -0.3, // Slightly looser spacing for Outfit
    lineHeight: 38,
    paddingVertical: 4, // Reduced padding to prevent UI issues
  },
  subtitle: {
    fontFamily: 'OutfitSemiBold',
    fontSize: 20,
    letterSpacing: -0.2, // Slightly looser for Outfit
    lineHeight: 28,
    paddingVertical: 3, // Reduced padding to prevent UI issues
  },
  link: {
    fontFamily: 'OutfitMedium',
    lineHeight: 24,
    fontSize: 16,
    paddingVertical: 2, // Reduced padding to prevent UI issues
    color: Colors.light.tint,
  },
  caption: {
    fontFamily: 'OutfitRegular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.secondaryText, // Use secondary text color
  },
  amount: {
    fontFamily: 'OutfitSemiBold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2, // Adjusted for Outfit
  },
});
