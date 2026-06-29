import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { Screen } from '@/components/Screen';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { ReceiptScanLoader } from '@/components/ReceiptScanLoader';
import { useSplitContext } from '@/contexts/SplitContext';
import { Radius, Spacing } from '@/constants/Colors';
import { AnalyzeError } from '@/services/geminiService';

// After this long without a result, hint that the backend may be cold-starting.
const COLD_START_HINT_MS = 8000;

export default function ReviewScreen() {
  const router = useRouter();
  const {
    receiptImage,
    setReceiptImage,
    people,
    setSplitResult,
    recalculateSplitAmounts,
    isResetting,
  } = useSplitContext();
  const { height: windowHeight } = useWindowDimensions();
  // Flexible, capped receipt preview — scales with the screen instead of a
  // fixed 400, but never grows past a comfortable max.
  const imageHeight = Math.min(Math.max(windowHeight * 0.5, 260), 560);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AnalyzeError | null>(null);
  const [coldStart, setColdStart] = useState(false);

  const isMounted = useRef(true);
  const coldStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (coldStartTimer.current) clearTimeout(coldStartTimer.current);
    };
  }, []);

  // If there's no receipt image (and we're not mid-reset), head back to camera.
  useEffect(() => {
    if (isResetting) return;
    if (!receiptImage && isMounted.current) {
      router.replace('/split/camera');
    }
  }, [receiptImage, router, isResetting]);

  const handleRetake = () => {
    router.replace('/split/camera');
    // Clear the image after navigation starts so we don't trigger the
    // "no image" redirect on this screen mid-transition.
    setTimeout(() => setReceiptImage(undefined as unknown as string), 100);
  };

  const runAnalyze = async () => {
    if (!receiptImage) return;

    setIsLoading(true);
    setError(null);
    setColdStart(false);

    // Surface a gentle cold-start hint if the request runs long.
    if (coldStartTimer.current) clearTimeout(coldStartTimer.current);
    coldStartTimer.current = setTimeout(() => {
      if (isMounted.current) setColdStart(true);
    }, COLD_START_HINT_MS);

    try {
      const { analyzeReceipt } = await import('@/services/geminiService');
      const result = await analyzeReceipt(receiptImage);

      if (!isMounted.current) return;

      // Seed split amounts at zero per person, then let the context recompute.
      const initialSplitAmounts = people.map((person) => ({
        personId: person.id,
        amount: '0.00',
      }));

      setSplitResult({
        ...result,
        splitAmounts: initialSplitAmounts,
      });
      recalculateSplitAmounts();

      router.push('/split/items');
    } catch (err) {
      if (!isMounted.current) return;
      const analyzeError =
        err instanceof AnalyzeError
          ? err
          : new AnalyzeError('unknown', { cause: err });
      setError(analyzeError);
    } finally {
      if (coldStartTimer.current) {
        clearTimeout(coldStartTimer.current);
        coldStartTimer.current = null;
      }
      if (isMounted.current) {
        setIsLoading(false);
        setColdStart(false);
      }
    }
  };

  // Holding state while we redirect to the camera (no image yet).
  if (!receiptImage) {
    return (
      <Screen scroll={false}>
        <LoadingState message="Getting things ready…" sub="One moment." />
      </Screen>
    );
  }

  // Error state — never surface raw error text; use the friendly userMessage.
  if (error) {
    return (
      <Screen
        scroll={false}
        header={<SafeAreaHeader title="Review photo" onBack={handleRetake} />}
      >
        <ErrorState
          title="We couldn't read that"
          message={error.userMessage}
          icon="receipt-outline"
          onRetry={error.retryable ? runAnalyze : undefined}
          retryLabel="Try again"
          onSecondary={handleRetake}
          secondaryLabel="Retake photo"
        />
      </Screen>
    );
  }

  // Processing state — the original receipt-scanning animation, recolored.
  if (isLoading) {
    return <ReceiptScanLoader coldStart={coldStart} />;
  }

  return (
    <Screen
      header={<SafeAreaHeader title="Review photo" onBack={handleRetake} />}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button
              title="Retake"
              variant="secondary"
              leftIcon="camera-outline"
              onPress={handleRetake}
            />
          </View>
          <View style={styles.footerButton}>
            <Button title="Continue" rightIcon="arrow-forward" onPress={runAnalyze} />
          </View>
        </View>
      }
    >
      <Card
        padded={false}
        style={[styles.imageCard, { height: imageHeight }]}
        elevation="e1"
      >
        <Image
          source={{ uri: receiptImage }}
          style={styles.image}
          resizeMode="contain"
        />
      </Card>

      <Divider perforated style={styles.divider} />

      <View style={styles.copy}>
        <ThemedText type="overline" muted style={styles.overline}>
          Check before you scan
        </ThemedText>
        <ThemedText type="subtitle" style={styles.question}>
          Is this clear and legible?
        </ThemedText>
        <ThemedText type="default" muted style={styles.instructions}>
          Make sure the items, prices, tax, and total are all in frame and easy
          to read.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    marginTop: Spacing.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.lg,
  },
  divider: {
    marginVertical: Spacing.xl,
  },
  copy: {
    alignItems: 'center',
  },
  overline: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  question: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  instructions: {
    textAlign: 'center',
    maxWidth: 340,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
