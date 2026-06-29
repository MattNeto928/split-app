import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Elevation, Radius, Spacing, personColor } from '@/constants/Colors';

const c = Colors.light;

const STEPS = [
  'Reading text from image',
  'Identifying menu items',
  'Calculating totals',
  'Preparing split details',
];

type Pos = 'tr' | 'tl' | 'br' | 'bl';
const SATELLITES: { icon: keyof typeof Ionicons.glyphMap; color: string; pos: Pos }[] = [
  { icon: 'search', color: personColor(2).fg, pos: 'tr' },
  { icon: 'calculator', color: personColor(0).fg, pos: 'br' },
  { icon: 'people', color: personColor(1).fg, pos: 'bl' },
  { icon: 'cash', color: personColor(4).fg, pos: 'tl' },
];

/**
 * Receipt-scanning loader — the original "analyzing receipt" animation
 * (orbiting satellites + pulsing receipt + stepped checklist), recolored to
 * the Receipt palette. Steps advance on a timer so it stays lively while the
 * OCR request is in flight.
 */
export function ReceiptScanLoader({ coldStart }: { coldStart?: boolean }) {
  const [step, setStep] = useState(1);

  const rotate = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0.96)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.9)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(-10)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;
  const stepsY = useRef(new Animated.Value(10)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(popupOpacity, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(popupScale, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      ]),
      Animated.parallel([
        Animated.timing(stepsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(stepsY, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
      Animated.timing(messageOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const spinLoop = Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
    );
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(circleScale, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(circleScale, { toValue: 0.96, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    spinLoop.start();
    scaleLoop.start();
    pulseLoop.start();

    const timers = [
      setTimeout(() => setStep(2), 2600),
      setTimeout(() => setStep(3), 5200),
      setTimeout(() => setStep(4), 7800),
    ];

    return () => {
      spinLoop.stop();
      scaleLoop.stop();
      pulseLoop.stop();
      timers.forEach(clearTimeout);
    };
  }, []);

  const posStyle = (pos: Pos) =>
    pos === 'tr' ? styles.tr : pos === 'tl' ? styles.tl : pos === 'br' ? styles.br : styles.bl;

  return (
    <Animated.View style={[styles.root, { opacity: popupOpacity }]}>
      <Animated.View style={[styles.content, { transform: [{ scale: popupScale }] }]}>
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
          <ThemedText type="h2" style={styles.title}>
            Analyzing receipt
          </ThemedText>
        </Animated.View>

        <View style={styles.animationContainer}>
          <Animated.View style={[styles.mainIconCircle, { transform: [{ scale: circleScale }] }]}>
            <Animated.View style={[styles.pulseCircle, { opacity: pulse }]} />
            <Ionicons name="receipt-outline" size={40} color={c.accent} />
          </Animated.View>

          {SATELLITES.map((s) => (
            <Animated.View
              key={s.pos}
              style={[styles.satellite, posStyle(s.pos), { borderColor: s.color, transform: [{ rotate: spin }] }]}
            >
              <Ionicons name={s.icon} size={20} color={s.color} />
            </Animated.View>
          ))}
        </View>

        <Animated.View style={[styles.steps, { opacity: stepsOpacity, transform: [{ translateY: stepsY }] }]}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <View key={label} style={styles.stepRow}>
                <View
                  style={[
                    styles.checkCircle,
                    done ? styles.checkDone : active ? styles.checkActive : styles.checkPending,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={c.onAccent} />
                  ) : active ? (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="sync" size={14} color={c.onAccent} />
                    </Animated.View>
                  ) : null}
                </View>
                <ThemedText
                  type="default"
                  muted={!done && !active}
                  style={done ? { color: c.success } : active ? { color: c.accent } : undefined}
                >
                  {label}
                </ThemedText>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View style={{ opacity: messageOpacity }}>
          <ThemedText type="caption" muted style={styles.message}>
            {coldStart
              ? 'Waking up the server, this can take a moment…'
              : 'Reading your receipt to prepare the split.'}
          </ThemedText>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  animationContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    marginBottom: Spacing['3xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: c.accentSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: c.accent,
  },
  pulseCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: c.accent,
  },
  satellite: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1.5,
    ...Elevation.e1,
  },
  tr: { top: 16, right: 16 },
  tl: { top: 16, left: 16 },
  br: { bottom: 16, right: 16 },
  bl: { bottom: 16, left: 16 },
  steps: {
    width: '90%',
    maxWidth: 300,
    marginBottom: Spacing['2xl'],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkDone: {
    backgroundColor: c.success,
  },
  checkActive: {
    backgroundColor: c.accent,
  },
  checkPending: {
    borderWidth: 1,
    borderColor: c.border,
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default ReceiptScanLoader;
