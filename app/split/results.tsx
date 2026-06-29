import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  View,
  Animated,
  Easing,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Avatar } from '@/components/Avatar';
import { Divider } from '@/components/Divider';
import { Pill } from '@/components/Pill';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/components/Toast';
import { useSplitContext } from '@/contexts/SplitContext';
import { saveReceiptToHistory } from '@/services/storageService';
import {
  Colors,
  Spacing,
  Radius,
  Elevation,
} from '@/constants/Colors';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const c = Colors.light;

const QUICK_TIPS = [15, 18, 20, 25];

/** Parse a currency-ish string into a number. */
const num = (v: string) => parseFloat(v.replace(/[^0-9.]/g, '')) || 0;

const money = (n: number) => `$${n.toFixed(2)}`;

type PersonBreakdown = {
  items: {
    id: string;
    name: string;
    fullPrice: number;
    splitCount: number;
    yourShare: number;
    taxContribution: number;
    tipContribution: number;
    totalForItem: number;
  }[];
  subtotalShare: number;
  taxShare: number;
  tipShare: number;
  grandTotal: number;
  taxRate: number;
  tipRate: number;
};

// ---------------------------------------------------------------------------
// Small row used inside expandable breakdowns
// ---------------------------------------------------------------------------
function BreakdownLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.breakdownLine}>
      <ThemedText type={strong ? 'defaultSemiBold' : 'bodySm'} muted={!strong}>
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? 'money' : 'moneySm'}
        style={strong ? { fontSize: 18, lineHeight: 24 } : undefined}
      >
        {value}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Itemised breakdown shown when a person row is expanded
