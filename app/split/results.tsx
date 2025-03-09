import { useEffect, useState, useRef } from 'react';
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
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { useSplitContext } from '@/contexts/SplitContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

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
  const { people, receiptImage, result, reset, recalculateSplitAmounts } = useSplitContext();
  const [error, setError] = useState<string | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();
  
  // Background gradient colors
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a']
    : ['#ffffff', '#f8f9fa'];
    
  // Button gradient
  const buttonGradient = isDark 
    ? ['#3498db', '#2c7db1'] 
    : ['#3498db', '#2980b9'];
    
  // Card gradients
  const cardGradient = isDark
    ? ['rgba(40, 40, 40, 0.7)', 'rgba(30, 30, 30, 0.7)']
    : ['rgba(255, 255, 255, 0.9)', 'rgba(248, 250, 252, 0.9)'];
    
  // You pay card gradient
  const youPayGradient = ['#3498db', '#2980b9'];
  
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
      
      // First check navigation requirements
      const shouldNavigateAway = handleNavigation();
      if (shouldNavigateAway) return;
      
      // Then check if all items are assigned
      if (result?.menuItems && result.menuItems.length > 0) {
        const unassignedItems = result.menuItems.filter(item => 
          item.price > 0 && item.assignedTo.length === 0
        );
        
        if (unassignedItems.length > 0 && isMounted.current) {
          // Some items are not assigned, go back to items screen
          console.log('Found unassigned items, going back to items screen');
          Alert.alert(
            "Unassigned Items", 
            "Some items haven't been assigned to anyone. Please assign all items before continuing.",
            [{ text: "OK", style: "default" }]
          );
          setTimeout(() => {
            if (isMounted.current) {
              router.replace('/split/items');
            }
          }, 300);
          return;
        }
      }
      
      // Check if there are split amounts
      if (!result.splitAmounts || result.splitAmounts.length === 0) {
        console.error('Split amounts not calculated, recalculating');
        recalculateSplitAmounts();
        
        // Wait a bit and try again
        setTimeout(() => {
          if (!isMounted.current) return;
          if (!result.splitAmounts || result.splitAmounts.length === 0) {
            // Still no split amounts, go back to items
            console.error('Failed to calculate split amounts, going back to tip screen');
            router.replace('/split/tip');
            return;
          }
          // Split amounts recalculated successfully, start animations
          startAnimations();
        }, 300);
        return;
      }
      
      // Start animations only if all checks pass
      startAnimations();
    }, 300);
    
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, [receiptImage, result, recalculateSplitAmounts, router, fadeIn, slideUp, staggeredItems, scaleYouPay]);

  const handleShareResults = async () => {
    try {
      if (!result) return;
      
      // Format the message with total including tip 
      const total = parseFloat(result.total.replace(/[^0-9.]/g, '')) || 0;
      const tax = parseFloat(result.tax.replace(/[^0-9.]/g, '')) || 0;
      const tip = parseFloat(result.tip.replace(/[^0-9.]/g, '')) || 0;
      const subtotal = total - tax;
      const grandTotal = subtotal + tax + tip;
      
      // Log the values for debugging
      console.log('Sharing results:');
      console.log(`Subtotal: $${subtotal.toFixed(2)}`);
      console.log(`Tax: $${tax.toFixed(2)}`);
      console.log(`Tip: $${tip.toFixed(2)}`);
      console.log(`Total with tip: $${grandTotal.toFixed(2)}`);
      
      const totalMessage = `Total bill: $${grandTotal.toFixed(2)}\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nTip: $${tip.toFixed(2)}`;
      
      // The split amounts from the context already include tip and tax
      // We don't need to modify them further
      const individualAmounts = result.splitAmounts
        .map(split => {
          const person = people.find(p => p.id === split.personId);
          return person ? `${person.name}: $${split.amount}` : '';
        })
        .filter(Boolean)
        .join('\n');
      
      // Calculate sum of all shares to verify
      let sumOfAllShares = 0;
      result.splitAmounts.forEach(split => {
        sumOfAllShares += parseFloat(split.amount);
      });
      
      console.log(`Sum of all shares: $${sumOfAllShares.toFixed(2)}`);
      console.log(`Match expected total? ${Math.abs(grandTotal - sumOfAllShares) < 0.02 ? 'Yes' : 'No'}`);
      
      const message = `Split Results\n\n${totalMessage}\n\n${individualAmounts}\n\nPowered by Split App`;
      
      await Share.share({
        message,
        title: 'Split',
      });
    } catch (error) {
      console.error('Error sharing results:', error);
      Alert.alert('Error', 'Failed to share results');
    }
  };

  const handleEditItems = () => {
    router.replace('/split/items');
  };

  const handleNewSplit = () => {
    // Prompt the user before resetting
    Alert.alert(
      "Start New Split?",
      "This will delete your current split data. Are you sure you want to continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Yes, Start New", 
          onPress: () => {
            // Reset and go to people selection page
            reset();
            router.replace('/split/people');
          }
        }
      ]
    );
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
                style={styles.buttonGradient}
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

  return (
    <View style={styles.outerContainer}>
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
                <ThemedText style={styles.modalTitle}>Receipt Summary</ThemedText>
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
                <View style={styles.modalBody}>
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
                        {result.menuItems?.[0]?.name.split(' ')[0] || 'Restaurant'} Receipt
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
                  
                  {/* Items Section */}
                  {result.menuItems && result.menuItems.length > 0 && (
                    <View style={styles.itemsSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons 
                          name="list-outline" 
                          size={20} 
                          color={isDark ? '#3498db' : '#2980b9'} 
                        />
                        <ThemedText style={styles.sectionTitle}>Items</ThemedText>
                      </View>
                      
                      <View style={styles.itemsList}>
                        {result.menuItems.slice(0, 6).map((item, index) => (
                          <View key={item.id} style={styles.itemRow}>
                            <ThemedText style={styles.itemName} numberOfLines={1}>
                              {item.name}
                            </ThemedText>
                            <ThemedText style={styles.itemPrice}>
                              ${item.price.toFixed(2)}
                            </ThemedText>
                          </View>
                        ))}
                        
                        {result.menuItems.length > 6 && (
                          <ThemedText style={styles.moreItems}>
                            +{result.menuItems.length - 6} more items
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Totals Section */}
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
                        
                        return (
                          <>
                            <View style={styles.receiptDetailRow}>
                              <ThemedText style={styles.receiptDetailLabel}>Subtotal</ThemedText>
                              <ThemedText style={styles.receiptDetailValue}>${subtotal.toFixed(2)}</ThemedText>
                            </View>
                            <View style={styles.receiptDetailRow}>
                              <ThemedText style={styles.receiptDetailLabel}>Tax</ThemedText>
                              <ThemedText style={styles.receiptDetailValue}>${tax.toFixed(2)}</ThemedText>
                            </View>
                            <View style={styles.receiptDetailRow}>
                              <ThemedText style={styles.receiptDetailLabel}>Tip</ThemedText>
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
                  
                  {/* Split Info Section */}
                  <View style={styles.splitInfoSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons 
                        name="people-outline" 
                        size={20} 
                        color={isDark ? '#3498db' : '#2980b9'} 
                      />
                      <ThemedText style={styles.sectionTitle}>Split Between</ThemedText>
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
                </View>
              )}
              
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
            </LinearGradient>
          </View>
        </View>
      </Modal>
      
      <View style={styles.container}>
        <Animated.View style={{ opacity: fadeIn }}>
          <SafeAreaHeader
            title="Final Split"
            onBack={() => router.back()}
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
                          <ThemedText style={styles.amountText}>${tip.toFixed(2)}</ThemedText>
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
          {meAmount && (
            <Animated.View style={{
              transform: [
                { scale: scaleYouPay },
                { translateY: slideUp }
              ],
              opacity: fadeIn,
              marginVertical: 16
            }}>
              <View style={styles.youPayContainer}>
                <LinearGradient
                  colors={youPayGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.youPayGradient}
                >
                  <View style={styles.youPayCard}>
                    <Text style={styles.youPayTitle}>You Pay</Text>
                    <Text style={styles.youPayAmount}>${meAmount}</Text>
                    <View style={styles.youPayDivider} />
                    <Text style={styles.youPayDesc}>Your portion of the bill</Text>
                  </View>
                </LinearGradient>
              </View>
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
                      {peopleWhoOwe.map((person, index) => (
                        <Animated.View key={person.id} style={{
                          opacity: staggeredItems[index] || fadeIn,
                          transform: [{ 
                            translateX: (staggeredItems[index] || fadeIn).interpolate({
                              inputRange: [0, 1],
                              outputRange: [50, 0]
                            })
                          }]
                        }}>
                          <View style={styles.personRow}>
                            <View style={styles.personAvatar}>
                              <Text style={styles.personInitial}>
                                {person.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.personDetails}>
                              <ThemedText style={styles.personName}>{person.name}</ThemedText>
                              <ThemedText style={styles.personNote}>owes you</ThemedText>
                            </View>
                            <Text style={styles.personAmount}>${person.amount}</Text>
                          </View>
                        </Animated.View>
                      ))}
                      
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
                                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
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
                  <Ionicons name="add-circle-outline" size={22} color="#ffffff" />
                  <Text style={styles.actionText}>New Split</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
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
    paddingBottom: 36, // Add extra padding at the bottom to prevent buttons from getting cut off
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
    fontSize: 24,
    fontWeight: 'bold',
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
  modalBody: {
    padding: 24,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  personInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  personBadgeName: {
    fontSize: 14,
    flex: 1,
  },
  // Button
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
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
  personDetails: {
    flex: 1,
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  itemDetails: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'InterMedium',
  },
  itemAssigned: {
    fontSize: 14,
    opacity: 0.6,
    fontFamily: 'InterRegular',
  },
  itemWithTaxTip: {
    fontSize: 14,
    marginTop: 2,
    color: '#3498db', // Blue color for emphasis
    fontFamily: 'InterMedium',
  },
  itemBreakdown: {
    fontSize: 12,
    marginTop: 2,
    color: '#888',
    fontStyle: 'italic',
    fontFamily: 'InterRegular',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'InterSemiBold',
  },
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
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
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
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});