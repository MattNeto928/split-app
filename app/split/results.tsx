import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Share,
  View,
  Animated,
  Easing,
  Text,
  Modal,
  Dimensions,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { useSplitContext } from '@/contexts/SplitContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { saveReceiptToHistory } from '@/services/storageService';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Function to generate consistent colors based on index
const getPersonColor = (index: number) => {
  const colors = [
    '#3498db', // Blue
    '#2ecc71', // Green
    '#e74c3c', // Red
    '#9b59b6', // Purple
    '#f1c40f', // Yellow
    '#1abc9c', // Teal
    '#e67e22', // Orange
    '#34495e', // Navy
  ];
  return colors[index % colors.length];
};

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromHistory = params.from === 'history'; // Check if we came from history
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  
  const { 
    people, 
    receiptImage, 
    result, 
    reset, 
    recalculateSplitAmounts,
    setSplitResult,
    setReceiptImage,
    assignItemToPerson,
    currentHistoryId,
    setCurrentHistoryId
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

  // Background gradient colors
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a'] as const
    : ['#ffffff', '#f8f9fa'] as const;

  // Card gradient
  const cardGradient = isDark
    ? ['rgba(40, 40, 40, 0.8)', 'rgba(30, 30, 30, 0.8)'] as const
    : ['rgba(255, 255, 255, 0.9)', 'rgba(248, 250, 252, 0.9)'] as const;

  // Button gradient
  const buttonGradient = isDark
    ? ['#3498db', '#2c7db1'] as const
    : ['#3498db', '#2980b9'] as const;

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const staggeredItems = useRef(people.map(() => new Animated.Value(0))).current;
  const scaleYouPay = useRef(new Animated.Value(0.9)).current;

  // Track component mounting
  const isMounted = useRef(false);

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    console.log('Results screen mounted, checking data:', {
      hasReceiptImage: !!receiptImage,
      hasResult: !!result,
      splitAmounts: result?.splitAmounts?.length
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
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.elastic(1.3),
        }),
        Animated.stagger(150,
          staggeredItems.map(anim =>
            Animated.timing(anim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            })
          )
        )
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
          Alert.alert('Error', 'Could not load split details from history.');
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
        .catch(error => {
          console.error('Error saving/updating receipt to history:', error);
          Alert.alert('Error', 'Could not save receipt details.');
          // Still start animations even if save fails
          startAnimations(); 
        });
      // --- End Save/Update --- 

    }, 150); // Slightly longer timeout again

    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  // Corrected dependencies: include history ID state and setter
  }, [receiptImage, result, fromHistory, router, recalculateSplitAmounts, people, currentHistoryId, setCurrentHistoryId]); 

  const handleShareResults = useCallback(() => {
    if (!result || !people) return;
    
    // Calculate values ensuring tip is included
    const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
    const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
    const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
    const subtotal = total - tax;
    const grandTotal = subtotal + tax + tip;
    
    // Calculate tax and tip rates
    const taxRate = subtotal > 0 ? tax / subtotal : 0;
    const tipRate = subtotal > 0 ? tip / subtotal : 0;

    // Log the values for debugging
    console.log('Sharing results:');
    console.log(`Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`Tax: $${tax.toFixed(2)}`);
    console.log(`Tip: $${tip.toFixed(2)}`);
    console.log(`Total with tip: $${grandTotal.toFixed(2)}`);

    // Restaurant name if available
    const restaurantLine = result.restaurantName ? `📍 ${result.restaurantName}\n\n` : '';

    const totalMessage = `💰 Bill Summary\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nTip: $${tip.toFixed(2)}\nTotal: $${grandTotal.toFixed(2)}`;

    // Build detailed breakdown for each person
    const detailedBreakdowns = result.splitAmounts
      .map(split => {
        const person = people.find(p => p.id === split.personId);
        if (!person) return '';
        
        // Get this person's items
        const personItems = result.menuItems
          ?.filter(item => item.assignedTo.includes(split.personId) && item.price > 0)
          .map(item => {
            const splitCount = item.assignedTo.length;
            const itemShare = item.price / splitCount;
            if (splitCount > 1) {
              return `  • ${item.name}: $${itemShare.toFixed(2)} (split ${splitCount} ways)`;
            }
            return `  • ${item.name}: $${itemShare.toFixed(2)}`;
          }) || [];
        
        // Calculate their subtotal, tax, and tip
        const personSubtotal = personItems.length > 0 
          ? result.menuItems
              ?.filter(item => item.assignedTo.includes(split.personId) && item.price > 0)
              .reduce((sum, item) => sum + (item.price / item.assignedTo.length), 0) || 0
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

    // Calculate sum of all shares to verify
    let sumOfAllShares = 0;
    result.splitAmounts.forEach(split => {
      sumOfAllShares += parseFloat(split.amount);
    });

    console.log(`Sum of all shares: $${sumOfAllShares.toFixed(2)}`);
    console.log(`Match expected total? ${Math.abs(grandTotal - sumOfAllShares) < 0.02 ? 'Yes' : 'No'}`);

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
    const currentTip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
    
    // Calculate subtotal and tip percentage
    const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
    const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
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
      tension: 50
    }).start();
  };

  const handleCloseTipModal = () => {
    Animated.timing(tipModalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.cubic)
    }).start(() => {
      setTipModalVisible(false);
    });
  };

  const handleUpdateTip = () => {
    if (!result) return;
    
    try {
      // Parse values
      const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
      const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
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
        tip: newTipValue.toString()
      };
      
      // Recalculate split amounts with new tip
      setSplitResult(updatedResult);
      
      // Use requestAnimationFrame to ensure state update has a chance to propagate
      requestAnimationFrame(() => {
        recalculateSplitAmounts(newTipValue.toString()); // Pass the new tip value directly
      });
      
      // Close modal
      handleCloseTipModal();
    } catch (error) {
      console.error('Error updating tip:', error);
      Alert.alert('Error', 'Could not update tip. Please try again.');
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
      const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
      const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
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
      const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
      const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
      const subtotal = total - tax;
      
      if (subtotal > 0) {
        const percent = parseFloat(value) || 0;
        const newAmount = (percent / 100) * subtotal;
        setTipAmount(newAmount.toFixed(2));
      }
    }
  };

  if (error) {
    return (
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={backgroundGradient}
          style={styles.background}
        />
        <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top : 40 }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>Error</ThemedText>
          </View>

          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#FF5722" style={styles.errorIcon} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>

            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => router.back()}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButtonGradient}
              >
                <Text style={styles.buttonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={backgroundGradient}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <ThemedText style={styles.loadingText}>
            Calculating final split...
          </ThemedText>
        </View>
      </View>
    );
  }

  // Find the "Me" person
  const mePersonId = people.find(p => p.id === 'me')?.id;
  const meAmount = mePersonId ? result.splitAmounts.find(s => s.personId === mePersonId)?.amount : null;

  // Get all other people who owe "Me"
  const peopleWhoOwe = mePersonId ? result.splitAmounts
    .filter(s => s.personId !== mePersonId)
    .map(split => {
      const person = people.find(p => p.id === split.personId);
      return {
        id: split.personId,
        name: person?.name || '',
        amount: split.amount
      };
    }) : [];

  // Calculate detailed breakdown for a person
  const getPersonBreakdown = useCallback((personId: string) => {
    if (!result?.menuItems) return null;

    // Get tax and tip rates
    const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
    const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
    const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
    const subtotal = total - tax;
    const taxRate = subtotal > 0 ? tax / subtotal : 0;
    const tipRate = subtotal > 0 ? tip / subtotal : 0;

    // Find all items assigned to this person
    const personItems = result.menuItems
      .filter(item => item.assignedTo.includes(personId) && item.price > 0)
      .map(item => {
        const splitCount = item.assignedTo.length;
        const itemShare = item.price / splitCount;
        const itemTax = itemShare * taxRate;
        const itemTip = itemShare * tipRate;
        return {
          id: item.id,
          name: item.name,
          fullPrice: item.price,
          splitCount: splitCount,
          yourShare: itemShare,
          taxContribution: itemTax,
          tipContribution: itemTip,
          totalForItem: itemShare + itemTax + itemTip
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
      tipRate: tipRate * 100
    };
  }, [result]);

  // Toggle person expansion with LayoutAnimation for smooth native performance
  const togglePersonExpand = useCallback((personId: string) => {
    // Use easeInEaseOut for snappy, responsive animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Simple toggle - LayoutAnimation handles the smooth transition
    if (expandedPersonId === personId) {
      setExpandedPersonId(null);
    } else {
      setExpandedPersonId(personId);
    }
  }, [expandedPersonId]);

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={backgroundGradient}
        style={styles.background}
      />

      {/* Elegant Receipt Modal */}
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
                  onPress={() => setReceiptModalVisible(false)}
                >
                  <View style={styles.closeButtonCircle}>
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#000'} />
                  </View>
                </TouchableOpacity>
              </View>

              {result && (
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
                        {result.restaurantName}
                      </ThemedText>
                      <ThemedText style={styles.receiptDate}>
                        {new Date().toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Totals Section - Moved to top for better visibility */}
                  <View style={styles.totalsSection}>
                    <LinearGradient
                      colors={isDark ?
                        ['rgba(52, 152, 219, 0.1)', 'rgba(52, 152, 219, 0.05)'] :
                        ['rgba(52, 152, 219, 0.08)', 'rgba(52, 152, 219, 0.03)']}
                      start={{x: 0, y: 0}}
                      end={{x: 0, y: 1}}
                      style={styles.totalsSectionGradient}
                    >
                      {(() => {
                        // Calculate values ensuring tip is included
                        const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
                        const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
                        const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
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

                  {/* Split Summary Section */}
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <Ionicons
                        name="calculator-outline"
                        size={20}
                        color={isDark ? '#3498db' : '#2980b9'}
                      />
                      <ThemedText style={styles.sectionTitle}>Split Summary</ThemedText>
                    </View>

                    <View style={styles.splitSummaryContainer}>
                      {/* Me amount */}
                      {(() => {
                        const mePerson = people.find(p => p.id === 'me');
                        const meAmount = result.splitAmounts.find(s => s.personId === 'me')?.amount;

                        if (mePerson && meAmount) {
                          return (
                            <View style={styles.meAmountCard}>
                              <View style={styles.meHeader}>
                                <ThemedText style={styles.meHeaderText}>You Pay</ThemedText>
                              </View>
                              <ThemedText style={styles.meAmountText}>${meAmount}</ThemedText>
                            </View>
                          );
                        }
                        return null;
                      })()}

                      {/* Others' amounts */}
                      {result.splitAmounts
                        .filter(split => split.personId !== 'me')
                        .map((split, index) => {
                          const person = people.find(p => p.id === split.personId);
                          if (!person) return null;

                          return (
                            <View key={person.id} style={styles.otherPersonRow}>
                              <View style={[styles.personAvatarSmall, { backgroundColor: getPersonColor(index + 1) }]}>
                                <Text style={styles.personInitialSmall}>{person.name.charAt(0).toUpperCase()}</Text>
                              </View>
                              <ThemedText style={styles.otherPersonName}>{person.name}</ThemedText>
                              <ThemedText style={styles.otherPersonAmount}>${split.amount}</ThemedText>
                            </View>
                          );
                        })
                      }
                    </View>
                  </View>

                  {/* All Items Section - Show all items now */}
                  {result.menuItems && result.menuItems.length > 0 && (
                    <View style={styles.itemsSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons
                          name="list-outline"
                          size={20}
                          color={isDark ? '#3498db' : '#2980b9'}
                        />
                        <ThemedText style={styles.sectionTitle}>All Items</ThemedText>
                      </View>

                      <View style={styles.itemsList}>
                        {result.menuItems.map((item, index) => {
                          // Get names of people assigned to this item
                          const assignedPeople = item.assignedTo
                            .map(id => people.find(p => p.id === id)?.name || '')
                            .filter(Boolean);

                          return (
                            <View key={item.id} style={styles.itemRow}>
                              <View style={styles.itemNameContainer}>
                                <ThemedText style={styles.itemNameInList}>
                                  {item.name}
                                </ThemedText>
                                {assignedPeople.length > 0 && (
                                  <ThemedText style={styles.itemPeople}>
                                    {assignedPeople.join(', ')}
                                  </ThemedText>
                                )}
                              </View>
                              <ThemedText style={styles.itemPrice}>
                                ${item.price.toFixed(2)}
                              </ThemedText>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Split Between Section */}
                  <View style={styles.splitInfoSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={isDark ? '#3498db' : '#2980b9'}
                      />
                      <ThemedText style={styles.sectionTitle}>People</ThemedText>
                    </View>

                    <View style={styles.peopleGrid}>
                      {people.map((person, index) => (
                        <View key={person.id} style={styles.personBadge}>
                          <View style={[styles.personAvatar, { backgroundColor: getPersonColor(index) }]}>
                            <Text style={styles.personInitial}>
                              {person.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <ThemedText style={styles.personBadgeName} numberOfLines={1}>
                            {person.name}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setReceiptModalVisible(false)}
                >
                  <LinearGradient
                    colors={buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.doneButtonGradient}
                  >
                    <Text style={styles.doneButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Tip Edit Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={tipModalVisible}
        onRequestClose={handleCloseTipModal}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View style={[
                styles.tipModalContent,
                {
                opacity: tipModalAnimation,
                transform: [
                  {
                    scale: tipModalAnimation.interpolate({
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
                  Edit Tip
                </ThemedText>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseTipModal}
                >
                  <View style={styles.closeButtonCircle}>
                    <Ionicons name="close" size={20} color={isDark ? '#fff' : '#000'} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.tipModalBody}>
                {result && (() => {
                  // Calculate subtotal for reference
                  const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
                  const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
                  const subtotal = total - tax;

                  return (
                    <View style={styles.tipModalContentInner}>
                      <ThemedText style={styles.subtotalText}>
                        Subtotal: ${subtotal.toFixed(2)}
                      </ThemedText>
                      
                      <View style={styles.tipOptionsContainer}>
                        <TouchableOpacity
                          style={[
                            styles.tipOptionTab,
                            activeTipOption === 'percent' && styles.activeTipOption
                          ]}
                          onPress={() => setActiveTipOption('percent')}
                        >
                          <ThemedText style={[
                            styles.tipOptionText,
                            activeTipOption === 'percent' && styles.activeTipOptionText
                          ]}>
                            Percentage
                          </ThemedText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.tipOptionTab,
                            activeTipOption === 'amount' && styles.activeTipOption
                          ]}
                          onPress={() => setActiveTipOption('amount')}
                        >
                          <ThemedText style={[
                            styles.tipOptionText,
                            activeTipOption === 'amount' && styles.activeTipOptionText
                          ]}>
                            Amount
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      
                      {activeTipOption === 'percent' ? (
                        <View style={styles.inputGroup}>
                          <ThemedText style={styles.inputLabel}>Tip Percentage</ThemedText>
                          <View style={[
                            styles.modalInputWrapper,
                            activeTipOption === 'percent' && styles.modalInputWrapperActive
                          ]}>
                            <TextInput
                              style={[styles.modalTextInput, { color: textColor }]}
                              placeholder="15.00"
                              placeholderTextColor={isDark ? '#777' : '#999'}
                              value={tipPercent}
                              onChangeText={handleTipPercentChange}
                              keyboardType="decimal-pad"
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                              blurOnSubmit={true}
                            />
                            <ThemedText style={[styles.modalInputSymbol, { marginLeft: 8, color: textColor }]}>%</ThemedText>
                          </View>
                          <ThemedText style={styles.tipAmountPreview}>
                            Tip amount: ${parseFloat(tipAmount) > 0 ? parseFloat(tipAmount).toFixed(2) : (tipAmount === '' || tipAmount === '0' || tipAmount === '0.' || tipAmount === '0.0' || tipAmount === '0.00' ? '0.00' : tipAmount)}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.inputGroup}>
                          <ThemedText style={styles.inputLabel}>Tip Amount</ThemedText>
                          <View style={[
                            styles.modalInputWrapper,
                            activeTipOption === 'amount' && styles.modalInputWrapperActive
                          ]}>
                            <ThemedText style={[styles.modalInputSymbol, { marginRight: 8, color: textColor }]}>$</ThemedText>
                            <TextInput
                              style={[styles.modalTextInput, { color: textColor }]}
                              placeholder="0.00"
                              placeholderTextColor={isDark ? '#777' : '#999'}
                              value={tipAmount}
                              onChangeText={handleTipAmountChange}
                              keyboardType="decimal-pad"
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                              blurOnSubmit={true}
                            />
                          </View>
                          <ThemedText style={styles.tipPercentPreview}>
                            {parseFloat(tipPercent) > 0 ? `${parseFloat(tipPercent).toFixed(2)}% of subtotal` : 'No tip'}
                          </ThemedText>
                        </View>
                      )}
                      
                      {/* Quick tip options */}
                      <View style={styles.quickTipContainer}>
                        <ThemedText style={styles.quickTipLabel}>Quick Options:</ThemedText>
                        <View style={styles.quickTipOptions}>
                          {[15, 18, 20, 25].map(percent => (
                            <TouchableOpacity
                              key={`tip-${percent}`}
                              style={[
                                styles.quickTipButton,
                                { backgroundColor: isDark ? 'rgba(70, 70, 70, 0.5)' : 'rgba(225, 225, 225, 0.5)' }, // Default background
                                activeTipOption === 'percent' && tipPercent === percent.toString() && styles.quickTipButtonSelected
                              ]}
                              onPress={() => {
                                setTipPercent(percent.toString());
                                handleTipPercentChange(percent.toString()); // This will also update tipAmount
                                setActiveTipOption('percent');
                              }}
                            >
                              <ThemedText style={[
                                styles.quickTipText,
                                { color: textColor }, // Ensure default theme color
                                activeTipOption === 'percent' && tipPercent === percent.toString() && styles.quickTipTextSelected
                              ]}>{percent}%</ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.tipModalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseTipModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]} // saveButton provides bg color
                  onPress={handleUpdateTip}
                >
                  {/* LinearGradient removed */}
                  <Text style={styles.saveButtonText}>Update Tip</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <View style={styles.container}>
        <Animated.View style={{ opacity: fadeIn }}>
          <SafeAreaHeader
            title="Final Split"
            onBack={() => router.replace('/split/tip')}
          />
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Bill Details Card */}
          <Animated.View style={{
            opacity: fadeIn,
            transform: [{ translateY: slideUp }]
          }}>
            <View style={styles.cardContainer}>
              <LinearGradient
                colors={cardGradient}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.totalCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="receipt-outline" size={24} color="#3498db" />
                    <ThemedText style={styles.totalTitle}>Bill Details</ThemedText>
                  </View>

                  {/* Calculate values ensuring tip is included */}
                  {(() => {
                    const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
                    const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
                    const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
                    const subtotal = total - tax;
                    const grandTotal = subtotal + tax + tip;

                    // Log the values for debugging
                    console.log('Results screen bill details:');
                    console.log(`Subtotal: $${subtotal.toFixed(2)}`);
                    console.log(`Tax: $${tax.toFixed(2)}`);
                    console.log(`Tip: $${tip.toFixed(2)}`);
                    console.log(`Total with tip: $${grandTotal.toFixed(2)}`);

                    return (
                      <>
                        <View style={styles.totalRow}>
                          <ThemedText>Subtotal:</ThemedText>
                          <ThemedText style={styles.amountText}>${subtotal.toFixed(2)}</ThemedText>
                        </View>
                        <View style={styles.totalRow}>
                          <ThemedText>Tax:</ThemedText>
                          <ThemedText style={styles.amountText}>${tax.toFixed(2)}</ThemedText>
                        </View>
                        <View style={styles.totalRow}>
                          <ThemedText>Tip:</ThemedText>
                          <View style={styles.tipContainer}>
                            <ThemedText style={styles.amountText}>${tip.toFixed(2)}</ThemedText>
                            <TouchableOpacity
                              style={styles.editTipButton}
                              onPress={handleOpenTipModal}
                            >
                              <Ionicons name="pencil-outline" size={14} color="#3498db" />
                              <ThemedText style={styles.editTipText}>Edit</ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={[styles.totalRow, styles.totalFinal]}>
                          <ThemedText style={styles.totalText}>Total:</ThemedText>
                          <ThemedText style={styles.totalAmount}>
                            ${grandTotal.toFixed(2)}
                          </ThemedText>
                        </View>
                      </>
                    );
                  })()}

                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* You Pay Card */}
          {meAmount && mePersonId && (
            <Animated.View style={{
              transform: [
                { scale: scaleYouPay },
                { translateY: slideUp }
              ],
              opacity: fadeIn,
              marginVertical: 16
            }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => togglePersonExpand('me')}
                style={styles.youPayContainer}
              >
                <LinearGradient
                  colors={buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.youPayGradient}
                >
                  <View style={[
                    styles.youPayCard,
                    expandedPersonId === 'me' && styles.youPayCardExpanded
                  ]}>
                    <View style={styles.youPayHeader}>
                      <Text style={styles.youPayTitle}>You Pay</Text>
                      <View style={{
                        transform: [{ rotate: expandedPersonId === 'me' ? '180deg' : '0deg' }]
                      }}>
                        <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.7)" />
                      </View>
                    </View>
                    <Text style={styles.youPayAmount}>${meAmount}</Text>
                    <View style={styles.youPayDivider} />
                    <Text style={styles.youPayDesc}>
                      {expandedPersonId === 'me' ? 'Tap to collapse' : 'Tap for breakdown'}
                    </Text>
                    
                    {/* Expandable Breakdown for Me - LayoutAnimation handles the transition */}
                    {expandedPersonId === 'me' && (() => {
                      const breakdown = getPersonBreakdown('me');
                      if (!breakdown) return null;
                      
                      return (
                        <View style={styles.meBreakdownContainer}>
                          {/* Items List */}
                          <View style={styles.meBreakdownSection}>
                            <Text style={styles.meBreakdownSectionTitle}>Your Items</Text>
                            {breakdown.items.map((item) => (
                              <View key={item.id} style={styles.meBreakdownItem}>
                                <View style={styles.breakdownItemHeader}>
                                  <Text style={styles.meBreakdownItemName} numberOfLines={1}>
                                    {item.name}
                                  </Text>
                                  <Text style={styles.meBreakdownItemTotal}>
                                    ${item.yourShare.toFixed(2)}
                                  </Text>
                                </View>
                                {item.splitCount > 1 && (
                                  <Text style={styles.meBreakdownItemNote}>
                                    ${item.fullPrice.toFixed(2)} ÷ {item.splitCount} people
                                  </Text>
                                )}
                              </View>
                            ))}
                            
                            {breakdown.items.length === 0 && (
                              <Text style={styles.meBreakdownEmptyNote}>
                                No items assigned to you
                              </Text>
                            )}
                          </View>

                          {/* Totals */}
                          <View style={styles.meBreakdownDivider} />
                          <View style={styles.meBreakdownRow}>
                            <Text style={styles.meBreakdownLabel}>Subtotal</Text>
                            <Text style={styles.meBreakdownValue}>${breakdown.subtotalShare.toFixed(2)}</Text>
                          </View>
                          <View style={styles.meBreakdownRow}>
                            <Text style={styles.meBreakdownLabel}>Tax ({breakdown.taxRate.toFixed(1)}%)</Text>
                            <Text style={styles.meBreakdownValue}>${breakdown.taxShare.toFixed(2)}</Text>
                          </View>
                          <View style={styles.meBreakdownRow}>
                            <Text style={styles.meBreakdownLabel}>Tip ({breakdown.tipRate.toFixed(1)}%)</Text>
                            <Text style={styles.meBreakdownValue}>${breakdown.tipShare.toFixed(2)}</Text>
                          </View>
                          <View style={styles.meBreakdownDivider} />
                          <View style={styles.meBreakdownTotalRow}>
                            <Text style={styles.meBreakdownTotalLabel}>Total</Text>
                            <Text style={styles.meBreakdownTotalValue}>${breakdown.grandTotal.toFixed(2)}</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* People Owe You Card */}
          <Animated.View style={{
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
            marginBottom: 16
          }}>
            <View style={styles.cardContainer}>
              <LinearGradient
                colors={cardGradient}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.splitCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="people-outline" size={24} color="#3498db" />
                    <ThemedText style={styles.splitTitle}>People Owe You</ThemedText>
                  </View>

                  {peopleWhoOwe.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="checkmark-circle" size={36} color="#2ecc71" style={styles.emptyIcon} />
                      <ThemedText style={styles.noPayments}>
                        Everyone paid their share
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.peopleList}>
                      {peopleWhoOwe.map((person, index) => {
                        const isExpanded = expandedPersonId === person.id;
                        const breakdown = isExpanded ? getPersonBreakdown(person.id) : null;

                        return (
                          <Animated.View key={person.id} style={{
                            opacity: staggeredItems[index] || fadeIn,
                            transform: [{
                              translateX: (staggeredItems[index] || fadeIn).interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0]
                              })
                            }]
                          }}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => togglePersonExpand(person.id)}
                              style={[
                                styles.personRowContainer,
                                isExpanded && styles.personRowContainerExpanded
                              ]}
                            >
                              <View style={styles.personRow}>
                                <View style={[styles.personAvatar, { backgroundColor: getPersonColor(index + 1) }]}>
                                  <Text style={styles.personInitial}>
                                    {person.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.personDetails}>
                                  <ThemedText style={styles.personName}>{person.name}</ThemedText>
                                  <ThemedText style={styles.personNote}>
                                    {isExpanded ? 'tap to collapse' : 'tap for breakdown'}
                                  </ThemedText>
                                </View>
                                <View style={styles.personAmountContainer}>
                                  <Text style={styles.personAmount}>${person.amount}</Text>
                                  <View style={{
                                    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                                  }}>
                                    <Ionicons name="chevron-down" size={18} color={isDark ? '#888' : '#666'} />
                                  </View>
                                </View>
                              </View>

                              {/* Expandable Breakdown Section - LayoutAnimation handles the transition */}
                              {isExpanded && breakdown && (
                                <View style={styles.breakdownContainer}>
                                  {/* Items List */}
                                  <View style={styles.breakdownSection}>
                                    <ThemedText style={styles.breakdownSectionTitle}>Items</ThemedText>
                                    {breakdown.items.map((item) => (
                                      <View key={item.id} style={styles.breakdownItem}>
                                        <View style={styles.breakdownItemHeader}>
                                          <ThemedText style={styles.breakdownItemName} numberOfLines={1}>
                                            {item.name}
                                          </ThemedText>
                                          <ThemedText style={styles.breakdownItemTotal}>
                                            ${item.yourShare.toFixed(2)}
                                          </ThemedText>
                                        </View>
                                        {item.splitCount > 1 && (
                                          <ThemedText style={styles.breakdownItemNote}>
                                            ${item.fullPrice.toFixed(2)} ÷ {item.splitCount} people
                                          </ThemedText>
                                        )}
                                      </View>
                                    ))}
                                    
                                    {breakdown.items.length === 0 && (
                                      <ThemedText style={styles.breakdownEmptyNote}>
                                        No items assigned
                                      </ThemedText>
                                    )}
                                  </View>

                                  {/* Subtotal */}
                                  <View style={styles.breakdownDivider} />
                                  <View style={styles.breakdownRow}>
                                    <ThemedText style={styles.breakdownLabel}>Subtotal</ThemedText>
                                    <ThemedText style={styles.breakdownValue}>
                                      ${breakdown.subtotalShare.toFixed(2)}
                                    </ThemedText>
                                  </View>

                                  {/* Tax */}
                                  <View style={styles.breakdownRow}>
                                    <ThemedText style={styles.breakdownLabel}>
                                      Tax ({breakdown.taxRate.toFixed(1)}%)
                                    </ThemedText>
                                    <ThemedText style={styles.breakdownValue}>
                                      ${breakdown.taxShare.toFixed(2)}
                                    </ThemedText>
                                  </View>

                                  {/* Tip */}
                                  <View style={styles.breakdownRow}>
                                    <ThemedText style={styles.breakdownLabel}>
                                      Tip ({breakdown.tipRate.toFixed(1)}%)
                                    </ThemedText>
                                    <ThemedText style={styles.breakdownValue}>
                                      ${breakdown.tipShare.toFixed(2)}
                                    </ThemedText>
                                  </View>

                                  {/* Grand Total */}
                                  <View style={styles.breakdownDivider} />
                                  <View style={styles.breakdownTotalRow}>
                                    <ThemedText style={styles.breakdownTotalLabel}>Total</ThemedText>
                                    <ThemedText style={styles.breakdownTotalValue}>
                                      ${breakdown.grandTotal.toFixed(2)}
                                    </ThemedText>
                                  </View>
                                </View>
                              )}
                            </TouchableOpacity>
                          </Animated.View>
                        );
                      })}

                      {/* Verification total row */}
                      {(() => {
                        // Calculate the sum of all shares
                        let sumOfAllShares = 0;
                        if (meAmount) {
                          sumOfAllShares = parseFloat(meAmount);
                        }

                        peopleWhoOwe.forEach(person => {
                          sumOfAllShares += parseFloat(person.amount);
                        });

                        // Get the expected total (including tip)
                        const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
                        const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
                        const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
                        const subtotal = total - tax;
                        const expectedTotal = subtotal + tax + tip;

                        // Calculate difference
                        const difference = Math.abs(expectedTotal - sumOfAllShares);
                        const isBalanced = difference < 0.02; // Allow for small rounding errors

                        // Log values for debugging
                        console.log('Verification check:');
                        console.log(`Sum of all shares: $${sumOfAllShares.toFixed(2)}`);
                        console.log(`Expected total (subtotal + tax + tip): $${expectedTotal.toFixed(2)}`);
                        console.log(`Difference: $${difference.toFixed(2)}`);
                        console.log(`Is balanced: ${isBalanced}`);

                        return (
                          <View style={styles.verificationRow}>
                            <ThemedText style={styles.verificationText}>
                              Total contributions: ${sumOfAllShares.toFixed(2)}
                            </ThemedText>
                            <ThemedText style={[
                              styles.verificationStatus,
                              {color: isBalanced ? '#2ecc71' : '#e74c3c'}
                            ]}>
                              {isBalanced ? '✓ Balanced' : `Unbalanced by $${difference.toFixed(2)}`}
                            </ThemedText>
                          </View>
                        );
                      })()}
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Items Breakdown Card */}
          {result.menuItems && result.menuItems.length > 0 && (
            <Animated.View style={{
              opacity: fadeIn,
              transform: [{
                translateY: fadeIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [70, 0]
                })
              }],
              marginBottom: 16
            }}>
              <View style={styles.cardContainer}>
                <LinearGradient
                  colors={cardGradient}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <View style={styles.itemsCard}>
                    <View style={styles.itemsHeader}>
                      <View style={styles.headerTop}>
                        <View style={styles.cardHeader}>
                          <Ionicons name="list-outline" size={24} color="#3498db" />
                          <ThemedText style={styles.itemsTitle}>Items Breakdown</ThemedText>
                        </View>
                        <TouchableOpacity
                          onPress={handleEditItems}
                          style={styles.editButton}
                        >
                          <Ionicons name="create-outline" size={20} color="#3498db" />
                          <ThemedText style={styles.editLink}>Edit</ThemedText>
                        </TouchableOpacity>
                      </View>

                      {/* Calculate tax and tip rates for explanation */}
                      {(() => {
                        const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
                        const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
                        const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
                        const subtotal = total - tax;

                        const taxRate = (tax / subtotal) * 100;
                        const tipRate = (tip / subtotal) * 100;

                        return (
                          <View style={styles.ratesSummary}>
                            <ThemedText style={styles.rateText}>
                              Tax: {taxRate.toFixed(1)}% • Tip: {tipRate.toFixed(1)}% of subtotal
                            </ThemedText>
                            <ThemedText style={styles.rateSummary}>
                              Each person pays their share of items, tax and tip proportional to what they ordered
                            </ThemedText>
                          </View>
                        );
                      })()}
                    </View>

                    {(() => {
                      // Calculate tax and tip rates
                      const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
                      const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
                      const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
                      const subtotal = total - tax;

                      // Calculate the proportion of tax and tip to subtotal
                      const taxProportion = tax / subtotal;
                      const tipProportion = tip / subtotal;

                      return result.menuItems.map((item, index) => {
                        const assignedPeople = item.assignedTo.map(id =>
                          people.find(p => p.id === id)?.name || ''
                        ).join(', ');

                        // Calculate item's proportional tax and tip
                        const itemTax = item.price * taxProportion;
                        const itemTip = item.price * tipProportion;
                        const itemTotal = item.price + itemTax + itemTip;

                        // Calculate per-person cost if assigned
                        let perPersonCost = 0;
                        let perPersonSubtotal = 0;
                        let perPersonTax = 0;
                        let perPersonTip = 0;

                        if (item.assignedTo.length > 0) {
                          perPersonSubtotal = item.price / item.assignedTo.length;
                          perPersonTax = itemTax / item.assignedTo.length;
                          perPersonTip = itemTip / item.assignedTo.length;
                          perPersonCost = itemTotal / item.assignedTo.length;
                        }

                        return (
                          <Animated.View key={item.id} style={{
                            opacity: fadeIn,
                            transform: [{
                              translateX: fadeIn.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-30, 0],
                                extrapolate: 'clamp'
                              })
                            }]
                          }}>
                            <View style={styles.itemRow}>
                              <View style={styles.itemDetails}>
                                <ThemedText style={styles.itemNameInList}>{item.name}</ThemedText>
                                <View>
                                  <ThemedText style={styles.itemAssigned}>
                                    {item.assignedTo.length > 0
                                      ? `Assigned to: ${assignedPeople}`
                                      : 'Unassigned (split equally)'}
                                  </ThemedText>
                                  <ThemedText style={styles.itemWithTaxTip}>
                                    After tax & tip: ${itemTotal.toFixed(2)}
                                    {item.assignedTo.length > 0 && (
                                      item.assignedTo.length > 1
                                        ? ` ($${perPersonCost.toFixed(2)} each)`
                                        : ``
                                    )}
                                  </ThemedText>
                                  <ThemedText style={styles.itemBreakdown}>
                                    {item.assignedTo.length > 0
                                      ? `Per person: $${perPersonSubtotal.toFixed(2)} + $${perPersonTax.toFixed(2)} tax + $${perPersonTip.toFixed(2)} tip = $${perPersonCost.toFixed(2)}`
                                      : 'Split equally among everyone'
                                    }
                                  </ThemedText>
                                </View>
                              </View>
                              <View style={styles.itemPriceContainer}>
                                <ThemedText style={styles.itemPrice}>${item.price.toFixed(2)}</ThemedText>
                              </View>
                            </View>
                          </Animated.View>
                        );
                      });
                    })()}
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          {/* Receipt Button */}
          {receiptImage && (
            <Animated.View style={{
              opacity: fadeIn,
              transform: [{
                translateY: fadeIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [90, 0]
                })
              }],
              marginBottom: 16
            }}>
              <TouchableOpacity
                style={styles.receiptButton}
                onPress={() => setReceiptModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={20} color="#ffffff" />
                <Text style={styles.receiptButtonText}>View Receipt Details</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <Animated.View style={{
            opacity: fadeIn,
            transform: [{
              translateY: fadeIn.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0]
              })
            }],
            marginBottom: 30
          }}>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShareResults}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  <Ionicons name="share-outline" size={22} color="#ffffff" />
                  <Text style={styles.actionText}>Share Results</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleNewSplit}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
                  <Text style={styles.actionText}>Complete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tipContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  editTipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editTipText: {
    fontSize: 12,
    color: "#3498db",
    marginLeft: 4,
    fontFamily: "InterMedium",
  },
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
    paddingBottom: 0, // Remove bottom padding as there's nothing there
  },
  // Modal styles
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
    flex: 1, // Allow title to take available space
    textAlign: 'center', // Center the title text
    fontSize: 24,
    fontWeight: 'bold',
    // Add a small left margin if the close button is on the right to balance it out
    // This assumes the close button is on the right. If it's on the left, this isn't needed.
    // Or, ensure the close button has a defined width and add a spacer on the other side.
    // For now, let's just center the text. If it's still off, we'll refine.
  },
  closeButton: {
    padding: 5,
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
    paddingBottom: 40,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalBody: {
    padding: 24,
  },
  sectionBox: {
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  percentageText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'InterRegular',
  },
  splitSummaryContainer: {
    marginTop: 12,
  },
  meAmountCard: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  meHeader: {
    marginBottom: 8,
  },
  meHeaderText: {
    fontSize: 16,
    fontFamily: 'InterMedium',
  },
  meAmountText: {
    fontSize: 28,
    fontFamily: 'InterBold',
    color: '#3498db',
  },
  otherPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  personAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personInitialSmall: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'InterSemiBold',
  },
  otherPersonName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'InterMedium',
  },
  otherPersonAmount: {
    fontSize: 18,
    fontFamily: 'InterBold',
    color: '#3498db',
  },
  itemNameContainer: {
    flex: 1,
    paddingRight: 12,
  },
  itemPeople: {
    fontSize: 12,
    fontFamily: 'InterRegular',
    marginTop: 4,
    opacity: 0.7,
    color: '#3498db',
  },
  // Restaurant section
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  restaurantIcon: {
    marginRight: 16,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  // Items section
  itemsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsList: {
    backgroundColor: 'rgba(150, 150, 150, 0.06)',
    borderRadius: 12,
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    paddingRight: 12,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '500',
  },
  moreItems: {
    textAlign: 'center',
    fontSize: 13,
    opacity: 0.6,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Totals section
  totalsSection: {
    marginBottom: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  totalsSectionGradient: {
    padding: 16,
    borderRadius: 14,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  receiptDetailLabel: {
    fontSize: 16,
  },
  receiptDetailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalDetailRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    marginTop: 8,
    paddingTop: 12,
  },
  totalDetailLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalDetailValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3498db',
  },
  // Split info section
  splitInfoSection: {
    marginBottom: 24,
  },
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  personBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '45%',
  },
  personAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  personInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  personBadgeName: {
    fontSize: 14,
    flex: 1,
  },
  doneButton: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 24,
  },
  doneButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
  },
  backButton: {
    marginRight: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  totalCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountText: {
    fontWeight: '500',
  },
  totalFinal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 12,
    marginTop: 8,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#3498db',
  },
  youPayContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  youPayGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  youPayCard: {
    padding: 20,
    alignItems: 'center',
  },
  youPayCardExpanded: {
    alignItems: 'stretch',
  },
  youPayTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 8,
  },
  youPayAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 8,
  },
  youPayDivider: {
    height: 1,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginVertical: 10,
  },
  youPayDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  splitCard: {
    padding: 20,
  },
  splitTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  noPayments: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
  },
  peopleList: {
    marginTop: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  verificationText: {
    fontSize: 14,
    fontFamily: 'InterMedium',
  },
  verificationStatus: {
    fontSize: 14,
    fontFamily: 'InterSemiBold',
  },
  itemsCard: {
    padding: 20,
  },
  itemsHeader: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratesSummary: {
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  rateText: {
    fontSize: 14,
    fontFamily: 'InterMedium',
    marginBottom: 4,
  },
  rateSummary: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'InterRegular',
  },
  itemsTitle: {
    fontSize: 20,
    fontFamily: 'InterBold',
    marginLeft: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  editLink: {
    color: '#3498db',
    fontFamily: 'InterSemiBold',
    marginLeft: 4,
  },
  // itemRow: { // DUPLICATE - REMOVED
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   paddingVertical: 14,
  //   borderBottomWidth: 1,
  //   borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  // },
  itemDetails: { // This style was between the duplicates, keeping it.
    flex: 1,
    paddingRight: 12,
  },
  // itemName: { // DUPLICATE - REMOVED
  //   fontSize: 16,
  //   marginBottom: 4,
  //   fontFamily: 'InterMedium',
  // },
  itemAssigned: { // This style was between the duplicates, keeping it.
    fontSize: 14,
    opacity: 0.6,
    fontFamily: 'InterRegular',
  },
  itemWithTaxTip: { // This style was between the duplicates, keeping it.
    fontSize: 14,
    marginTop: 2,
    color: '#3498db', // Blue color for emphasis
    fontFamily: 'InterMedium',
  },
  itemBreakdown: { // This style was between the duplicates, keeping it.
    fontSize: 12,
    marginTop: 2,
    color: '#888',
    fontStyle: 'italic',
    fontFamily: 'InterRegular',
  },
  itemPriceContainer: { // This style was between the duplicates, keeping it.
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // itemPrice: { // DUPLICATE - REMOVED
  //   fontSize: 16,
  //   fontFamily: 'InterSemiBold',
  // },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#3498db',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  receiptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'InterSemiBold',
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    marginHorizontal: 6,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    margin: 20,
    padding: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#FF5722',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 8,
  },
  personDetails: {
    flex: 1,
    marginRight: 8,
  },
  personName: {
    fontSize: 18,
    fontFamily: 'InterSemiBold',
    marginBottom: 4,
  },
  personNote: {
    fontSize: 14,
    opacity: 0.6,
    fontFamily: 'InterRegular',
  },
  personAmount: {
    fontSize: 20,
    fontFamily: 'InterBold',
    color: '#3498db',
  },
  tipModalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tipModalBody: {
    padding: 24,
  },
  tipModalContentInner: {
    padding: 24,
  },
  subtotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tipOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tipOptionTab: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 12,
  },
  activeTipOption: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  tipOptionText: {
    fontSize: 14,
    fontFamily: 'InterMedium',
  },
  activeTipOptionText: {
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
    minHeight: 120, // Add minHeight to prevent layout shift
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'InterMedium',
    marginBottom: 4,
  },
  // New styles for consistent input fields in modal
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.08)', // Slightly adjusted for modal context
    borderRadius: 14,
    paddingHorizontal: 16,
    // paddingVertical: 12, // Vertical padding will be controlled by height
    height: 56, // Slightly smaller than tip.tsx's 60 for modal
    flex: 1,
    borderWidth: 1, // Default border
    borderColor: 'transparent', // Default border transparent
  },
  modalInputWrapperActive: {
    // borderColor: '#3498db', // Temporarily remove border to test "blue line" issue
    backgroundColor: 'rgba(52, 152, 219, 0.15)', // Keep active background, made it a bit more visible
  },
  modalInputSymbol: {
    fontSize: 18,
    fontFamily: 'InterSemiBold',
    opacity: 0.7,
    // marginRight or marginLeft will be applied inline for $ vs %
  },
  modalTextInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'InterRegular',
    height: '100%', // Take full height of wrapper
    // paddingVertical: 0, // Remove TextInput's own vertical padding if wrapper controls height
  },
  // End of new styles
  percentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentInput: {
    flex: 1,
    padding: 12,
  },
  percentSign: {
    fontSize: 14,
    marginLeft: 8,
  },
  tipAmountPreview: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    textDecorationLine: 'none', // Explicitly remove text decoration
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    padding: 12,
  },
  dollarSign: {
    fontSize: 14,
    marginRight: 8,
  },
  tipPercentPreview: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    textDecorationLine: 'none', // Explicitly remove text decoration
  },
  quickTipContainer: {
    marginTop: 16,
  },
  quickTipLabel: {
    fontSize: 14,
    fontFamily: 'InterMedium',
    marginBottom: 8,
  },
  quickTipOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickTipButton: {
    flex: 1, // Allow buttons to share space
    alignItems: 'center', // Center text
    paddingVertical: 12,
    paddingHorizontal: 8, // Adjust horizontal padding
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)', // Default border
    borderRadius: 12,
    marginHorizontal: 4, // Add some spacing between buttons
    // backgroundColor will be applied dynamically in JSX
  },
  quickTipButtonSelected: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderColor: '#3498db',
  },
  quickTipText: {
    fontSize: 16, // Increased font size
    fontFamily: 'InterSemiBold', // Make it bolder
    // color will be handled by ThemedText or selected style
  },
  quickTipTextSelected: {
    color: '#3498db',
  },
  tipModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Changed from space-between for better balance
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12, // Reduced padding
  },
  cancelButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    // No specific padding here, will inherit from modalButton
  },
  cancelButtonText: {
    color: '#ffffff', // This color might be an issue in light mode if the button bg is light
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center', // Center the text within the button
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  saveButtonGradient: { // This style is no longer used by the save button directly
    alignItems: 'center',
    justifyContent: 'center',
    // paddingVertical: 16, // Removed as padding is now on modalButton
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNameInList: {
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'InterMedium',
  },
  // Person Row Expandable Breakdown Styles
  personRowContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  personRowContainerExpanded: {
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
    paddingBottom: 4,
  },
  personAmountContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  breakdownContainer: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.06)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  breakdownSection: {
    marginBottom: 12,
  },
  breakdownSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    marginBottom: 8,
  },
  breakdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    marginBottom: 6,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItemName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  breakdownItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  breakdownItemNote: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
    fontStyle: 'italic',
  },
  breakdownEmptyNote: {
    fontSize: 14,
    opacity: 0.5,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginVertical: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3498db',
  },
  // You Pay Header and Breakdown Styles
  youPayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  meBreakdownContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    alignSelf: 'stretch',
  },
  meBreakdownSection: {
    marginBottom: 12,
  },
  meBreakdownSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  meBreakdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 6,
  },
  meBreakdownItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  meBreakdownItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  meBreakdownItemNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  meBreakdownEmptyNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  meBreakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 12,
  },
  meBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  meBreakdownLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  meBreakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  meBreakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginTop: 4,
  },
  meBreakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  meBreakdownTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
});