// ---------------------------------------------------------------------------
function PersonBreakdownDetail({ breakdown }: { breakdown: PersonBreakdown }) {
  return (
    <View style={styles.breakdownContainer}>
      <ThemedText type="overline" muted style={styles.breakdownHeading}>
        Items
      </ThemedText>

      {breakdown.items.length === 0 ? (
        <ThemedText type="caption" muted style={styles.breakdownEmpty}>
          No items assigned — split evenly.
        </ThemedText>
      ) : (
        breakdown.items.map((item) => (
          <View key={item.id} style={styles.breakdownItem}>
            <View style={styles.breakdownItemHeader}>
              <ThemedText type="bodySm" numberOfLines={1} style={styles.breakdownItemName}>
                {item.name}
              </ThemedText>
              <ThemedText type="moneySm">{money(item.yourShare)}</ThemedText>
            </View>
            {item.splitCount > 1 ? (
              <ThemedText type="caption" muted style={styles.breakdownItemNote}>
                {money(item.fullPrice)} ÷ {item.splitCount} people
              </ThemedText>
            ) : null}
          </View>
        ))
      )}

      <Divider style={styles.breakdownDivider} />

      <BreakdownLine label="Subtotal" value={money(breakdown.subtotalShare)} />
      <BreakdownLine
        label={`Tax (${breakdown.taxRate.toFixed(1)}%)`}
        value={money(breakdown.taxShare)}
      />
      <BreakdownLine
        label={`Tip (${breakdown.tipRate.toFixed(1)}%)`}
        value={money(breakdown.tipShare)}
      />

      <Divider perforated style={styles.breakdownPerforated} />

      <BreakdownLine label="Total" value={money(breakdown.grandTotal)} strong />
    </View>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromHistory = params.from === 'history'; // Check if we came from history
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const {
    people,
    receiptImage,
    result,
    reset,
    recalculateSplitAmounts,
    setSplitResult,
    currentHistoryId,
    setCurrentHistoryId,
  } = useSplitContext();

  const [error, setError] = useState<string | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipPercent, setTipPercent] = useState('');
  const [activeTipOption, setActiveTipOption] = useState<'amount' | 'percent'>('percent');
  const [tipModalAnimation] = useState(new Animated.Value(0));

  // Expanded person breakdown state
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const staggeredItems = useRef(people.map(() => new Animated.Value(0))).current;
  const scaleYouPay = useRef(new Animated.Value(0.94)).current;

  // Track component mounting
  const isMounted = useRef(false);

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    console.log('Results screen mounted, checking data:', {
      hasReceiptImage: !!receiptImage,
      hasResult: !!result,
      splitAmounts: result?.splitAmounts?.length,
    });

    // Function to check if we need to navigate away
    const handleNavigation = () => {
      if (!isMounted.current) return false;

      if (!receiptImage) {
        // No image to analyze, go back to camera
        console.log('No receipt image, going back to camera screen');
        setTimeout(() => {
          if (isMounted.current) {
            router.replace('/split/camera');
          }
        }, 300);
        return true;
      }

      if (!result) {
        // No result available, go back to items screen to retry
        console.log('No result data, going back to items screen');
        setTimeout(() => {
          if (isMounted.current) {
            router.replace('/split/items');
          }
        }, 300);
        return true;
      }

      if (!result.splitAmounts || result.splitAmounts.length === 0) {
        console.log('No split amounts calculated, going back to tip screen');
        setTimeout(() => {
          if (isMounted.current) {
            router.replace('/split/tip');
          }
        }, 300);
        return true;
      }

      return false;
    };

    // Function to start animations
    const startAnimations = () => {
      console.log('Starting results screen animations');
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scaleYouPay, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.stagger(
          120,
          staggeredItems.map((anim) =>
            Animated.timing(anim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            })
          )
        ),
      ]).start();
    };

    // Use a timer for navigation validation and checking unassigned items
    const timer = setTimeout(() => {
      if (!isMounted.current) return;

      // First check navigation requirements (image, result)
      if (!receiptImage || !result) {
        console.log('Missing receipt image or result on mount, handling navigation...');
        handleNavigation(); // handleNavigation already checks and navigates
        return;
      }
      const shouldNavigateAway = handleNavigation();
      if (shouldNavigateAway) return;

      // NOTE: Unassigned items check removed - users now confirm on items screen
      // that they want to continue with unassigned items (will be split evenly)

      // Check if split amounts exist.
      // If missing AND NOT from history, navigate back to tip screen.
      // If missing AND from history, log error and navigate back to history.
      // NEVER recalculate automatically here.
      if (!result.splitAmounts || result.splitAmounts.length === 0) {
        if (fromHistory) {
          console.error('ERROR: Navigated from history but splitAmounts are missing in context!');
          Alert.alert('Something went wrong', 'We could not load the split details from history.');
          setTimeout(() => {
            if (isMounted.current) router.replace('/(tabs)/history');
          }, 300);
        } else {
          console.warn('Split amounts missing (not from history), navigating back to tip screen.');
          setTimeout(() => {
            if (isMounted.current) router.replace('/split/tip');
          }, 300);
        }
        return; // Stop execution, don't start animations or save
      }

      // --- Save/Update History Item ---
      console.log('All checks passed. Saving/Updating history item...');
      saveReceiptToHistory(receiptImage, result, people, currentHistoryId || undefined)
        .then((savedId) => {
          if (savedId && !currentHistoryId) {
            // If it was a new save, store the ID in context
            console.log('New history item saved with ID:', savedId);
            setCurrentHistoryId(savedId);
          } else if (savedId && currentHistoryId) {
            console.log('Existing history item updated:', savedId);
          } else if (!savedId && currentHistoryId) {
            console.warn('Update history attempted, but save function returned no ID. History ID was:', currentHistoryId);
          } else if (!savedId && !currentHistoryId) {
            console.log('Save history skipped (likely duplicate or other issue).');
          }
          // Start animations only AFTER save attempt is complete
          startAnimations();
        })
        .catch((err) => {
          console.error('Error saving/updating receipt to history:', err);
          toast.show('We could not save these results.', { type: 'error' });
          // Still start animations even if save fails
          startAnimations();
        });
      // --- End Save/Update ---
    }, 150);

    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
    // Corrected dependencies: include history ID state and setter
  }, [receiptImage, result, fromHistory, router, recalculateSplitAmounts, people, currentHistoryId, setCurrentHistoryId]);

  const handleShareResults = useCallback(() => {
    if (!result || !people) return;

    // Calculate values ensuring tip is included
    const total = num(result.total);
    const tax = num(result.tax);
    const tip = num(result.tip);
    const subtotal = total - tax;
    const grandTotal = subtotal + tax + tip;

    // Calculate tax and tip rates
    const taxRate = subtotal > 0 ? tax / subtotal : 0;
    const tipRate = subtotal > 0 ? tip / subtotal : 0;

    // Restaurant name if available
    const restaurantLine = result.restaurantName ? `📍 ${result.restaurantName}\n\n` : '';

    const totalMessage = `💰 Bill Summary\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nTip: $${tip.toFixed(2)}\nTotal: $${grandTotal.toFixed(2)}`;

    // Build detailed breakdown for each person
    const detailedBreakdowns = result.splitAmounts
      .map((split) => {
        const person = people.find((p) => p.id === split.personId);
        if (!person) return '';

        // Get this person's items
        const personItems =
          result.menuItems
            ?.filter((item) => item.assignedTo.includes(split.personId) && item.price > 0)
            .map((item) => {
              const splitCount = item.assignedTo.length;
              const itemShare = item.price / splitCount;
              if (splitCount > 1) {
                return `  • ${item.name}: $${itemShare.toFixed(2)} (split ${splitCount} ways)`;
              }
              return `  • ${item.name}: $${itemShare.toFixed(2)}`;
            }) || [];

        // Calculate their subtotal, tax, and tip
        const personSubtotal =
          personItems.length > 0
            ? result.menuItems
                ?.filter((item) => item.assignedTo.includes(split.personId) && item.price > 0)
                .reduce((sum, item) => sum + item.price / item.assignedTo.length, 0) || 0
            : 0;
        const personTax = personSubtotal * taxRate;
        const personTip = personSubtotal * tipRate;

        // Build the person's section
        let personSection = `👤 ${person.name} - $${split.amount}`;

        if (personItems.length > 0) {
          personSection += '\n' + personItems.join('\n');
          personSection += `\n  ├ Subtotal: $${personSubtotal.toFixed(2)}`;
          personSection += `\n  ├ Tax: $${personTax.toFixed(2)}`;
          personSection += `\n  └ Tip: $${personTip.toFixed(2)}`;
        }

        return personSection;
      })
      .filter(Boolean)
      .join('\n\n');

    const message = `🧾 Split Results\n\n${restaurantLine}${totalMessage}\n\n${'─'.repeat(20)}\n\n${detailedBreakdowns}\n\n${'─'.repeat(20)}\nSplit with Split App 📱`;

    Share.share({
      message,
      title: 'Split Results',
    });
  }, [result, people]);

  const handleEditItems = () => {
    router.replace('/split/items');
  };

  const handleNewSplit = useCallback(() => {
    // ONLY call reset now. Navigation will be handled within the context's reset function.
    console.log('Completing split, calling context reset...');
    reset();
  }, [reset]); // Only depends on reset now

  const handleOpenTipModal = () => {
    if (!result) return;

    // Parse current tip value
    const currentTip = num(result.tip);

    // Calculate subtotal and tip percentage
    const total = num(result.total);
    const tax = num(result.tax);
    const subtotal = total - tax;

    // Calculate current tip percentage
    const currentTipPercent = subtotal > 0 ? ((currentTip / subtotal) * 100).toFixed(2) : '0';

    // Set initial values
    setTipAmount(currentTip.toFixed(2));
    setTipPercent(currentTipPercent);
    setActiveTipOption(currentTip > 0 ? 'percent' : 'amount');

    // Open modal with animation
    setTipModalVisible(true);
    Animated.spring(tipModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  };

  const handleCloseTipModal = () => {
    Animated.timing(tipModalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.cubic),
    }).start(() => {
      setTipModalVisible(false);
    });
  };

  const handleUpdateTip = () => {
    if (!result) return;

    try {
      // Parse values
      const total = num(result.total);
      const tax = num(result.tax);
      const subtotal = total - tax;

      // Determine which tip value to use
      let newTipValue: number;

      if (activeTipOption === 'amount') {
        newTipValue = parseFloat(tipAmount) || 0;
      } else {
        // Calculate tip from percentage
        const percentage = parseFloat(tipPercent) || 0;
        newTipValue = (percentage / 100) * subtotal;
      }

      // Update result with new tip value
      const updatedResult = {
        ...result,
        tip: newTipValue.toString(),
      };

      // Recalculate split amounts with new tip
      setSplitResult(updatedResult);

      // Use requestAnimationFrame to ensure state update has a chance to propagate
      requestAnimationFrame(() => {
        recalculateSplitAmounts(newTipValue.toString()); // Pass the new tip value directly
      });

      // Close modal
      handleCloseTipModal();
      toast.show('Tip updated', { type: 'success' });
    } catch (err) {
      console.error('Error updating tip:', err);
      Alert.alert('Something went wrong', 'We could not update the tip. Please try again.');
    }
  };

  const handleTipAmountChange = (value: string) => {
    let sanitizedValue = value.replace(/[^0-9.]/g, ''); // Allow only numbers and one dot
    const parts = sanitizedValue.split('.');
    if (parts.length > 1) {
      // If there's a decimal part, ensure it's max 2 digits
      parts[1] = parts[1].substring(0, 2);
      sanitizedValue = parts.join('.');
    }
    // Prevent multiple leading zeros unless it's "0."
    if (sanitizedValue.length > 1 && sanitizedValue.startsWith('0') && !sanitizedValue.startsWith('0.')) {
      sanitizedValue = sanitizedValue.substring(1);
    }

    setTipAmount(sanitizedValue);

    // Update percentage if subtotal > 0
    if (result) {
      const total = num(result.total);
      const tax = num(result.tax);
      const subtotal = total - tax;

      if (subtotal > 0) {
        const amount = parseFloat(value) || 0;
        const newPercentage = (amount / subtotal) * 100;
        setTipPercent(newPercentage.toFixed(2));
      }
    }
  };

  const handleTipPercentChange = (value: string) => {
    let sanitizedValue = value.replace(/[^0-9.]/g, ''); // Allow only numbers and one dot
    const parts = sanitizedValue.split('.');
    if (parts.length > 1) {
      // If there's a decimal part, ensure it's max 2 digits
      parts[1] = parts[1].substring(0, 2);
      sanitizedValue = parts.join('.');
    }
    // Prevent multiple leading zeros unless it's "0."
    if (sanitizedValue.length > 1 && sanitizedValue.startsWith('0') && !sanitizedValue.startsWith('0.')) {
      sanitizedValue = sanitizedValue.substring(1);
    }

    setTipPercent(sanitizedValue);

    // Update amount if subtotal > 0
    if (result) {
      const total = num(result.total);
      const tax = num(result.tax);
      const subtotal = total - tax;

      if (subtotal > 0) {
        const percent = parseFloat(value) || 0;
        const newAmount = (percent / 100) * subtotal;
        setTipAmount(newAmount.toFixed(2));
      }
    }
  };

  // Calculate detailed breakdown for a person
  const getPersonBreakdown = useCallback(
    (personId: string): PersonBreakdown | null => {
      if (!result?.menuItems) return null;

      // Get tax and tip rates
      const total = num(result.total);
      const tax = num(result.tax);
      const tip = num(result.tip);
      const subtotal = total - tax;
      const taxRate = subtotal > 0 ? tax / subtotal : 0;
      const tipRate = subtotal > 0 ? tip / subtotal : 0;

      // Find all items assigned to this person
      const personItems = result.menuItems
        .filter((item) => item.assignedTo.includes(personId) && item.price > 0)
        .map((item) => {
          const splitCount = item.assignedTo.length;
          const itemShare = item.price / splitCount;
          const itemTax = itemShare * taxRate;
          const itemTip = itemShare * tipRate;
          return {
            id: item.id,
            name: item.name,
            fullPrice: item.price,
            splitCount,
            yourShare: itemShare,
            taxContribution: itemTax,
            tipContribution: itemTip,
            totalForItem: itemShare + itemTax + itemTip,
          };
        });

      // Calculate totals
      const subtotalShare = personItems.reduce((sum, item) => sum + item.yourShare, 0);
      const taxShare = personItems.reduce((sum, item) => sum + item.taxContribution, 0);
      const tipShare = personItems.reduce((sum, item) => sum + item.tipContribution, 0);
      const grandTotal = subtotalShare + taxShare + tipShare;

      return {
        items: personItems,
        subtotalShare,
        taxShare,
        tipShare,
        grandTotal,
        taxRate: taxRate * 100,
        tipRate: tipRate * 100,
      };
    },
    [result]
  );

  // Toggle person expansion with LayoutAnimation for smooth native performance
  const togglePersonExpand = useCallback(
    (personId: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedPersonId((prev) => (prev === personId ? null : personId));
    },
    []
  );

  if (error) {
    return (
      <Screen
        scroll={false}
        header={<SafeAreaHeader title="Something went wrong" onBack={() => router.back()} />}
        footer={<Button title="Go back" onPress={() => router.back()} />}
      >
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={c.error} />
          <ThemedText type="default" muted style={styles.centeredText}>
            {error}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen scroll={false} header={<SafeAreaHeader title="Final split" showBackButton={false} />}>
        <LoadingState message="Calculating the final split" sub="Adding up items, tax, and tip" />
      </Screen>
    );
  }

  // Find the "Me" person
  const mePersonId = people.find((p) => p.id === 'me')?.id;
  const meAmount = mePersonId ? result.splitAmounts.find((s) => s.personId === mePersonId)?.amount : null;

  // Get all other people who owe "Me"
  const peopleWhoOwe = mePersonId
    ? result.splitAmounts
        .filter((s) => s.personId !== mePersonId)
        .map((split) => {
          const person = people.find((p) => p.id === split.personId);
          return {
            id: split.personId,
            name: person?.name || '',
            amount: split.amount,
          };
        })
    : [];

  // Bill-level totals (tip always included)
  const billTotal = num(result.total);
  const billTax = num(result.tax);
  const billTip = num(result.tip);
  const billSubtotal = billTotal - billTax;
  const billGrandTotal = billSubtotal + billTax + billTip;
  const billTaxPercent = billSubtotal > 0 ? (billTax / billSubtotal) * 100 : 0;
  const billTipPercent = billSubtotal > 0 ? (billTip / billSubtotal) * 100 : 0;

  const meBreakdown = expandedPersonId === 'me' ? getPersonBreakdown('me') : null;

  // ---------- Footer: clear hierarchy — one primary, one ghost ----------
  const footer = (
    <View style={styles.footerCol}>
      <Button
        title={fromHistory ? 'Save changes' : 'Done'}
        onPress={handleNewSplit}
        leftIcon="checkmark-circle-outline"
      />
      <Button
        title="Share results"
        variant="ghost"
        onPress={handleShareResults}
        leftIcon="share-outline"
      />
    </View>
  );

  return (
    <Screen
      header={<SafeAreaHeader title="Final split" onBack={() => router.replace('/split/tip')} />}
      footer={footer}
    >
      {/* ----------------------------- HERO: You pay ----------------------------- */}
      {meAmount && mePersonId ? (
        <Animated.View
          style={{
            opacity: fadeIn,
            transform: [{ scale: scaleYouPay }, { translateY: slideUp }],
          }}
        >
          <Card elevation="e2" padded={false} style={styles.heroCard}>
            <Pressable onPress={() => togglePersonExpand('me')} style={styles.heroPress}>
              <View style={styles.heroTopRow}>
                <ThemedText type="overline" style={styles.heroLabel}>
                  You pay
                </ThemedText>
                <Ionicons
                  name={expandedPersonId === 'me' ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={c.onAccent}
                />
              </View>

              <ThemedText type="moneyLg" style={styles.heroAmount}>
                {money(num(meAmount))}
              </ThemedText>

              <ThemedText type="caption" style={styles.heroHint}>
                {expandedPersonId === 'me' ? 'Tap to collapse' : 'Tap for your breakdown'}
              </ThemedText>

              {expandedPersonId === 'me' && meBreakdown ? (
                <Reanimated.View
                  entering={FadeInUp.duration(180)}
                  exiting={FadeOutUp.duration(140)}
                  style={styles.heroBreakdownWrap}
                >
                  <Divider perforated color={c.onAccent} style={styles.heroPerforated} />
                  <PersonBreakdownDetailOnAccent breakdown={meBreakdown} />
                </Reanimated.View>
              ) : null}
            </Pressable>
          </Card>
        </Animated.View>
      ) : null}

      {/* ----------------------------- People owe you ----------------------------- */}
      <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
        <ThemedText type="overline" muted style={styles.sectionLabel}>
          People owe you
        </ThemedText>

        {peopleWhoOwe.length === 0 ? (
          <Card style={styles.card}>
            <View style={styles.emptyOwe}>
              <Ionicons name="checkmark-circle-outline" size={32} color={c.success} />
              <ThemedText type="default" muted style={styles.emptyOweText}>
                Everyone paid their share.
              </ThemedText>
            </View>
          </Card>
        ) : (
          <Card style={styles.card} padded={false}>
            {peopleWhoOwe.map((person, index) => {
              const isExpanded = expandedPersonId === person.id;
              const breakdown = isExpanded ? getPersonBreakdown(person.id) : null;
              const isLast = index === peopleWhoOwe.length - 1;

              return (
                <Animated.View
                  key={person.id}
                  style={{
                    opacity: staggeredItems[index] || fadeIn,
                    transform: [
                      {
                        translateX: (staggeredItems[index] || fadeIn).interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => togglePersonExpand(person.id)}
                    style={({ pressed }) => [
                      styles.personRow,
                      !isLast && !isExpanded && styles.personRowBorder,
                      pressed && { backgroundColor: c.surfaceAlt },
                    ]}
                  >
                    <Avatar name={person.name} index={index + 1} size={44} />
                    <View style={styles.personMeta}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {person.name}
                      </ThemedText>
                      <ThemedText type="caption" muted>
                        {isExpanded ? 'Tap to collapse' : 'Tap for breakdown'}
                      </ThemedText>
                    </View>
                    <View style={styles.personAmount}>
                      <ThemedText type="money" style={styles.personAmountText}>
                        {money(num(person.amount))}
                      </ThemedText>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={c.mutedText}
                      />
                    </View>
                  </Pressable>

                  {isExpanded && breakdown ? (
                    <Reanimated.View
                      entering={FadeInUp.duration(180)}
                      exiting={FadeOutUp.duration(140)}
                    >
                      <PersonBreakdownDetail breakdown={breakdown} />
                    </Reanimated.View>
                  ) : null}
                </Animated.View>
              );
            })}

            {/* Verification total */}
            {(() => {
              let sumOfAllShares = meAmount ? parseFloat(meAmount) : 0;
              peopleWhoOwe.forEach((person) => {
                sumOfAllShares += parseFloat(person.amount);
              });

              const difference = Math.abs(billGrandTotal - sumOfAllShares);
              const isBalanced = difference < 0.02; // Allow for small rounding errors

              return (
                <View style={styles.verificationRow}>
                  <View>
                    <ThemedText type="caption" muted>
                      Total contributions
                    </ThemedText>
                    <ThemedText type="moneySm">{money(sumOfAllShares)}</ThemedText>
                  </View>
                  <Pill
                    label={isBalanced ? 'Balanced' : `Off by ${money(difference)}`}
                    selected={isBalanced}
                    leftIcon={isBalanced ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  />
                </View>
              );
            })()}
          </Card>
        )}
      </Animated.View>

      {/* ----------------------------- Bill summary ----------------------------- */}
      <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
        <ThemedText type="overline" muted style={styles.sectionLabel}>
          Bill summary
        </ThemedText>

        <Card style={styles.card}>
          {result.restaurantName ? (
            <ThemedText type="subtitle" style={styles.restaurantName} numberOfLines={1}>
              {result.restaurantName}
            </ThemedText>
          ) : null}

          <View style={styles.summaryRow}>
            <ThemedText type="default" muted>
              Subtotal
            </ThemedText>
            <ThemedText type="moneySm">{money(billSubtotal)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText type="default" muted>
              Tax ({billTaxPercent.toFixed(1)}%)
            </ThemedText>
            <ThemedText type="moneySm">{money(billTax)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.tipLabelRow}>
              <ThemedText type="default" muted>
                Tip ({billTipPercent.toFixed(1)}%)
              </ThemedText>
              <Pressable onPress={handleOpenTipModal} hitSlop={8} style={styles.editTip}>
                <Ionicons name="pencil-outline" size={13} color={c.accent} />
                <ThemedText type="caption" style={styles.editTipText}>
                  Edit
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="moneySm">{money(billTip)}</ThemedText>
          </View>

          <Divider perforated style={styles.summaryPerforated} />

          <View style={styles.summaryRow}>
            <ThemedText type="defaultSemiBold">Total</ThemedText>
            <ThemedText type="money" style={styles.summaryTotal}>
              {money(billGrandTotal)}
            </ThemedText>
          </View>
        </Card>
      </Animated.View>

      {/* ----------------------------- Items breakdown ----------------------------- */}
      {result.menuItems && result.menuItems.length > 0 ? (
        <Animated.View style={{ opacity: fadeIn }}>
          <View style={styles.itemsHeaderRow}>
            <ThemedText type="overline" muted style={styles.sectionLabel}>
              Items
            </ThemedText>
            <Pressable onPress={handleEditItems} hitSlop={8} style={styles.editItems}>
              <Ionicons name="create-outline" size={16} color={c.accent} />
              <ThemedText type="bodySm" style={styles.editItemsText}>
                Edit
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="caption" muted style={styles.itemsHint}>
            Each person pays their share of items, tax, and tip in proportion to what they ordered.
          </ThemedText>

          <Card style={styles.card} padded={false}>
            {result.menuItems.map((item, index) => {
              const assignedPeople = item.assignedTo
                .map((id) => people.find((p) => p.id === id)?.name || '')
                .filter(Boolean)
                .join(', ');

              const itemTax = billSubtotal > 0 ? item.price * (billTax / billSubtotal) : 0;
              const itemTip = billSubtotal > 0 ? item.price * (billTip / billSubtotal) : 0;
              const itemTotal = item.price + itemTax + itemTip;
              const perPersonCost =
                item.assignedTo.length > 0 ? itemTotal / item.assignedTo.length : 0;

              const isLast = index === result.menuItems!.length - 1;

              return (
                <View
                  key={item.id}
                  style={[styles.itemRow, !isLast && styles.itemRowBorder]}
                >
                  <View style={styles.itemMeta}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText type="caption" muted>
                      {item.assignedTo.length > 0
                        ? `For ${assignedPeople}`
                        : 'Unassigned — split evenly'}
                    </ThemedText>
                    <ThemedText type="caption" muted>
                      With tax & tip: {money(itemTotal)}
                      {item.assignedTo.length > 1 ? ` (${money(perPersonCost)} each)` : ''}
                    </ThemedText>
                  </View>
                  <ThemedText type="moneySm">{money(item.price)}</ThemedText>
                </View>
              );
            })}
          </Card>
        </Animated.View>
      ) : null}

      {/* ----------------------------- View receipt ----------------------------- */}
      {receiptImage ? (
        <Animated.View style={{ opacity: fadeIn }}>
          <Button
            title="View receipt details"
            variant="secondary"
            leftIcon="document-text-outline"
            onPress={() => setReceiptModalVisible(true)}
            style={styles.receiptButton}
          />
        </Animated.View>
      ) : null}

      {/* ============================ RECEIPT MODAL ============================ */}
      <Modal
        animationType="fade"
        transparent
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Receipt details</ThemedText>
              <IconButton
                icon="close"
                accessibilityLabel="Close receipt details"
                onPress={() => setReceiptModalVisible(false)}
              />
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
            >
              {/* Restaurant + date */}
              <View style={styles.modalRestaurant}>
                <Ionicons name="restaurant-outline" size={24} color={c.accent} />
                <View style={styles.modalRestaurantMeta}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {result.restaurantName || 'Receipt'}
                  </ThemedText>
                  <ThemedText type="caption" muted>
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </ThemedText>
                </View>
              </View>

              {/* Totals */}
              <View style={styles.modalSection}>
                <View style={styles.summaryRow}>
                  <ThemedText type="default" muted>
                    Subtotal
                  </ThemedText>
                  <ThemedText type="moneySm">{money(billSubtotal)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText type="default" muted>
                    Tax ({billTaxPercent.toFixed(1)}%)
                  </ThemedText>
                  <ThemedText type="moneySm">{money(billTax)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText type="default" muted>
                    Tip ({billTipPercent.toFixed(1)}%)
                  </ThemedText>
                  <ThemedText type="moneySm">{money(billTip)}</ThemedText>
                </View>
                <Divider perforated style={styles.summaryPerforated} />
                <View style={styles.summaryRow}>
                  <ThemedText type="defaultSemiBold">Total</ThemedText>
                  <ThemedText type="money" style={styles.summaryTotal}>
                    {money(billGrandTotal)}
                  </ThemedText>
                </View>
              </View>

              {/* Split summary */}
              <ThemedText type="overline" muted style={styles.modalSectionLabel}>
                Split summary
              </ThemedText>
              <View style={styles.modalSection}>
                {(() => {
                  const mePerson = people.find((p) => p.id === 'me');
                  const meAmt = result.splitAmounts.find((s) => s.personId === 'me')?.amount;
                  if (mePerson && meAmt) {
                    return (
                      <View style={styles.modalMeRow}>
                        <ThemedText type="overline" style={styles.modalMeLabel}>
                          You pay
                        </ThemedText>
                        <ThemedText type="money" style={styles.modalMeAmount}>
                          {money(num(meAmt))}
                        </ThemedText>
                      </View>
                    );
                  }
                  return null;
                })()}

                {result.splitAmounts
                  .filter((split) => split.personId !== 'me')
                  .map((split, index) => {
                    const person = people.find((p) => p.id === split.personId);
                    if (!person) return null;
                    return (
                      <View key={person.id} style={styles.modalPersonRow}>
                        <Avatar name={person.name} index={index + 1} size={32} />
                        <ThemedText type="default" style={styles.modalPersonName} numberOfLines={1}>
                          {person.name}
                        </ThemedText>
                        <ThemedText type="moneySm">{money(num(split.amount))}</ThemedText>
                      </View>
                    );
                  })}
              </View>

              {/* All items */}
              {result.menuItems && result.menuItems.length > 0 ? (
                <>
                  <ThemedText type="overline" muted style={styles.modalSectionLabel}>
                    All items
                  </ThemedText>
                  <View style={styles.modalSection}>
                    {result.menuItems.map((item, index) => {
                      const assignedPeople = item.assignedTo
                        .map((id) => people.find((p) => p.id === id)?.name || '')
                        .filter(Boolean);
                      const isLast = index === result.menuItems!.length - 1;

                      return (
                        <View
                          key={item.id}
                          style={[styles.modalItemRow, !isLast && styles.itemRowBorder]}
                        >
                          <View style={styles.itemMeta}>
                            <ThemedText type="default" numberOfLines={1}>
                              {item.name}
                            </ThemedText>
                            {assignedPeople.length > 0 ? (
                              <ThemedText type="caption" muted>
                                {assignedPeople.join(', ')}
                              </ThemedText>
                            ) : null}
                          </View>
                          <ThemedText type="moneySm">{money(item.price)}</ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {/* People */}
              <ThemedText type="overline" muted style={styles.modalSectionLabel}>
                People
              </ThemedText>
              <View style={styles.modalPeopleGrid}>
                {people.map((person, index) => (
                  <View key={person.id} style={styles.modalPersonBadge}>
                    <Avatar name={person.name} index={index} size={28} />
                    <ThemedText type="bodySm" numberOfLines={1} style={styles.modalBadgeName}>
                      {person.name}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title="Close" onPress={() => setReceiptModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================ TIP MODAL ============================ */}
      <Modal
        animationType="fade"
        transparent
        visible={tipModalVisible}
        onRequestClose={handleCloseTipModal}
      >
        <View style={styles.modalScrim}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.tipKav}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View
                style={[
                  styles.modalCard,
                  styles.tipCard,
                  {
                    opacity: tipModalAnimation,
                    transform: [
                      {
                        scale: tipModalAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <ThemedText type="h3">Edit tip</ThemedText>
                  <IconButton
                    icon="close"
                    accessibilityLabel="Close tip editor"
                    onPress={handleCloseTipModal}
                  />
                </View>

                <View style={styles.tipBody}>
                  <ThemedText type="caption" muted style={styles.tipSubtotal}>
                    Subtotal {money(billSubtotal)}
                  </ThemedText>

                  <View style={styles.tipTabs}>
                    <Pill
                      label="Percentage"
                      selected={activeTipOption === 'percent'}
                      onPress={() => setActiveTipOption('percent')}
                      style={styles.tipTab}
                    />
                    <Pill
                      label="Amount"
                      selected={activeTipOption === 'amount'}
                      onPress={() => setActiveTipOption('amount')}
                      style={styles.tipTab}
                    />
                  </View>

                  {activeTipOption === 'percent' ? (
                    <View style={styles.tipInputGroup}>
                      <ThemedText type="overline" muted style={styles.tipInputLabel}>
                        Tip percentage
                      </ThemedText>
                      <View style={styles.tipInputWrap}>
                        <TextInput
                          style={styles.tipInput}
                          placeholder="15.00"
                          placeholderTextColor={c.mutedText}
                          value={tipPercent}
                          onChangeText={handleTipPercentChange}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                          blurOnSubmit
                        />
                        <ThemedText type="defaultSemiBold" muted>
                          %
                        </ThemedText>
                      </View>
                      <ThemedText type="caption" muted style={styles.tipPreview}>
                        Tip amount: {money(parseFloat(tipAmount) > 0 ? parseFloat(tipAmount) : 0)}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.tipInputGroup}>
                      <ThemedText type="overline" muted style={styles.tipInputLabel}>
                        Tip amount
                      </ThemedText>
                      <View style={styles.tipInputWrap}>
                        <ThemedText type="defaultSemiBold" muted>
                          $
                        </ThemedText>
                        <TextInput
                          style={[styles.tipInput, styles.tipInputAmount]}
                          placeholder="0.00"
                          placeholderTextColor={c.mutedText}
                          value={tipAmount}
                          onChangeText={handleTipAmountChange}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                          blurOnSubmit
                        />
                      </View>
                      <ThemedText type="caption" muted style={styles.tipPreview}>
                        {parseFloat(tipPercent) > 0
                          ? `${parseFloat(tipPercent).toFixed(2)}% of subtotal`
                          : 'No tip'}
                      </ThemedText>
                    </View>
                  )}

                  <ThemedText type="overline" muted style={styles.tipInputLabel}>
                    Quick options
                  </ThemedText>
                  <View style={styles.tipQuickRow}>
                    {QUICK_TIPS.map((percent) => (
                      <Pill
                        key={`tip-${percent}`}
                        label={`${percent}%`}
                        selected={activeTipOption === 'percent' && tipPercent === percent.toString()}
                        onPress={() => {
                          setActiveTipOption('percent');
                          setTipPercent(percent.toString());
                          handleTipPercentChange(percent.toString());
                        }}
                        style={styles.tipQuickPill}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.tipFooter}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={handleCloseTipModal}
                    style={styles.tipFooterBtn}
                  />
                  <Button title="Update tip" onPress={handleUpdateTip} style={styles.tipFooterBtn} />
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Breakdown variant rendered on the accent hero (light text on terracotta)
// ---------------------------------------------------------------------------
function PersonBreakdownDetailOnAccent({ breakdown }: { breakdown: PersonBreakdown }) {
  const onAccent = c.onAccent;
  const dim = { color: onAccent, opacity: 0.75 };

  const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={styles.breakdownLine}>
      <ThemedText
        type={strong ? 'defaultSemiBold' : 'bodySm'}
        style={strong ? { color: onAccent } : dim}
      >
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? 'money' : 'moneySm'}
        style={[{ color: onAccent }, strong ? { fontSize: 18, lineHeight: 24 } : null]}
      >
        {value}
      </ThemedText>
    </View>
  );

  return (
    <View>
      <ThemedText type="overline" style={[styles.breakdownHeading, dim]}>
        Your items
      </ThemedText>

      {breakdown.items.length === 0 ? (
        <ThemedText type="caption" style={[styles.breakdownEmpty, dim]}>
          No items assigned — split evenly.
        </ThemedText>
      ) : (
        breakdown.items.map((item) => (
          <View key={item.id} style={styles.heroBreakdownItem}>
            <View style={styles.breakdownItemHeader}>
              <ThemedText
                type="bodySm"
                numberOfLines={1}
                style={[styles.breakdownItemName, { color: onAccent }]}
              >
                {item.name}
              </ThemedText>
              <ThemedText type="moneySm" style={{ color: onAccent }}>
                {money(item.yourShare)}
              </ThemedText>
            </View>
            {item.splitCount > 1 ? (
              <ThemedText type="caption" style={[styles.breakdownItemNote, dim]}>
                {money(item.fullPrice)} ÷ {item.splitCount} people
              </ThemedText>
            ) : null}
          </View>
        ))
      )}

      <Divider color={onAccent} style={[styles.breakdownDivider, { opacity: 0.4 }]} />

      <Line label="Subtotal" value={money(breakdown.subtotalShare)} />
      <Line label={`Tax (${breakdown.taxRate.toFixed(1)}%)`} value={money(breakdown.taxShare)} />
      <Line label={`Tip (${breakdown.tipRate.toFixed(1)}%)`} value={money(breakdown.tipShare)} />

      <Divider perforated color={onAccent} style={[styles.breakdownPerforated, { opacity: 0.5 }]} />

      <Line label="Total" value={money(breakdown.grandTotal)} strong />
    </View>
  );
}

const styles = StyleSheet.create({
  // Generic centered states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  centeredText: {
    textAlign: 'center',
  },

  // Footer
  footerCol: {
    gap: Spacing.sm,
  },

  // Section labels
  sectionLabel: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
  },
  card: {
    marginBottom: Spacing.xs,
  },

  // Hero
  heroCard: {
    backgroundColor: c.accent,
    borderColor: c.accentPressed,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  heroPress: {
    padding: Spacing.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: c.onAccent,
    opacity: 0.85,
  },
  heroAmount: {
    color: c.onAccent,
    marginTop: Spacing.sm,
  },
  heroHint: {
    color: c.onAccent,
    opacity: 0.75,
    marginTop: Spacing.xs,
  },
  heroBreakdownWrap: {
    marginTop: Spacing.lg,
  },
  heroPerforated: {
    marginBottom: Spacing.lg,
  },
  heroBreakdownItem: {
    paddingVertical: Spacing.sm,
  },

  // People owe you
  emptyOwe: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyOweText: {
    textAlign: 'center',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  personRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  personMeta: {
    flex: 1,
  },
  personAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  personAmountText: {
    color: c.accent,
    fontSize: 22,
    lineHeight: 28,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surfaceAlt,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },

  // Breakdown (default surface)
  breakdownContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: c.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  breakdownHeading: {
    marginBottom: Spacing.sm,
  },
  breakdownEmpty: {
    paddingVertical: Spacing.sm,
    textAlign: 'center',
  },
  breakdownItem: {
    paddingVertical: Spacing.xs,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownItemName: {
    flex: 1,
    marginRight: Spacing.md,
  },
  breakdownItemNote: {
    marginTop: 2,
  },
  breakdownDivider: {
    marginVertical: Spacing.md,
  },
  breakdownPerforated: {
    marginVertical: Spacing.md,
  },
  breakdownLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },

  // Bill summary
  restaurantName: {
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  summaryPerforated: {
    marginVertical: Spacing.md,
  },
  summaryTotal: {
    color: c.accent,
    fontSize: 22,
    lineHeight: 28,
  },
  tipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editTipText: {
    color: c.accent,
  },

  // Items
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editItemsText: {
    color: c.accent,
  },
  itemsHint: {
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  itemRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  itemMeta: {
    flex: 1,
    gap: 2,
  },

  receiptButton: {
    marginTop: Spacing.lg,
  },

  // Modal shared
  modalScrim: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...Elevation.e3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: Spacing.xl,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },

  // Receipt modal content
  modalRestaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalRestaurantMeta: {
    flex: 1,
  },
  modalSection: {
    backgroundColor: c.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalSectionLabel: {
    marginBottom: Spacing.md,
  },
  modalMeRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalMeLabel: {
    color: c.accent,
    marginBottom: Spacing.xs,
  },
  modalMeAmount: {
    color: c.accent,
  },
  modalPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalPersonName: {
    flex: 1,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  modalPeopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modalPersonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  modalBadgeName: {
    maxWidth: 120,
  },

  // Tip modal
  tipKav: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipCard: {
    maxHeight: '90%',
  },
  tipBody: {
    padding: Spacing.xl,
  },
  tipSubtotal: {
    marginBottom: Spacing.lg,
  },
  tipTabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tipTab: {
    flex: 1,
    alignItems: 'center',
  },
  tipInputGroup: {
    minHeight: 110,
    marginBottom: Spacing.sm,
  },
  tipInputLabel: {
    marginBottom: Spacing.sm,
  },
  tipInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  tipInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontFamily: 'SpaceMono',
    fontSize: 18,
    color: c.text,
  },
  tipInputAmount: {
    marginLeft: 0,
  },
  tipPreview: {
    marginTop: Spacing.sm,
  },
  tipQuickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tipQuickPill: {
    flex: 1,
    alignItems: 'center',
  },
  tipFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  tipFooterBtn: {
    flex: 1,
  },
});
