import { Animated, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Divider } from '@/components/Divider';
import { useSplitContext } from '@/contexts/SplitContext';
import { Colors, Radius, Spacing } from '@/constants/Colors';

const c = Colors.light;

type Step = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

const STEPS: Step[] = [
  {
    icon: 'people-outline',
    title: '1 — Add people',
    subtitle: 'List everyone at the table sharing the bill.',
  },
  {
    icon: 'camera-outline',
    title: '2 — Scan the check',
    subtitle: 'Snap a photo and we read the receipt for you.',
  },
  {
    icon: 'calculator-outline',
    title: '3 — See the split',
    subtitle: "We work out exactly what each person owes.",
  },
];

function StepIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stepIcon}>
      <Ionicons name={name} size={20} color={c.accent} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { clearResettingFlag } = useSplitContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideUpAnim]);

  const handleStartSplitting = () => {
    clearResettingFlag();
    router.push('/split/people');
  };

  return (
    <Screen>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideUpAnim }],
        }}
      >
        {/* Wordmark */}
        <View style={styles.header}>
          <ThemedText type="overline" muted>
            Split the check, fairly
          </ThemedText>
          <ThemedText type="display" style={styles.wordmark}>
            Split
          </ThemedText>
          <ThemedText type="bodyLg" muted style={styles.valueLine}>
            Snap a photo of the receipt and we'll tally up exactly what
            everyone owes — no math, no fuss.
          </ThemedText>
        </View>

        <Button
          title="Start splitting"
          onPress={handleStartSplitting}
          rightIcon="arrow-forward"
        />

        {/* How it works */}
        <View style={styles.howItWorks}>
          <ThemedText type="overline" muted style={styles.sectionLabel}>
            How it works
          </ThemedText>
          <Card padded={false} style={styles.stepsCard}>
            <View style={styles.stepsInner}>
              {STEPS.map((step, i) => (
                <View key={step.title}>
                  {i > 0 ? <Divider perforated /> : null}
                  <ListRow
                    left={<StepIcon name={step.icon} />}
                    title={step.title}
                    subtitle={step.subtitle}
                    style={styles.stepRow}
                  />
                </View>
              ))}
            </View>
          </Card>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  wordmark: {
    marginTop: Spacing.xs,
  },
  valueLine: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  howItWorks: {
    marginTop: Spacing['3xl'],
  },
  sectionLabel: {
    marginBottom: Spacing.md,
  },
  stepsCard: {
    overflow: 'hidden',
  },
  stepsInner: {
    paddingHorizontal: Spacing.lg,
  },
  stepRow: {
    borderBottomWidth: 0,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSubtle,
  },
});
