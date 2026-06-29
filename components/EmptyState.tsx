import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing } from '@/constants/Colors';

export type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = 'receipt-outline',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const c = Colors.light;

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={40} color={c.mutedText} />
        </View>
      ) : null}

      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>

      {message ? (
        <ThemedText type="default" muted style={styles.message}>
          {message}
        </ThemedText>
      ) : null}

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} />
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
});

export default EmptyState;
