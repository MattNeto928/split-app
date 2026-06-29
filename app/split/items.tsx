import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  View,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
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
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { Divider } from '@/components/Divider';
import { useSplitContext } from '@/contexts/SplitContext';
import { Colors, Spacing, Radius, Elevation } from '@/constants/Colors';
import { MenuItem } from '@/types/index';

const c = Colors.light;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ItemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromReview = params.from === 'review';
  const { people, result, assignItemToPerson, updateMenuItem, setSplitResult } = useSplitContext();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editModalAnimation] = useState(new Animated.Value(0));

  // Unassigned items confirmation modal state
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideInHeader = useRef(new Animated.Value(-20)).current;
  const itemsAppear = useRef<Animated.Value[]>(result?.menuItems?.map(() => new Animated.Value(0)) || []).current;

  // Animation refs for chevron rotation and option animations
  const chevronRotation = useRef<{ [key: string]: Animated.Value }>({});
  const personOptionAnims = useRef<{ [key: string]: Animated.Value }>({});

  // Track component mounting state
  const isMounted = useRef(true);

  // Check if we have valid result data
  const hasValidResult = result && result.menuItems && result.menuItems.length > 0;

  useEffect(() => {
    // Start animations only once when the component mounts
    const animationsToRun: Animated.CompositeAnimation[] = [];

    // Header animations
    animationsToRun.push(
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideInHeader, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Item animations - only create them once
    if (result?.menuItems) {
      result.menuItems.forEach((_, index) => {
        if (!itemsAppear[index]) {
          itemsAppear[index] = new Animated.Value(0);
        }
        animationsToRun.push(
          Animated.timing(itemsAppear[index], {
            toValue: 1,
            duration: 400,
            delay: 200 + index * 50,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          })
        );
      });
    }

    Animated.parallel(animationsToRun).start();

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Handle back button press
    const backAction = () => {
      router.push('/split/review');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [router]);

  // Function to check if all items are assigned to at least one person
  const validateAssignments = useCallback(() => {
    if (!result?.menuItems) return false;
    const validItems = result.menuItems.filter((item) => item.price > 0);
    return validItems.every((item) => item.assignedTo.length > 0);
  }, [result]);

  // Get count of unassigned items
  const getUnassignedItemsCount = useCallback(() => {
    if (!result?.menuItems) return 0;
    const validItems = result.menuItems.filter((item) => item.price > 0);
    return validItems.filter((item) => item.assignedTo.length === 0).length;
  }, [result]);

  // Function to navigate forward once all items are assigned
  const handleContinue = useCallback(() => {
    if (validateAssignments()) {
      router.push('/split/tip');
    } else {
      const count = getUnassignedItemsCount();
      setUnassignedCount(count);
      setShowUnassignedModal(true);
    }
  }, [validateAssignments, router, getUnassignedItemsCount]);

  // Handle confirming to continue with unassigned items
  const handleConfirmContinue = useCallback(() => {
    setShowUnassignedModal(false);
    router.push('/split/tip');
  }, [router]);

  // Function to toggle expanded state of an item
  const toggleItemExpansion = useCallback(
    (itemId: string) => {
      const isExpanding = expandedItem !== itemId;
      setExpandedItem(isExpanding ? itemId : null);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      if (isExpanding) {
        requestAnimationFrame(() => {
          if (result?.menuItems) {
            const item = result.menuItems.find((i) => i.id === itemId);
            if (item) {
              const animations: Animated.CompositeAnimation[] = [];

              people.forEach((person, personIndex) => {
                const personAnimKey = `${itemId}_${person.id}`;
                if (!personOptionAnims.current[personAnimKey]) {
                  personOptionAnims.current[personAnimKey] = new Animated.Value(0);
                } else {
                  personOptionAnims.current[personAnimKey].setValue(0);
                }

                animations.push(
                  Animated.timing(personOptionAnims.current[personAnimKey], {
                    toValue: 1,
                    duration: 350,
                    delay: personIndex * 50,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                  })
                );
              });

              Animated.parallel(animations).start();
            }
          }
        });
      }
    },
    [expandedItem, people, result?.menuItems]
  );

  // Animation for the chevron
  const animateItemPress = (itemId: string) => {
    if (!chevronRotation.current[itemId]) {
      chevronRotation.current[itemId] = new Animated.Value(expandedItem === itemId ? 1 : 0);
    }

    Animated.timing(chevronRotation.current[itemId], {
      toValue: expandedItem === itemId ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.cubic),
    }).start();
  };

  // Open edit modal for an item
  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditedName(item.name);
    setEditedPrice(item.price.toString());
    setEditModalVisible(true);

    Animated.spring(editModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    Animated.timing(editModalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.cubic),
    }).start(() => {
      setEditModalVisible(false);
      setEditingItem(null);
    });
  };

  // Save edited item
  const handleSaveItem = () => {
    if (!editingItem) return;

    const price = parseFloat(editedPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) {
      Alert.alert('Invalid price', 'Please enter a valid price.');
      return;
    }

    const updatedItem = {
      ...editingItem,
      name: editedName.trim() || 'Unnamed item',
      price: price,
    };

    updateMenuItem(updatedItem);
    handleCloseEditModal();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
  };

  // Delete item
  const handleDeleteItem = () => {
    if (!editingItem || !result?.menuItems) return;

    Alert.alert('Delete item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!result?.menuItems) return;

          const updatedMenuItems = result.menuItems.filter((item) => item.id !== editingItem.id);

          setSplitResult({
            ...result,
            menuItems: updatedMenuItems,
          });

          handleCloseEditModal();

          LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: MenuItem; index: number }) => {
    // Items like 'Subtotal' or 'Total' with a zero price
    const isZeroPriceItem = item.price <= 0.001;
    const isExpanded = expandedItem === item.id;
    const itemAnimation = itemsAppear[index] || fadeAnim;

    if (!chevronRotation.current[item.id]) {
      chevronRotation.current[item.id] = new Animated.Value(isExpanded ? 1 : 0);
    }

    const assignedPeopleCount = item.assignedTo.length;

    return (
      <Animated.View
        style={{
          opacity: itemAnimation,
          transform: [
            {
              translateY: itemAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
          marginBottom: Spacing.md,
        }}
      >
        <Card padded={false} style={isExpanded ? styles.itemCardExpanded : undefined}>
          <Pressable
            style={styles.itemHeader}
            onPress={() => {
              animateItemPress(item.id);
              toggleItemExpansion(item.id);
            }}
          >
            <View style={styles.itemInfo}>
              <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={2}>
                {item.name}
              </ThemedText>
              <ThemedText type="moneySm">${item.price.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.itemSummary}>
              {assignedPeopleCount > 0 ? (
                <ThemedText type="caption" style={{ color: c.accent }}>
                  Assigned to {assignedPeopleCount} {assignedPeopleCount === 1 ? 'person' : 'people'}
                </ThemedText>
              ) : isZeroPriceItem ? (
                <ThemedText type="caption" muted>
                  No cost
                </ThemedText>
              ) : (
                <ThemedText type="caption" muted>
                  Unassigned
                </ThemedText>
              )}

              <View style={styles.itemActions}>
                <IconButton
                  icon="pencil"
                  onPress={() => handleEditItem(item)}
                  accessibilityLabel={`Edit ${item.name}`}
                  size={16}
                  variant="soft"
                  style={styles.editButton}
                />

                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate:
                          chevronRotation.current[item.id]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                          }) || '0deg',
                      },
                    ],
                  }}
                >
                  <Ionicons name="chevron-down" size={22} color={c.secondaryText} />
                </Animated.View>
              </View>
            </View>
          </Pressable>

          {isExpanded && (
            <Reanimated.View
              entering={FadeInUp.duration(180)}
              exiting={FadeOutUp.duration(140)}
              style={styles.peopleContainer}
            >
              <Divider perforated style={styles.peopleDivider} />

              {isZeroPriceItem ? (
                <View style={styles.zeroPriceInfoBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={c.success}
                    style={styles.zeroPriceIcon}
                  />
                  <ThemedText type="bodySm" style={styles.zeroPriceInfoText}>
                    This is a free item with no cost, so it doesn{'’'}t need to be assigned to anyone and won{'’'}t affect the split.
                  </ThemedText>
                </View>
              ) : (
                <>
                  <ThemedText type="overline" muted style={styles.assignText}>
                    Who had this item?
                  </ThemedText>

                  {people.map((person, personIndex) => {
                    const isAssigned = item.assignedTo.includes(person.id);
                    const personAnimKey = `${item.id}_${person.id}`;

                    if (!personOptionAnims.current[personAnimKey]) {
                      personOptionAnims.current[personAnimKey] = new Animated.Value(0);
                    }

                    return (
                      <Animated.View
                        key={personAnimKey}
                        style={{
                          opacity: personOptionAnims.current[personAnimKey],
                          transform: [
                            {
                              translateY: personOptionAnims.current[personAnimKey].interpolate({
                                inputRange: [0, 1],
                                outputRange: [15, 0],
                              }),
                            },
                          ],
                        }}
                      >
                        <Pressable
                          style={({ pressed }) => [
                            styles.personOption,
                            {
                              backgroundColor: isAssigned ? c.accentSubtle : c.surface,
                              borderColor: isAssigned ? c.accent : c.border,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => {
                            assignItemToPerson(item.id, person.id, !isAssigned);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isAssigned }}
                        >
                          <Avatar name={person.name} index={personIndex} size={32} />
                          <ThemedText
                            type="default"
                            style={[
                              styles.personName,
                              isAssigned && { color: c.accent },
                            ]}
                          >
                            {person.name}
                          </ThemedText>
                          <View
                            style={[
                              styles.checkCircle,
                              {
                                borderColor: isAssigned ? c.accent : c.borderStrong,
                                backgroundColor: isAssigned ? c.accent : 'transparent',
                              },
                            ]}
                          >
                            {isAssigned && (
                              <Ionicons name="checkmark-sharp" size={14} color={c.onAccent} />
                            )}
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}

                  {assignedPeopleCount > 0 && (
                    <View style={styles.splitInfoBox}>
                      <ThemedText type="caption" muted>
                        Each pays
                      </ThemedText>
                      <ThemedText type="moneySm" style={{ color: c.accent }}>
                        ${(item.price / assignedPeopleCount).toFixed(2)}
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </Reanimated.View>
          )}
        </Card>
      </Animated.View>
    );
  };

  const header = (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideInHeader }],
      }}
    >
      <SafeAreaHeader title="Assign items" onBack={() => router.push('/split/review')} />
    </Animated.View>
  );

  // If we don't have valid result data, show a friendly loading placeholder
  if (!hasValidResult) {
    return (
      <Screen header={header} scroll={false}>
        <View style={styles.placeholder}>
          <ThemedText type="default" muted style={styles.placeholderText}>
            Loading item data…
          </ThemedText>
        </View>
      </Screen>
    );
  }

  const footer = (
    <Button title="Continue" rightIcon="arrow-forward" onPress={handleContinue} />
  );

  return (
    <Screen header={header} footer={footer} scroll={false} contentStyle={styles.screenContent}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideInHeader }],
        }}
      >
        <ThemedText type="default" muted style={styles.instructions}>
          Tap each item to assign it to the people who had it.
        </ThemedText>

        <View style={styles.listHeader}>
          <Ionicons
            name={validateAssignments() ? 'checkmark-circle' : 'information-circle-outline'}
            size={18}
            color={validateAssignments() ? c.success : c.accent}
            style={styles.listHeaderIcon}
          />
          <ThemedText type="bodySm" style={styles.listHeaderText}>
            {validateAssignments() ? 'All items are assigned' : 'Tap items below to assign them'}
          </ThemedText>
        </View>
      </Animated.View>

      <FlatList
        data={result.menuItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      />

      {/* Edit Item Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: editModalAnimation,
                transform: [
                  {
                    scale: editModalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Edit item</ThemedText>
              <IconButton
                icon="close"
                onPress={handleCloseEditModal}
                accessibilityLabel="Close edit item"
                size={24}
              />
            </View>

            <View style={styles.modalBody}>
              <Input
                label="Item name"
                placeholder="Enter item name"
                value={editedName}
                onChangeText={setEditedName}
                autoCapitalize="words"
                containerStyle={styles.inputGroup}
              />

              <Input
                label="Price"
                prefix="$"
                placeholder="0.00"
                value={editedPrice}
                onChangeText={setEditedPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Delete"
                leftIcon="trash-outline"
                variant="ghost"
                fullWidth={false}
                onPress={handleDeleteItem}
                textStyle={{ color: c.error }}
                style={styles.deleteButton}
              />
              <Button title="Save" onPress={handleSaveItem} style={styles.saveButton} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Unassigned Items Confirmation Modal */}
      <Modal
        visible={showUnassignedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnassignedModal(false)}
      >
        <View style={styles.unassignedModalOverlay}>
          <View style={styles.unassignedModalContent}>
            <View style={styles.unassignedIconContainer}>
              <Ionicons name="alert-circle-outline" size={40} color={c.warning} />
            </View>

            <ThemedText type="h3" style={styles.unassignedModalTitle}>
              Unassigned items
            </ThemedText>

            <ThemedText type="default" muted style={styles.unassignedModalMessage}>
              {unassignedCount === 1
                ? 'There is 1 unassigned item. Are you sure you want to continue?'
                : `There are ${unassignedCount} unassigned items. Are you sure you want to continue?`}
            </ThemedText>

            <View style={styles.unassignedInfoBox}>
              <Ionicons name="information-circle-outline" size={20} color={c.accent} />
              <ThemedText type="bodySm" style={styles.unassignedInfoText}>
                All unassigned items will be split evenly among everyone.
              </ThemedText>
            </View>

            <View style={styles.unassignedModalButtons}>
              <Button
                title="Go back"
                variant="secondary"
                onPress={() => setShowUnassignedModal(false)}
                style={styles.unassignedModalButton}
              />
              <Button
                title="Continue anyway"
                onPress={handleConfirmContinue}
                style={styles.unassignedModalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: Spacing.lg,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    textAlign: 'center',
  },
  instructions: {
    marginBottom: Spacing.lg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    borderLeftColor: c.accent,
  },
  listHeaderIcon: {
    marginRight: Spacing.sm,
  },
  listHeaderText: {
    flex: 1,
    color: c.text,
  },
  itemCardExpanded: {
    borderColor: c.borderStrong,
  },
  itemHeader: {
    padding: Spacing.lg,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  itemName: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  itemSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editButton: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: Radius.sm,
  },
  peopleContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  peopleDivider: {
    marginBottom: Spacing.md,
  },
  assignText: {
    marginBottom: Spacing.md,
  },
  zeroPriceInfoBox: {
    flexDirection: 'row',
    backgroundColor: c.successSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  zeroPriceIcon: {
    marginRight: Spacing.sm,
  },
  zeroPriceInfoText: {
    flex: 1,
  },
  personOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  personName: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: c.accentSubtle,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  // Edit modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.scrim,
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...Elevation.e3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: Spacing.md,
  },
  deleteButton: {
    paddingHorizontal: 0,
  },
  saveButton: {
    flex: 1,
  },
  // Unassigned confirmation modal
  unassignedModalOverlay: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  unassignedModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: Spacing['2xl'],
    alignItems: 'center',
    ...Elevation.e3,
  },
  unassignedIconContainer: {
    marginBottom: Spacing.lg,
  },
  unassignedModalTitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  unassignedModalMessage: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  unassignedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing['2xl'],
    width: '100%',
    gap: Spacing.sm,
  },
  unassignedInfoText: {
    flex: 1,
    color: c.text,
  },
  unassignedModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
  },
  unassignedModalButton: {
    flex: 1,
  },
});
