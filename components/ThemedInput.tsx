import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';

export type ThemedInputProps = TextInputProps & {
  label?: string;
  error?: string;
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  lightTextColor?: string;
  darkTextColor?: string;
};

export function ThemedInput({
  style,
  label,
  error,
  lightBackgroundColor,
  darkBackgroundColor,
  lightTextColor,
  darkTextColor,
  ...rest
}: ThemedInputProps) {
  const backgroundColor = useThemeColor(
    { light: lightBackgroundColor || Colors.light.cardBackground, dark: darkBackgroundColor || Colors.dark.cardBackground },
    'cardBackground'
  );
  
  const textColor = useThemeColor(
    { light: lightTextColor, dark: darkTextColor },
    'text'
  );
  
  const borderColor = error 
    ? Colors.light.error
    : useThemeColor({}, 'separator');

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText style={styles.label} type="defaultSemiBold">
          {label}
        </ThemedText>
      )}
      
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor, 
            color: textColor,
            borderColor: error ? Colors.light.error : borderColor
          },
          style,
        ]}
        placeholderTextColor={useThemeColor({}, 'tabIconDefault')}
        {...rest}
      />
      
      {error && (
        <ThemedText style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    fontFamily: 'OutfitRegular',
    height: 48,
    borderRadius: 10, // Slightly more rounded corners
    borderWidth: 1,
    paddingHorizontal: 14, // Slightly more padding
    fontSize: 16,
    letterSpacing: 0.2, // Slightly looser spacing
  },
  error: {
    fontFamily: 'OutfitRegular',
    fontSize: 14,
    color: Colors.light.error,
    marginTop: 4,
    letterSpacing: 0.2,
  }
});