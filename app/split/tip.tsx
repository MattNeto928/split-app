import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

import { useSplitContext } from '@/contexts/SplitContext';
import { Screen } from '@/components/Screen';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Divider } from '@/components/Divider';
import { ThemedText } from '@/components/ThemedText';
import { useToast } from '@/components/Toast';
import { Colors, Spacing } from '@/constants/Colors';

const c = Colors.light;

const TIP_PRESETS = [0, 18, 20, 22] as const;

export default function TipScreen() {
  const router = useRouter();
  const { result, updateTipAndRecalculate } = useSplitContext();
  const toast = useToast();

  // Track component mounting so we don't navigate after unmount.
  const isMounted = useRef(false);

  // Parse the bill (total includes tax; subtotal = total - tax).
  const total = result ? parseFloat(result.total.replace(/[^0-9.]/g, '')) : 0;
  const tax = result ? parseFloat(result.tax.replace(/[^0-9.]/g, '')) : 0;
  const subtotal = total - tax;

  const [tipPercent, setTipPercent] = useState(18);
  const [customTip, setCustomTip] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleBack = () => {
    // Explicitly navigate to items screen to prevent navigation issues.
    router.replace('/split/items');
  };

  useEffect(() => {
    isMounted.current = true;

    // Handle hardware back button -> return to items.
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true; // Prevent default behavior
    });

    return () => {
      isMounted.current = false;
      backHandler.remove();
    };
  }, []);

  const calculateTipAmount = () => {
    if (isCustom) {
      return customTip ? parseFloat(customTip) || 0 : 0;
    }
    return (subtotal * tipPercent) / 100;
  };

  const handleSelectTip = (percent: number) => {
    setTipPercent(percent);
    setIsCustom(false);

    // Trigger immediate update and recalculation.
    if (result) {
      const newTipAmount = (subtotal * percent) / 100;
      updateTipAndRecalculate(newTipAmount);
    }
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    // Update context immediately when switching to custom.
    if (result) {
      const currentCustomAmount = parseFloat(customTip) || 0;
      updateTipAndRecalculate(currentCustomAmount);
    }
  };

  const handleCustomTipChange = (value: string) => {
    // Only allow numbers and one decimal point.
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    let validatedValue = numericValue;
    if (parts.length > 2) {
      validatedValue = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    setCustomTip(validatedValue);

    // Trigger immediate update and recalculation.
    if (result) {
      const newTipAmount = parseFloat(validatedValue) || 0;
      updateTipAndRecalculate(newTipAmount);
    }
  };

  const handleContinue = () => {
    if (!result) return;

    const tipAmount = calculateTipAmount();

    // Validate tip (inline toast instead of a blocking alert).
    if (tipAmount < 0 || Number.isNaN(tipAmount)) {
      toast.show("Tip can't be negative. Enter a valid amount.", { type: 'error' });
      return;
    }

    // Single update: set tip and recalculate in one operation.
    updateTipAndRecalculate(tipAmount);

    // Navigate after a frame to let state settle.
    requestAnimationFrame(() => {
      if (isMounted.current) {
        router.replace('/split/results');
      }
    });
  };

  const tipAmount = calculateTipAmount();
  const grandTotal = subtotal + tax + tipAmount;

  const presetAmount = (percent: number) => (subtotal * percent) / 100;

  return (
    <Screen
      header={<SafeAreaHeader title="Add tip" onBack={handleBack} />}
      footer={
        <Button
          title="Continue to results"
          onPress={handleContinue}
          rightIcon="arrow-forward"
        />
      }
    >
      {/* Bill summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.row}>
          <ThemedText muted>Subtotal</ThemedText>
          <ThemedText type="moneySm">${subtotal.toFixed(2)}</ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText muted>Tax</ThemedText>
          <ThemedText type="moneySm">${tax.toFixed(2)}</ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText muted>Tip</ThemedText>
          <ThemedText type="moneySm" lightColor={c.accent}>
            ${tipAmount.toFixed(2)}
          </ThemedText>
        </View>

        <Divider perforated style={styles.divider} />

        <View style={styles.row}>
          <ThemedText type="defaultSemiBold">Total</ThemedText>
          <ThemedText type="money" lightColor={c.accent}>
            ${grandTotal.toFixed(2)}
          </ThemedText>
        </View>
      </Card>

      {/* Tip percentage presets */}
      <ThemedText type="overline" muted style={styles.sectionLabel}>
        Tip percentage
      </ThemedText>
      <View style={styles.pillRow}>
        {TIP_PRESETS.map((percent) => {
          const selected = !isCustom && tipPercent === percent;
          const label =
            percent === 0
              ? 'No tip'
              : `${percent}% · $${presetAmount(percent).toFixed(2)}`;
          return (
            <Pill
              key={percent}
              label={label}
              selected={selected}
              onPress={() => handleSelectTip(percent)}
              style={styles.pill}
            />
          );
        })}
      </View>

      {/* Custom tip amount */}
      <Input
        label="Custom tip amount"
        prefix="$"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={customTip}
        onChangeText={handleCustomTipChange}
        onFocus={handleCustomFocus}
        returnKeyType="done"
        containerStyle={styles.customInput}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: Spacing.xs,
  },
  sectionLabel: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    alignSelf: 'flex-start',
  },
  customInput: {
    marginTop: Spacing['2xl'],
  },
});
