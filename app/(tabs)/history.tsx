import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { IconButton } from '@/components/IconButton';
import { useToast } from '@/components/Toast';
import { Colors, Elevation, Radius, Spacing } from '@/constants/Colors';
import {
  getReceiptHistory,
  deleteReceiptFromHistory,
  ReceiptHistoryItem,
} from '@/services/storageService';
import { useSplitContext } from '@/contexts/SplitContext';

const c = Colors.light;

/** Parse a stored currency-ish string into a number. */
function toAmount(value: unknown): number {
  return parseFloat((value ?? '0').toString().replace(/[^0-9.]/g, '')) || 0;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Swipe-to-delete wrapper, restyled to the Receipt system. */
function SwipeableRow({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [88, 0],
    });

    return (
      <Animated.View
        style={[styles.deleteAction, { transform: [{ translateX: trans }] }]}
      >
        <RectButton
          style={styles.deleteButton}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={22} color={c.error} />
          <ThemedText type="caption" lightColor={c.error} style={styles.deleteText}>
            Delete
          </ThemedText>
        </RectButton>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      {children}
    </Swipeable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [history, setHistory] = useState<ReceiptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] =
    useState<ReceiptHistoryItem | null>(null);

  const {
    setReceiptImage,
    setSplitResult,
    people,
    setPeople,
    setCurrentHistoryId,
  } = useSplitContext();

  // Load receipt history
  const loadHistory = useCallback(async () => {
    try {
      const data = await getReceiptHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.show("Couldn't load your history. Pull down to try again.", {
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [loadHistory]);

  // Handle delete receipt
  const handleDeleteReceipt = useCallback(
    async (item: ReceiptHistoryItem) => {
      try {
        const ok = await deleteReceiptFromHistory(item.id);
        if (!ok) {
          throw new Error('delete returned false');
        }
        setHistory((prev) => prev.filter((receipt) => receipt.id !== item.id));
        toast.show('Receipt deleted.', { type: 'success' });
      } catch (error) {
        console.error('Error deleting receipt:', error);
        toast.show("Couldn't delete that receipt. Try again.", {
          type: 'error',
        });
      }
    },
    [toast],
  );

  // Handle view receipt details
  const handleViewReceipt = useCallback((item: ReceiptHistoryItem) => {
    console.log('Viewing receipt:', item.id);
    setSelectedReceipt(item);
    setReceiptModalVisible(true);
  }, []);

  // Handle edit receipt
  const handleEditReceipt = useCallback(
    (item: ReceiptHistoryItem) => {
      console.log('Editing receipt from history:', item.id);

      // Ensure we have the necessary data in the history item
      if (!item.receiptImage || !item.result) {
        console.error(
          'History item is missing required data (image or result). Cannot edit.',
        );
        toast.show("This receipt is missing data, so it can't be edited.", {
          type: 'error',
        });
        return;
      }

      // Validate people data - ensure 'me' exists if people array is present
      const validPeople =
        item.people && item.people.length > 0
          ? item.people.some((p) => p.id === 'me')
            ? item.people
            : [
                { id: 'me', name: 'Me' },
                ...item.people.filter((p) => p.id !== 'me'),
              ]
          : [{ id: 'me', name: 'Me' }]; // Default if no people stored

      // Set the state directly from the history item
      console.log('Setting context state from history item:', item.id);
      setCurrentHistoryId(item.id);
      setReceiptImage(item.receiptImage);
      setPeople(validPeople); // Use the stored or default people list
      setSplitResult(item.result); // Use the stored result object

      // Navigate to results screen for editing.
      // Pass 'from: history' so the target screen can adjust behavior.
      router.push({
        pathname: '/split/results',
        params: { from: 'history' },
      });
    },
    [setReceiptImage, setSplitResult, setPeople, setCurrentHistoryId, router, toast],
  );

  // Receipt list row — flat Card receipt entry
  const renderItem = useCallback(
    ({ item }: { item: ReceiptHistoryItem }) => {
      const date = new Date(item.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      const restaurantName = item.result.restaurantName || 'Receipt';

      // Calculate grand total (base total + tip)
      const baseTotal =
        toAmount(item.result.total) ||
        item.result.menuItems?.reduce(
          (sum, menuItem) => sum + (menuItem.price || 0),
          0,
        ) ||
        0;
      const tip = toAmount(item.result.tip);
      const total = baseTotal + tip;

      return (
        <SwipeableRow onDelete={() => handleDeleteReceipt(item)}>
          <Card
            padded={false}
            onPress={() => handleViewReceipt(item)}
            style={styles.rowCard}
          >
            <View style={styles.row}>
              <View style={styles.thumbWrap}>
                <Image
                  source={{ uri: item.receiptImage }}
                  style={styles.thumb}
                />
              </View>

              <View style={styles.rowInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {restaurantName}
                </ThemedText>
                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={c.mutedText}
                  />
                  <ThemedText type="caption" muted style={styles.metaText}>
                    {formattedDate}
                  </ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={c.mutedText}
                  />
                  <ThemedText type="caption" muted style={styles.metaText}>
                    {formattedTime}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.rowTotal}>
                <ThemedText type="money" style={styles.rowTotalAmount}>
                  {formatMoney(total)}
                </ThemedText>
                <ThemedText type="overline" muted>
                  Total
                </ThemedText>
              </View>
            </View>
          </Card>
        </SwipeableRow>
      );
    },
    [handleViewReceipt, handleDeleteReceipt],
  );

  const header = (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + Spacing.lg },
      ]}
    >
      <ThemedText type="title">History</ThemedText>
    </View>
  );

  return (
    <Screen header={header} scroll={false} contentStyle={styles.screenContent}>
      {loading ? (
        <LoadingState
          message="Loading your history…"
          sub="Gathering your saved receipts."
        />
      ) : history.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No receipts yet"
          message="Your split receipt history will appear here once you scan a check."
        />
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing['4xl'] },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Receipt detail modal */}
      <Modal
        animationType="fade"
        transparent
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Card padded={false} elevation="e2" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Receipt details</ThemedText>
              <IconButton
                icon="close"
                onPress={() => setReceiptModalVisible(false)}
                accessibilityLabel="Close receipt details"
                variant="soft"
              />
            </View>

            {selectedReceipt && (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                {/* Restaurant section */}
                <View style={styles.restaurantSection}>
                  <View style={styles.restaurantIconWrap}>
                    <Ionicons
                      name="restaurant-outline"
                      size={22}
                      color={c.accent}
                    />
                  </View>
                  <View style={styles.restaurantDetails}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {selectedReceipt.result.restaurantName || 'Receipt'}
                    </ThemedText>
                    <ThemedText type="caption" muted>
                      {new Date(selectedReceipt.date).toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        },
                      )}
                    </ThemedText>
                  </View>
                </View>

                {/* Bill details */}
                {(() => {
                  const total = toAmount(selectedReceipt.result.total);
                  const tax = toAmount(selectedReceipt.result.tax);
                  const tip = toAmount(selectedReceipt.result.tip);
                  const subtotal = total - tax;
                  const grandTotal = subtotal + tax + tip;

                  const taxPercent = subtotal > 0 ? (tax / subtotal) * 100 : 0;
                  const tipPercent = subtotal > 0 ? (tip / subtotal) * 100 : 0;

                  return (
                    <Card padded style={styles.billCard}>
                      <View style={styles.billRow}>
                        <ThemedText type="default">Subtotal</ThemedText>
                        <ThemedText type="moneySm">
                          {formatMoney(subtotal)}
                        </ThemedText>
                      </View>
                      <View style={styles.billRow}>
                        <ThemedText type="default">
                          Tax{' '}
                          <ThemedText type="caption" muted>
                            ({taxPercent.toFixed(1)}%)
                          </ThemedText>
                        </ThemedText>
                        <ThemedText type="moneySm">
                          {formatMoney(tax)}
                        </ThemedText>
                      </View>
                      <View style={styles.billRow}>
                        <ThemedText type="default">
                          Tip{' '}
                          <ThemedText type="caption" muted>
                            ({tipPercent.toFixed(1)}%)
                          </ThemedText>
                        </ThemedText>
                        <ThemedText type="moneySm">
                          {formatMoney(tip)}
                        </ThemedText>
                      </View>

                      <Divider perforated style={styles.billDivider} />

                      <View style={styles.billRow}>
                        <ThemedText type="defaultSemiBold">Total</ThemedText>
                        <ThemedText type="money" style={styles.billTotal}>
                          {formatMoney(grandTotal)}
                        </ThemedText>
                      </View>
                    </Card>
                  );
                })()}

                {/* Items */}
                {selectedReceipt.result.menuItems &&
                  selectedReceipt.result.menuItems.length > 0 && (
                    <View style={styles.itemsSection}>
                      <ThemedText
                        type="overline"
                        muted
                        style={styles.sectionLabel}
                      >
                        Items
                      </ThemedText>
                      <Card padded style={styles.itemsCard}>
                        {selectedReceipt.result.menuItems.map((menuItem, index) => (
                          <View key={index}>
                            {index > 0 ? (
                              <Divider style={styles.itemDivider} />
                            ) : null}
                            <View style={styles.itemRow}>
                              <View style={styles.itemDetails}>
                                <ThemedText type="default" numberOfLines={2}>
                                  {menuItem.name}
                                </ThemedText>
                                {menuItem.assignedTo &&
                                  menuItem.assignedTo.length > 0 && (
                                    <ThemedText type="caption" muted>
                                      Assigned to:{' '}
                                      {menuItem.assignedTo
                                        .map((personId) => {
                                          const storedPerson =
                                            selectedReceipt.people?.find(
                                              (p) => p.id === personId,
                                            );
                                          if (storedPerson)
                                            return storedPerson.name;

                                          const contextPerson = people.find(
                                            (p) => p.id === personId,
                                          );
                                          if (contextPerson)
                                            return contextPerson.name;

                                          return personId === 'me'
                                            ? 'Me'
                                            : `Person ${personId}`;
                                        })
                                        .join(', ')}
                                    </ThemedText>
                                  )}
                              </View>
                              <ThemedText type="moneySm" style={styles.itemPrice}>
                                {formatMoney(menuItem.price)}
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                      </Card>
                    </View>
                  )}
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                title="Edit receipt details"
                leftIcon="create-outline"
                onPress={() => {
                  setReceiptModalVisible(false);
                  if (selectedReceipt) {
                    handleEditReceipt(selectedReceipt);
                  }
                }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  screenContent: {
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  // Receipt row
  rowCard: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  rowInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  metaText: {
    marginLeft: Spacing.xs,
  },
  rowTotal: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  rowTotalAmount: {
    fontSize: 20,
    lineHeight: 26,
    color: c.accent,
  },
  // Delete action
  deleteAction: {
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: c.errorSubtle,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    marginTop: Spacing.xs,
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.scrim,
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: Spacing.xl,
  },
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  restaurantIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSubtle,
    marginRight: Spacing.md,
  },
  restaurantDetails: {
    flex: 1,
  },
  billCard: {
    backgroundColor: c.surfaceAlt,
    marginBottom: Spacing.xl,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  billDivider: {
    marginVertical: Spacing.md,
  },
  billTotal: {
    fontSize: 22,
    lineHeight: 28,
    color: c.accent,
  },
  itemsSection: {
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  itemsCard: {
    backgroundColor: c.surfaceAlt,
  },
  itemDivider: {
    marginVertical: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemDetails: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemPrice: {
    marginTop: Spacing.xs,
  },
  modalActions: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
});
