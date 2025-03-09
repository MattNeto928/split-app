import React from 'react';
import { TouchableOpacity, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export type ThemedButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  lightColor?: string;
  darkColor?: string;
};

export function ThemedButton({
  style,
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  lightColor,
  darkColor,
  disabled,
  ...rest
}: ThemedButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  
  const tintColor = useThemeColor({ light: lightColor, dark: darkColor }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'cardBackground');
  
  // Determine background color based on variant
  let bgColor;
  if (isPrimary) {
    bgColor = tintColor;
  } else if (isSecondary) {
    bgColor = useThemeColor({}, 'cardBackground');
  } else {
    bgColor = 'transparent';
  }
  
  // Determine text color based on variant
  let txtColor;
  if (isPrimary) {
    txtColor = '#FFFFFF';
  } else if (isSecondary) {
    txtColor = textColor;
  } else {
    txtColor = tintColor;
  }
  
  // Get size-specific styles
  const containerStyle = 
    size === 'small' ? styles.containerSmall :
    size === 'large' ? styles.containerLarge :
    styles.containerMedium;
    
  const textStyle = 
    size === 'small' ? styles.textSmall :
    size === 'large' ? styles.textLarge :
    styles.textMedium;
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        containerStyle,
        { backgroundColor: bgColor },
        isOutline && { borderWidth: 1, borderColor: tintColor },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          color={isPrimary ? '#FFFFFF' : tintColor} 
          size="small" 
        />
      ) : (
        <ThemedText
          style={[
            textStyle,
            { color: txtColor },
            disabled && styles.disabledText,
          ]}
        >
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  containerSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  containerMedium: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  containerLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 160,
  },
  textSmall: {
    fontFamily: 'OutfitMedium',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  textMedium: {
    fontFamily: 'OutfitMedium',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  textLarge: {
    fontFamily: 'OutfitMedium',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.8,
  },
});