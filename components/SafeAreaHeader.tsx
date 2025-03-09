import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface SafeAreaHeaderProps {
  title: string;
  onBack?: () => void;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  showBackButton?: boolean;
  backButtonColor?: string;
  backButtonBgColor?: string;
}

export function SafeAreaHeader({
  title,
  onBack,
  containerStyle,
  titleStyle,
  showBackButton = true,
  backButtonColor,
  backButtonBgColor,
}: SafeAreaHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };
  
  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 60) }, // Increased padding to prevent cutoff
        containerStyle,
      ]}
    >
      {showBackButton && (
        <TouchableOpacity
          style={[
            styles.backButton,
            backButtonBgColor ? { backgroundColor: backButtonBgColor } : null,
          ]}
          onPress={handleBack}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={backButtonColor || textColor} 
          />
        </TouchableOpacity>
      )}
      <ThemedText type="title" style={[styles.title, titleStyle]}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    width: '100%',
  },
  backButton: {
    marginRight: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
});