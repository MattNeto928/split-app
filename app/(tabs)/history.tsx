import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getReceiptHistory, deleteReceiptFromHistory, ReceiptHistoryItem } from '@/services/storageService';
import { useSplitContext } from '@/contexts/SplitContext';

const { width } = Dimensions.get('window');

// Loading skeleton component
const LoadingSkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonContainer}>
      {[...Array(5)].map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeletonItem,
            { opacity },
            { transform: [{ translateY: index * 100 }] }
          ]}
        >
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonText} />
            <View style={styles.skeletonText} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const SwipeableRow = ({ item, onDelete, children }: { 
  item: ReceiptHistoryItem; 
  onDelete: (item: ReceiptHistoryItem) => void;
  children: React.ReactNode;
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    return (
      <Animated.View
        style={[
          styles.deleteAction,
          {
            transform: [{ translateX: trans }],
            backgroundColor: isDark ? 'rgba(231, 76, 60, 0.2)' : 'rgba(231, 76, 60, 0.1)',
          },
        ]}
      >
        <RectButton
          style={styles.deleteButton}
          onPress={() => {
            swipeableRef.current?.close();
            Alert.alert(
              'Delete Receipt',
              'Are you sure you want to delete this receipt?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(item),
                },
              ],
              { cancelable: true }
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#e74c3c" />
          <Text style={styles.deleteText}>Delete</Text>
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
};

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  
  const [history, setHistory] = useState<ReceiptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptHistoryItem | null>(null);
  
  const { 
    setReceiptImage, 
    setSplitResult, 
    result, 
    people, 
    receiptImage,
    reset,
    addPerson,
    setPeople,
    setCurrentHistoryId
  } = useSplitContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Load receipt history with animation
  const loadHistory = useCallback(async () => {
    try {
      const data = await getReceiptHistory();
      setHistory(data);
      
      // Start fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim, translateY]);

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
  const handleDeleteReceipt = useCallback(async (item: ReceiptHistoryItem) => {
    try {
      await deleteReceiptFromHistory(item.id);
      setHistory(prev => prev.filter(receipt => receipt.id !== item.id));
    } catch (error) {
      console.error('Error deleting receipt:', error);
      Alert.alert('Error', 'Failed to delete receipt. Please try again.');
    }
  }, []);
  
  // Handle view receipt details
  const handleViewReceipt = useCallback((item: ReceiptHistoryItem) => {
    console.log('Viewing receipt:', item.id);
    
    // First set the selected receipt
    setSelectedReceipt(item);
    
    // Then show the modal immediately - React will batch these updates
    setReceiptModalVisible(true);
  }, []);

  // Handle edit receipt
  const handleEditReceipt = useCallback((item: ReceiptHistoryItem) => {
    console.log('Editing receipt from history:', item.id);

    // Ensure we have the necessary data in the history item
    if (!item.receiptImage || !item.result) {
      console.error('History item is missing required data (image or result). Cannot edit.');
      Alert.alert('Error', 'Cannot edit receipt. Missing required data.');
      return;
    }

    // Validate people data - ensure 'me' exists if people array is present
    const validPeople = item.people && item.people.length > 0 
      ? (item.people.some(p => p.id === 'me') ? item.people : [{ id: 'me', name: 'Me' }, ...item.people.filter(p => p.id !== 'me')])
      : [{ id: 'me', name: 'Me' }]; // Default if no people stored

    // Set the state directly from the history item
    console.log('Setting context state from history item:', item.id);
    setCurrentHistoryId(item.id);
    setReceiptImage(item.receiptImage);
    setPeople(validPeople); // Use the stored or default people list
    setSplitResult(item.result); // Use the stored result object

    // Log the state to verify before navigation
    console.log('Set context for edit - History ID:', item.id);
    console.log('Set context for edit - People:', validPeople);
    console.log('Set context for edit - Result:', item.result);
    
    // Navigate to results screen for editing
    // Pass 'from: history' to potentially bypass validation or adjust behavior on the target screen
    router.push({
      pathname: '/split/results',
      params: { from: 'history' }
    });

  }, [setReceiptImage, setSplitResult, setPeople, setCurrentHistoryId, router]);

  // Enhanced render item with swipe-to-delete
  const renderItem = useCallback(({ item, index }: { item: ReceiptHistoryItem; index: number }) => {
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
    
    // Calculate grand total (subtotal + tax + tip)
    const baseTotal = parseFloat((item.result.total || '0').toString().replace(/[^0-9.]/g, '')) || 
      item.result.menuItems?.reduce((sum, menuItem) => sum + (menuItem.price || 0), 0) || 0;
    const tip = parseFloat((item.result.tip || '0').toString().replace(/[^0-9.]/g, '')) || 0;
    const total = baseTotal + tip;
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            { translateY: translateY },
            { scale: fadeAnim }
          ],
        }}
      >
        <SwipeableRow item={item} onDelete={handleDeleteReceipt}>
          <TouchableOpacity
            style={[styles.receiptItem, { backgroundColor: cardBackground }]}
            onPress={() => handleViewReceipt(item)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isDark ? 
                ['rgba(40, 40, 40, 0.8)', 'rgba(30, 30, 30, 0.8)'] : 
                ['rgba(255, 255, 255, 0.9)', 'rgba(248, 250, 252, 0.9)']}
              style={styles.receiptGradient}
            >
              <View style={styles.receiptHeader}>
                <View style={styles.receiptImageContainer}>
                  <Image
                    source={{ uri: item.receiptImage }}
                    style={styles.receiptImage}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']}
                    style={styles.imageOverlay}
                  />
                </View>
                <View style={styles.receiptInfo}>
                  <ThemedText style={styles.restaurantName}>{restaurantName}</ThemedText>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={14} color={isDark ? '#888' : '#666'} />
                    <ThemedText style={styles.receiptDate}>{formattedDate}</ThemedText>
                  </View>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color={isDark ? '#888' : '#666'} />
                    <ThemedText style={styles.receiptTime}>{formattedTime}</ThemedText>
                  </View>
                </View>
                <View style={styles.receiptTotal}>
                  <ThemedText style={styles.totalAmount}>${parseFloat(total.toString()).toFixed(2)}</ThemedText>
                  <ThemedText style={styles.totalLabel}>Total</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </SwipeableRow>
      </Animated.View>
    );
  }, [fadeAnim, translateY, cardBackground, isDark, handleViewReceipt, handleDeleteReceipt]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <LinearGradient
        colors={isDark ? ['#121212', '#1a1a1a'] : ['#ffffff', '#f8f9fa']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header with safe area padding */}
      <Animated.View style={[
        styles.header,
        {
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          marginBottom: 10,
          opacity: fadeAnim,
          transform: [{ translateY: translateY }]
        }
      ]}>
        <ThemedText style={styles.headerTitle}>History</ThemedText>
      </Animated.View>

      {loading ? (
        <View style={[styles.skeletonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <LoadingSkeleton />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: insets.bottom + 80, // Increased bottom padding to prevent content from being hidden by tab bar
              paddingHorizontal: 20
            }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={textColor}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Empty state with safe area padding */}
      {!loading && history.length === 0 && (
        <View style={[styles.emptyState, { paddingBottom: insets.bottom }]}>
          <Ionicons name="receipt-outline" size={64} color={isDark ? '#444' : '#ddd'} />
          <ThemedText style={styles.emptyStateText}>No receipts yet</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            Your split receipt history will appear here
          </ThemedText>
        </View>
      )}

      {/* Receipt Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#ffffff' }]}>
            <LinearGradient
              colors={isDark ? ['#252525', '#1E1E1E'] : ['#ffffff', '#f8f9fa']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Receipt Details</ThemedText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    console.log('Close button pressed');
                    setReceiptModalVisible(false);
                  }}
                >
                  <View style={styles.closeButtonCircle}>
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#000'} />
                  </View>
                </TouchableOpacity>
              </View>

              {selectedReceipt && (
                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Restaurant Name Section */}
                  <View style={styles.restaurantSection}>
                    <Ionicons
                      name="restaurant-outline"
                      size={28}
                      color={isDark ? '#3498db' : '#2980b9'}
                      style={styles.restaurantIcon}
                    />
                    <View style={styles.restaurantDetails}>
                      <ThemedText style={styles.restaurantName}>
                        {selectedReceipt.result.restaurantName || 'Receipt'}
                      </ThemedText>
                      <ThemedText style={styles.receiptDate}>
                        {new Date(selectedReceipt.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Bill Details Section */}
                  <View style={styles.billSection}>
                    <LinearGradient
                      colors={isDark ? 
                        ['rgba(40, 40, 40, 0.8)', 'rgba(30, 30, 30, 0.8)'] : 
                        ['rgba(255, 255, 255, 0.9)', 'rgba(248, 250, 252, 0.9)']}
                      style={styles.billGradient}
                    >
                      {(() => {
                        // Calculate values ensuring tip is included
                        const total = parseFloat(selectedReceipt.result.total.replace(/[^0-9.]/g, '')) || 0;
                        const tax = parseFloat(selectedReceipt.result.tax.replace(/[^0-9.]/g, '')) || 0;
                        const tip = parseFloat(selectedReceipt.result.tip.replace(/[^0-9.]/g, '')) || 0;
                        const subtotal = total - tax;
                        const grandTotal = subtotal + tax + tip;

                        // Calculate tax and tip percentages
                        const taxPercent = subtotal > 0 ? (tax / subtotal) * 100 : 0;
                        const tipPercent = subtotal > 0 ? (tip / subtotal) * 100 : 0;

                        return (
                          <>
                            <View style={styles.receiptDetailRow}>
                              <ThemedText style={styles.receiptDetailLabel}>Subtotal</ThemedText>
                              <ThemedText style={styles.receiptDetailValue}>${subtotal.toFixed(2)}</ThemedText>
                            </View>
                            <View style={styles.receiptDetailRow}>
                              <ThemedText style={styles.receiptDetailLabel}>
                                Tax <ThemedText style={styles.percentageText}>({taxPercent.toFixed(1)}%)</ThemedText>
                              </ThemedText>
                              <ThemedText style={styles.receiptDetailValue}>${tax.toFixed(2)}</ThemedText>
                            </View>
                            <View style={styles.receiptDetailRow}>
                              <ThemedText style={styles.receiptDetailLabel}>
                                Tip <ThemedText style={styles.percentageText}>({tipPercent.toFixed(1)}%)</ThemedText>
                              </ThemedText>
                              <ThemedText style={styles.receiptDetailValue}>${tip.toFixed(2)}</ThemedText>
                            </View>
                            <View style={[styles.receiptDetailRow, styles.totalDetailRow]}>
                              <ThemedText style={styles.totalDetailLabel}>Total</ThemedText>
                              <ThemedText style={styles.totalDetailValue}>${grandTotal.toFixed(2)}</ThemedText>
                            </View>
                          </>
                        );
                      })()}
                    </LinearGradient>
                  </View>

                  {/* Items Section - Only show if there are items */}
                  {selectedReceipt.result.menuItems && selectedReceipt.result.menuItems.length > 0 && (
                    <View style={styles.itemsSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons
                          name="list-outline"
                          size={20}
                          color={isDark ? '#3498db' : '#2980b9'}
                        />
                        <ThemedText style={styles.sectionTitle}>Items</ThemedText>
                      </View>
                      <LinearGradient
                        colors={isDark ? 
                          ['rgba(40, 40, 40, 0.8)', 'rgba(30, 30, 30, 0.8)'] : 
                          ['rgba(255, 255, 255, 0.9)', 'rgba(248, 250, 252, 0.9)']}
                        style={styles.itemsGradient}
                      >
                        {selectedReceipt.result.menuItems.map((item, index) => (
                          <View key={index} style={styles.itemRow}>
                            <View style={styles.itemDetails}>
                              <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                              {item.assignedTo && item.assignedTo.length > 0 && (
                                <ThemedText style={styles.itemAssignedTo}>
                                  Assigned to: {item.assignedTo.map(personId => {
                                    // First try to find the person in the stored people array
                                    const storedPerson = selectedReceipt.people?.find(p => p.id === personId);
                                    if (storedPerson) return storedPerson.name;
                                    
                                    // If not found, check the current context
                                    const contextPerson = people.find(p => p.id === personId);
                                    if (contextPerson) return contextPerson.name;
                                    
                                    // If still not found, just return the ID
                                    return personId === 'me' ? 'Me' : `Person ${personId}`;
                                  }).join(', ')}
                                </ThemedText>
                              )}
                            </View>
                            <ThemedText style={styles.itemPrice}>${item.price.toFixed(2)}</ThemedText>
                          </View>
                        ))}
                      </LinearGradient>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    setReceiptModalVisible(false);
                    if (selectedReceipt) {
                      handleEditReceipt(selectedReceipt);
                    }
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#ffffff" />
                  <ThemedText style={styles.actionButtonText}>Edit Receipt Details</ThemedText>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: 'OutfitBold',
    lineHeight: 41, // Added to ensure proper text rendering
  },
  listContent: {
    flexGrow: 1,
  },
  receiptItem: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  receiptGradient: {
    padding: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  receiptInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: 'OutfitSemiBold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptDate: {
    fontSize: 14,
    marginLeft: 6,
    fontFamily: 'OutfitMedium',
    opacity: 0.7,
  },
  receiptTime: {
    fontSize: 14,
    marginLeft: 6,
    fontFamily: 'OutfitMedium',
    opacity: 0.7,
  },
  receiptTotal: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'OutfitSemiBold',
    color: '#3498db',
  },
  totalLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    fontFamily: 'OutfitMedium',
  },
  // Skeleton styles
  skeletonContainer: {
    padding: 20,
  },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonText: {
    height: 14,
    width: '40%',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 4,
    marginBottom: 6,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    fontFamily: 'OutfitSemiBold',
  },
  emptyStateSubtext: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'OutfitRegular',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalGradient: {
    width: '100%',
    height: '100%',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
  },
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
  },
  restaurantIcon: {
    marginRight: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  billSection: {
    marginBottom: 24,
  },
  billGradient: {
    borderRadius: 12,
    padding: 16,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  receiptDetailLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  receiptDetailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalDetailRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  totalDetailLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalDetailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  percentageText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  itemsSection: {
    marginBottom: 24,
  },
  itemsGradient: {
    borderRadius: 12,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    marginBottom: 2,
  },
  itemAssignedTo: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#3498db',
  },
  editButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#ffffff',
  },
  deleteAction: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 16,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteText: {
    color: '#e74c3c',
    fontSize: 14,
    fontFamily: 'OutfitMedium',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
