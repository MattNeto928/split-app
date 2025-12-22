import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
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
  Text,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { useSplitContext } from '@/contexts/SplitContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuItem } from '@/types/index';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  // Background gradient colors
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a'] as const
    : ['#ffffff', '#f8f9fa'] as const;

  // Button gradient
  const buttonGradient = isDark
    ? ['#3498db', '#2c7db1'] as const
    : ['#3498db', '#2980b9'] as const;

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
  const scaleButton = useRef(new Animated.Value(0.95)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const itemsAppear = useRef<Animated.Value[]>(result?.menuItems?.map(() => new Animated.Value(0)) || []).current;

  // Animation refs for chevron rotation and option animations
  const chevronRotation = useRef<{[key: string]: Animated.Value}>({});
  const personOptionAnims = useRef<{[key: string]: Animated.Value}>({}); // Store animations for each person option
  const itemScaleAnims = useRef<{[key: string]: Animated.Value}>({}); // For press animations

  // Track component mounting state and prevent concurrent updates
  const isMounted = useRef(true);
  const isUpdating = useRef(false);

  // Check if we have valid result data
  const hasValidResult = result && result.menuItems && result.menuItems.length > 0;

  // Get the count of items
  const itemCount = result?.menuItems?.length || 0;

  useEffect(() => {
    // Start animations only once when the component mounts
    const animationsToRun = [];

    // Header animations
    animationsToRun.push(
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(slideInHeader, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(scaleButton, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.elastic(1)
      })
    );

    // Item animations - only create them once
    if (result?.menuItems) {
      // Create all item animations at once, not in a loop that creates new values each time
      result.menuItems.forEach((_, index) => {
        if (!itemsAppear[index]) {
          itemsAppear[index] = new Animated.Value(0);
        }
        animationsToRun.push(
          Animated.timing(itemsAppear[index], {
            toValue: 1,
            duration: 400,
            delay: 200 + (index * 50),
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
          })
        );
      });
    }

    // Run all animations in parallel
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

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [router]);

  // Function to check if all items are assigned to at least one person
  const validateAssignments = useCallback(() => {
    if (!result?.menuItems) return false;

    // Only check items with a price greater than 0
    const validItems = result.menuItems.filter(item => item.price > 0);

    // Check if all valid items are assigned to at least one person
    return validItems.every(item => item.assignedTo.length > 0);
  }, [result]);

  // Get count of unassigned items
  const getUnassignedItemsCount = useCallback(() => {
    if (!result?.menuItems) return 0;
    const validItems = result.menuItems.filter(item => item.price > 0);
    return validItems.filter(item => item.assignedTo.length === 0).length;
  }, [result]);

  // Function to navigate forward once all items are assigned
  const handleContinue = useCallback(() => {
    // Check if all items have been assigned
    if (validateAssignments()) {
      router.push('/split/tip');
    } else {
      // Count unassigned items and show confirmation modal
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

  // Function to toggle expanded state of an item - optimize this to prevent repeated calls
  const toggleItemExpansion = useCallback((itemId: string) => {
    // Only log this when debugging is needed
    // console.log(`Toggle item expansion: ${itemId}`);

    // Fix the improper conditional that was causing continuous renders
    const isExpanding = expandedItem !== itemId;

    // Set the expanded state
    setExpandedItem(isExpanding ? itemId : null);

    // Use a simpler layout animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Only perform animations if we're actually expanding
    if (isExpanding) {
      // Initialize animations for all person options for this item - but only if not already done
      requestAnimationFrame(() => {
        if (result?.menuItems) {
          const item = result.menuItems.find(i => i.id === itemId);
          if (item) {
            const animations: Animated.CompositeAnimation[] = [];

            people.forEach((person, personIndex) => {
              const personAnimKey = `${itemId}_${person.id}`;
              if (!personOptionAnims.current[personAnimKey]) {
                personOptionAnims.current[personAnimKey] = new Animated.Value(0);
              } else {
                // Reset animation value
                personOptionAnims.current[personAnimKey].setValue(0);
              }

              // Store animation to run them all together
              animations.push(
                Animated.timing(personOptionAnims.current[personAnimKey], {
                  toValue: 1,
                  duration: 350,
                  delay: personIndex * 50,
                  useNativeDriver: true,
                  easing: Easing.out(Easing.cubic)
                })
              );
            });

            // Run all animations in parallel
            Animated.parallel(animations).start();
          }
        }
      });
    }
  }, [expandedItem, people, result?.menuItems]);

  // Animation for the chevron
  const animateItemPress = (itemId: string) => {
    if (!chevronRotation.current[itemId]) {
      chevronRotation.current[itemId] = new Animated.Value(expandedItem === itemId ? 1 : 0);
    }

    Animated.timing(chevronRotation.current[itemId], {
      toValue: expandedItem === itemId ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.cubic)
    }).start();
  };

  // Open edit modal for an item
  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditedName(item.name);
    setEditedPrice(item.price.toString());
    setEditModalVisible(true);

    // Animate modal appearance
    Animated.spring(editModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 50
    }).start();
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    Animated.timing(editModalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.cubic)
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
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    const updatedItem = {
      ...editingItem,
      name: editedName.trim() || 'Unnamed Item',
      price: price
    };

    updateMenuItem(updatedItem);
    handleCloseEditModal();

    // Show confirmation animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
  };

  // Delete item
  const handleDeleteItem = () => {
    if (!editingItem || !result?.menuItems) return;

    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (!result?.menuItems) return;

            // Filter out the item to delete
            const updatedMenuItems = result.menuItems.filter(item => item.id !== editingItem.id);

            // Update context with modified menu items
            setSplitResult({
              ...result,
              menuItems: updatedMenuItems
            });

            handleCloseEditModal();

            // Show confirmation animation
            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
          }
        }
      ]
    );
  };



  const renderItem = ({ item, index }: { item: MenuItem, index: number }) => {
    // Check if this item's price is zero (or very close to zero), items like 'Subtotal' or 'Total'
    const isZeroPriceItem = item.price <= 0.001;
    const isExpanded = expandedItem === item.id;
    const itemAnimation = itemsAppear[index] || fadeAnim;

    // Get current chevron animation value or create new one
    if (!chevronRotation.current[item.id]) {
      chevronRotation.current[item.id] = new Animated.Value(isExpanded ? 1 : 0);
    }

    // Initialize or get the press scale animation for this item
    if (!itemScaleAnims.current[item.id]) {
      itemScaleAnims.current[item.id] = new Animated.Value(1);
    }
    const pressScaleAnim = itemScaleAnims.current[item.id];

    // Get the count of people assigned to this item
    const assignedPeopleCount = item.assignedTo.length;

    const handlePressIn = () => {
      Animated.timing(pressScaleAnim, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic)
      }).start();
    };

    const handlePressOut = () => {
      Animated.timing(pressScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic)
      }).start();
    };

    return (
      <Animated.View style={{
        opacity: itemAnimation,
        transform: [
          { translateY: itemAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0] // Reduced distance for smoother appearance
            })
          }
        ]
      }}>
        <Animated.View
          style={[
            styles.itemCard,
            {
              overflow: 'hidden',
              transform: [{ scale: pressScaleAnim }]
            },
            isZeroPriceItem && styles.zeroPriceItemCard
          ]}
        >
          <Pressable
            style={styles.itemHeader}
            onPress={() => {
              animateItemPress(item.id);
              toggleItemExpansion(item.id);
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.itemInfo}>
              <ThemedText style={styles.itemName}>{item.name}</ThemedText>
              <ThemedText style={styles.itemPrice}>${item.price.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.itemSummary}>
              {assignedPeopleCount > 0 ? (
                <View style={styles.assignedPeople}>
                  <ThemedText style={styles.assignedCount}>
                    Assigned to {assignedPeopleCount} {assignedPeopleCount === 1 ? 'person' : 'people'}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.unassigned}>Unassigned</ThemedText>
              )}

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditItem(item)}
                >
                  <Ionicons name="pencil" size={16} color="#3498db" />
                </TouchableOpacity>

                <Animated.View style={{
                  transform: [{
                    rotate: chevronRotation.current[item.id]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg']
                    }) || '0deg'
                  }]
                }}>
                  <Ionicons
                    name="chevron-down"
                    size={22}
                    color={textColor}
                    style={{ opacity: 0.7 }}
                  />
                </Animated.View>
              </View>
            </View>
          </Pressable>

          {isExpanded && (
            <View style={[styles.peopleContainer, { overflow: 'hidden' }]}>
              {isZeroPriceItem ? (
                <View style={styles.zeroPriceInfoBox}>
                  <Ionicons name="checkmark-circle" size={24} color="#27ae60" style={{marginRight: 8}} />
                  <ThemedText style={styles.zeroPriceInfoText}>
                    This is a free item with no cost, so it doesn't need to be assigned to anyone and won't affect the split.
                  </ThemedText>
                </View>
              ) : (
                <>
                  <ThemedText style={styles.assignText}>Who had this item?</ThemedText>

                  {people.map((person, personIndex) => {
                    const isAssigned = item.assignedTo.includes(person.id);
                    // Instead of using useRef here, use the already established animation objects
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
                                outputRange: [15, 0]
                              })
                            }
                          ]
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.personOption,
                            isAssigned && styles.personOptionSelected
                          ]}
                          onPress={() => {
                            // This is where we toggle the assignment
                            assignItemToPerson(item.id, person.id, !isAssigned);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.personRow}>
                            <View style={[
                              styles.checkCircle,
                              isAssigned && styles.checkCircleSelected
                            ]}>
                              {isAssigned && (
                                <Ionicons
                                  name="checkmark-sharp"
                                  size={14}
                                  color="#FFF"
                                  style={styles.checkIcon}
                                />
                              )}
                            </View>
                            <ThemedText style={styles.personName}>
                              {person.name}
                            </ThemedText>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}

                  {assignedPeopleCount > 0 && (
                    <Animated.View style={{
                      opacity: fadeAnim,
                      transform: [{
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0]
                        })
                      }],
                      marginTop: 12,
                      backgroundColor: 'rgba(46, 134, 222, 0.08)',
                      padding: 10,
                      borderRadius: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }}>
                      <ThemedText style={styles.splitInfo}>
                        {(item.price / assignedPeopleCount).toFixed(2)} per person
                      </ThemedText>
                    </Animated.View>
                  )}
                </>
              )}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    );
  };

  // If we don't have valid result data, just return a loading placeholder
  if (!hasValidResult) {
    return (
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={backgroundGradient}
          style={styles.background}
        />
        <View style={styles.container}>
          <ThemedText style={styles.instructions}>
            Loading item data...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={backgroundGradient}
        style={styles.background}
      />
      <View style={styles.container}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideInHeader }]
        }}>
          <SafeAreaHeader
            title="Assign Items"
            onBack={() => {
              // Always navigate back to review screen
              router.push('/split/review');
            }}
          />
        </Animated.View>

        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideInHeader }]
        }}>
          <ThemedText style={styles.instructions}>
            Tap each item to assign it to the people who had it
          </ThemedText>
        </Animated.View>

        <View style={styles.listHeader}>
          <View style={styles.listHeaderContent}>
            <ThemedText style={styles.listHeaderText}>
              {validateAssignments()
                ? "All items are assigned"
                : "Tap items below to assign them"}
            </ThemedText>


          </View>
        </View>

        <FlatList
          data={result.menuItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          removeClippedSubviews={false} // Improves animation performance
        />

        <Animated.View style={[
          styles.continueButtonContainer,
          {
            opacity: buttonOpacity,
            transform: [{ scale: scaleButton }]
          }
        ]}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Edit Item Modal */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="none"
          onRequestClose={handleCloseEditModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <Animated.View style={[
              styles.modalContent,
              {
                opacity: editModalAnimation,
                transform: [
                  {
                    scale: editModalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1]
                    })
                  }
                ],
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF'
              }
            ]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  Edit Item
                </ThemedText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseEditModal}
                >
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Item Name</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      { color: textColor, borderColor: isDark ? '#333' : '#ddd' }
                    ]}
                    placeholder="Enter item name"
                    placeholderTextColor={isDark ? '#777' : '#999'}
                    value={editedName}
                    onChangeText={setEditedName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Price</ThemedText>
                  <View style={styles.priceInputContainer}>
                    <Text style={[styles.dollarSign, { color: textColor }]}>$</Text>
                    <TextInput
                      style={[
                        styles.priceInput,
                        { color: textColor, borderColor: isDark ? '#333' : '#ddd' }
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={isDark ? '#777' : '#999'}
                      value={editedPrice}
                      onChangeText={setEditedPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.modalFooter}>
                {editingItem ? (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={handleDeleteItem}
                  >
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveItem}
                >
                  <LinearGradient
                    colors={buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
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
            <View style={[
              styles.unassignedModalContent,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
            ]}>
              {/* Warning Icon */}
              <View style={styles.unassignedIconContainer}>
                <Ionicons name="alert-circle" size={40} color="#F59E0B" />
              </View>

              {/* Title */}
              <ThemedText style={styles.unassignedModalTitle}>
                Unassigned Items
              </ThemedText>

              {/* Message */}
              <ThemedText style={[styles.unassignedModalMessage, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                There {unassignedCount === 1 ? 'is' : 'are'} <Text style={styles.unassignedCountText}>{unassignedCount}</Text> unassigned {unassignedCount === 1 ? 'item' : 'items'}. Are you sure you want to continue?
              </ThemedText>

              {/* Info Box */}
              <View style={[styles.unassignedInfoBox, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <Ionicons name="information-circle" size={20} color={isDark ? '#60A5FA' : '#3B82F6'} />
                <ThemedText style={[styles.unassignedInfoText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                  All unassigned items will be split evenly among everyone.
                </ThemedText>
              </View>

              {/* Buttons */}
              <View style={styles.unassignedModalButtons}>
                <TouchableOpacity
                  style={[styles.unassignedModalButton, styles.unassignedCancelButton, { borderColor: isDark ? '#4B5563' : '#D1D5DB' }]}
                  onPress={() => setShowUnassignedModal(false)}
                >
                  <ThemedText style={[styles.unassignedCancelButtonText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    Go Back
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unassignedModalButton, styles.unassignedConfirmButton]}
                  onPress={handleConfirmContinue}
                >
                  <Text style={styles.unassignedConfirmButtonText}>
                    Continue Anyway
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 36, // Add extra padding at the bottom to prevent buttons from getting cut off
  },
  // Header styles now handled by SafeAreaHeader component
  instructions: {
    marginBottom: 20,
    opacity: 0.8,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80, // Increased to ensure content doesn't get cut off
  },
  listHeader: {
    backgroundColor: 'rgba(46, 134, 222, 0.1)',
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E86DE',
  },
  listHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderText: {
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  addItemText: {
    fontSize: 14,
    color: '#3498db',
    marginLeft: 4,
  },
  itemCard: {
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  zeroPriceItemCard: {
    backgroundColor: 'rgba(39, 174, 96, 0.05)', // Light green background for $0 items
    borderColor: 'rgba(39, 174, 96, 0.2)',
    borderWidth: 1,
  },
  itemHeader: {
    padding: 16,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  assignedCount: {
    fontSize: 14,
    color: '#2E86DE',
  },
  assignedPeople: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unassigned: {
    fontSize: 14,
    opacity: 0.5,
  },
  peopleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  assignText: {
    fontSize: 15,
    marginBottom: 10,
    opacity: 0.7,
  },
  zeroPriceInfoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  zeroPriceInfoText: {
    fontSize: 14,
    flex: 1,
  },
  personOption: {
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  personOptionSelected: {
    backgroundColor: 'rgba(46, 134, 222, 0.1)',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(46, 134, 222, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
    left: 7
  },
  checkCircleSelected: {
    backgroundColor: '#2E86DE',
    borderColor: '#2E86DE',
    position: 'relative',
    left: 7,
  },
  checkIcon: {
  },
  personName: {
    fontSize: 15,
    position: 'relative',
    left: 7,
  },
  splitInfo: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  continueButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  continueButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: 18,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    marginLeft: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 12,
  },
  saveButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Unassigned Items Confirmation Modal Styles
  unassignedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unassignedModalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  unassignedIconContainer: {
    marginBottom: 16,
  },
  unassignedModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  unassignedModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  unassignedCountText: {
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  unassignedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  unassignedInfoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    lineHeight: 20,
  },
  unassignedModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  unassignedModalButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  unassignedCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  unassignedCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  unassignedConfirmButton: {
    backgroundColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  unassignedConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});