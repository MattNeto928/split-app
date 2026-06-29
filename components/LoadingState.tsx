import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/Colors';

export type LoadingStateProps = {
  message?: string;
  sub?: string;
};

export function LoadingState({
  message = 'Reading your receipt…',
  sub = 'This usually takes a few seconds.',
}: LoadingStateProps) {
  const c = Colors.light;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={c.accent} />

      {message ? (
        <ThemedText type="subtitle" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}

      {sub ? (
        <ThemedText type="caption" muted style={styles.sub}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['4xl'],
  },
  message: {
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  sub: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 320,
  },
});

export default LoadingState;
