import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing } from '@/constants/Colors';

export type ErrorStateProps = {
  title?: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  icon = 'alert-circle-outline',
  onRetry,
  retryLabel = 'Try again',
  onSecondary,
  secondaryLabel,
}: ErrorStateProps) {
  const c = Colors.light;

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={40} color={c.error} />
        </View>
      ) : null}

      <ThemedText type="h3" style={styles.title}>
        {title}
      </ThemedText>

      {message ? (
        <ThemedText type="default" muted style={styles.message}>
          {message}
        </ThemedText>
      ) : null}

      {onRetry ? (
        <View style={styles.action}>
          <Button title={retryLabel} onPress={onRetry} fullWidth={false} />
        </View>
      ) : null}

      {onSecondary && secondaryLabel ? (
        <View style={styles.secondary}>
          <Button
            title={secondaryLabel}
            onPress={onSecondary}
            variant="ghost"
            fullWidth={false}
          />
        </View>
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
  iconWrap: {
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  action: {
    marginTop: Spacing.xl,
  },
  secondary: {
    marginTop: Spacing.sm,
  },
});

export default ErrorState;
