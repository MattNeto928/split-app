import { View, type ViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  useSafeArea?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  withPadding?: boolean;
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  useSafeArea = false,
  edges = ['top', 'right', 'bottom', 'left'],
  withPadding = false,
  ...otherProps 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  
  const safeAreaStyle = useSafeArea ? {
    paddingTop: edges.includes('top') ? Math.max(insets.top + 16, 60) : 0, // Increased to prevent text cutoff
    paddingRight: edges.includes('right') ? insets.right : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
  } : {};
  
  const paddingStyle = withPadding ? styles.padding : {};
  
  return (
    <View 
      style={[
        { backgroundColor }, 
        safeAreaStyle,
        paddingStyle,
        style
      ]} 
      {...otherProps} 
    />
  );
}

const styles = StyleSheet.create({
  padding: {
    padding: 16,
  },
});
