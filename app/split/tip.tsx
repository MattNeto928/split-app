import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Animated,
  Keyboard,
  ScrollView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  BackHandler
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { useSplitContext } from '@/contexts/SplitContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function TipScreen() {
  const router = useRouter();
  const { result, setSplitResult } = useSplitContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();
  
  // Track component mounting
  const isMounted = useRef(false);
  
  // If the result already has a tip value, skip to results screen
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Use a timeout to ensure the component is fully mounted
    const timer = setTimeout(() => {
      if (isMounted.current && result?.tip && parseFloat(result.tip) > 0) {
        router.replace('/split/results');
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, [result, router]);

  // Background gradient colors
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a']
    : ['#ffffff', '#f8f9fa'];
    
  // Button gradient
  const buttonGradient = isDark 
    ? ['#3498db', '#2c7db1'] 
    : ['#3498db', '#2980b9'];
  
  // Calculate subtotal (total - tax)
  const total = result ? parseFloat(result.total.replace(/[^0-9.]/g, '')) : 0;
  const tax = result ? parseFloat(result.tax.replace(/[^0-9.]/g, '')) : 0;
  const subtotal = total - tax;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  
  // Tip options
  const [tipPercent, setTipPercent] = useState(18);
  const [customTip, setCustomTip] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Add keyboard listeners
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    
    // Handle hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Hardware back pressed on tip screen, navigating to items');
      handleBack();
      return true; // Prevent default behavior
    });
    
    // Clean up listeners
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
      backHandler.remove();
    };
  }, []);
  
  const calculateTipAmount = () => {
    if (isCustom) {
      return customTip ? parseFloat(customTip) : 0;
    } else {
      return (subtotal * tipPercent / 100);
    }
  };
  
  const handleSelectTip = (percent) => {
    setTipPercent(percent);
    setIsCustom(false);
    Keyboard.dismiss();
  };
  
  const handleCustomTip = () => {
    setIsCustom(true);
  };
  
  const handleContinue = () => {
    // Dismiss keyboard if visible
    Keyboard.dismiss();
    
    if (!result) return;
    
    const tipAmount = calculateTipAmount();
    
    // Validate tip
    if (tipAmount < 0) {
      Alert.alert('Invalid Tip', 'Tip amount cannot be negative.');
      return;
    }
    
    // Format the tip amount as a string with 2 decimal places
    const formattedTip = tipAmount.toFixed(2);
    
    console.log(`Tip screen - setting tip amount to $${formattedTip}`);
    
    // Update the result with the tip amount
    setSplitResult({
      ...result,
      tip: formattedTip
    });
    
    // Navigate with a delay to ensure state updates and recalculation complete
    setTimeout(() => {
      console.log('Navigating to results after tip processing');
      
      if (isMounted.current) {
        // Use replace instead of push to prevent going back to tip screen
        router.replace('/split/results');
      }
    }, 400);
  };
  
  const handleBack = () => {
    // Explicitly navigate to items screen to prevent navigation issues
    router.replace('/split/items');
  };
  
  const tipAmount = calculateTipAmount();
  const grandTotal = subtotal + tax + tipAmount;
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={backgroundGradient}
          style={styles.background}
        />
        
        {/* Fixed button that will never move */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue to Results</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.contentContainer, { paddingTop: insets.top > 0 ? insets.top : 40 }]}>
            <Animated.View style={[ 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideUp }]
              }
            ]}>
              <SafeAreaHeader
                title="Add Tip"
                onBack={handleBack}
              />
            </Animated.View>
            
            <Animated.View style={{ 
              opacity: fadeAnim, 
              transform: [{ translateY: slideUp }],
              paddingBottom: 80
            }}>
              <View style={styles.billSummary}>
                <View style={styles.cardContainer}>
                  <LinearGradient
                    colors={isDark ? 
                      ['rgba(40, 40, 40, 0.8)', 'rgba(25, 25, 25, 0.8)'] : 
                      ['rgba(255, 255, 255, 0.9)', 'rgba(245, 245, 245, 0.9)']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.billCard}>
                      <View style={styles.billRow}>
                        <ThemedText>Subtotal:</ThemedText>
                        <ThemedText style={styles.amount}>${subtotal.toFixed(2)}</ThemedText>
                      </View>
                      <View style={styles.billRow}>
                        <ThemedText>Tax:</ThemedText>
                        <ThemedText style={styles.amount}>${tax.toFixed(2)}</ThemedText>
                      </View>
                      <View style={[styles.billRow, styles.tipRow]}>
                        <ThemedText>Tip:</ThemedText>
                        <ThemedText style={[styles.amount, { color: '#3498db' }]}>
                          ${tipAmount.toFixed(2)}
                        </ThemedText>
                      </View>
                      <View style={[styles.billRow, styles.totalRow]}>
                        <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                        <ThemedText style={styles.totalAmount}>${grandTotal.toFixed(2)}</ThemedText>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </View>
              
              <View style={styles.tipOptionsContainer}>
                <ThemedText style={styles.sectionTitle}>Tip percentage</ThemedText>
                
                <View style={styles.tipOptions}>
                  <TouchableOpacity
                    style={[
                      styles.tipOption,
                      !isCustom && tipPercent === 18 && styles.selectedTip
                    ]}
                    onPress={() => handleSelectTip(18)}
                  >
                    <ThemedText style={[
                      styles.tipText,
                      !isCustom && tipPercent === 18 && styles.selectedTipText
                    ]}>18%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      !isCustom && tipPercent === 18 && styles.selectedTipText
                    ]}>${(subtotal * 0.18).toFixed(2)}</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.tipOption,
                      !isCustom && tipPercent === 20 && styles.selectedTip
                    ]}
                    onPress={() => handleSelectTip(20)}
                  >
                    <ThemedText style={[
                      styles.tipText,
                      !isCustom && tipPercent === 20 && styles.selectedTipText
                    ]}>20%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      !isCustom && tipPercent === 20 && styles.selectedTipText
                    ]}>${(subtotal * 0.20).toFixed(2)}</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.tipOption,
                      !isCustom && tipPercent === 22 && styles.selectedTip
                    ]}
                    onPress={() => handleSelectTip(22)}
                  >
                    <ThemedText style={[
                      styles.tipText,
                      !isCustom && tipPercent === 22 && styles.selectedTipText
                    ]}>22%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      !isCustom && tipPercent === 22 && styles.selectedTipText
                    ]}>${(subtotal * 0.22).toFixed(2)}</ThemedText>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.customTipContainer}>
                  <ThemedText style={styles.sectionTitle}>Custom tip amount</ThemedText>
                  <View style={styles.customInputRow}>
                    <View style={[
                      styles.customTipInput,
                      isCustom && styles.activeCustomTip
                    ]}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={[styles.tipInput, { color: textColor }]}
                        placeholder="Enter tip amount"
                        placeholderTextColor={isDark ? "#777" : "#999"}
                        keyboardType="decimal-pad"
                        value={customTip}
                        onChangeText={(text) => {
                          // Only allow numbers and a single decimal point
                          if (text === '' || /^\d*\.?\d*$/.test(text)) {
                            setCustomTip(text);
                            setIsCustom(true);
                          }
                        }}
                        onFocus={handleCustomTip}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        blurOnSubmit={true}
                      />
                    </View>
                    {keyboardVisible && (
                      <ThemedText style={styles.keyboardDismissHint}>
                        Tap anywhere to dismiss keyboard
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
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
  billSummary: {
    marginBottom: 24,
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
  billCard: {
    padding: 20,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amount: {
    fontWeight: '500',
  },
  tipRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#3498db',
  },
  tipOptionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  tipOption: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedTip: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  tipText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  tipAmount: {
    opacity: 0.7,
  },
  selectedTipText: {
    color: '#3498db',
  },
  customTipContainer: {
    marginBottom: 80,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customTipInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    height: 60,
    marginBottom: 10,
  },
  activeCustomTip: {
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  dollarSign: {
    fontSize: 18,
    fontFamily: 'InterSemiBold',
    marginRight: 8,
    opacity: 0.7,
  },
  tipInput: {
    flex: 1,
    fontSize: 18,
    height: '100%',
    paddingVertical: 8,
    fontFamily: 'InterRegular',
  },
  keyboardDismissHint: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
    fontFamily: 'InterRegular',
  },
  buttonWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 24,
    left: 20,
    right: 20,
    width: 'auto',
    zIndex: 10,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'InterSemiBold',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  }
});