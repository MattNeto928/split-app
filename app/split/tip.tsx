import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Keyboard, Platform, Alert, BackHandler, TouchableWithoutFeedback, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSplitContext } from '../../contexts/SplitContext';
import { SafeAreaHeader } from '../../components/SafeAreaHeader';
import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function TipScreen() {
  const router = useRouter();
  const {
    result,
    updateTipAndRecalculate
  } = useSplitContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();
  
  // Track component mounting
  const isMounted = useRef(false);
  
  // Set mounted flag on mount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Background gradient colors
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a'] as const
    : ['#ffffff', '#f8f9fa'] as const;
    
  // Button gradient
  const buttonGradient = isDark 
    ? ['#3498db', '#2c7db1'] as const
    : ['#3498db', '#2980b9'] as const;
  
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
  
  const handleSelectTip = (percent: number) => {
    setTipPercent(percent);
    setIsCustom(false);
    Keyboard.dismiss();

    // --- Trigger immediate update and recalculation --- 
    if (result) {
      const newTipAmount = (subtotal * percent / 100);
      console.log(`Tip Screen: Selected ${percent}%, calling updateTipAndRecalculate with amount: ${newTipAmount}`);
      updateTipAndRecalculate(newTipAmount);
    }
    // --- End immediate update ---
  };
  
  const handleCustomTip = () => {
    setIsCustom(true);
    // Update context immediately when switching to custom
    if (result) {
      const currentCustomAmount = parseFloat(customTip) || 0;
      console.log(`Tip Screen: Switched to custom, calling updateTipAndRecalculate with amount: ${currentCustomAmount}`);
      updateTipAndRecalculate(currentCustomAmount);
    }
  };

  const handleCustomTipChange = (value: string) => {
    // Only allow numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    let validatedValue = numericValue;
    if (parts.length > 2) {
      validatedValue = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    
    setCustomTip(validatedValue);

    // --- Trigger immediate update and recalculation --- 
    if (result) {
      const newTipAmount = parseFloat(validatedValue) || 0;
      console.log(`Tip Screen: Custom tip changed to ${validatedValue}, calling updateTipAndRecalculate with amount: ${newTipAmount}`);
      updateTipAndRecalculate(newTipAmount);
    }
    // --- End immediate update ---
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

    console.log(`Tip screen - setting tip amount to $${tipAmount.toFixed(2)}`);

    // Single update: set tip and recalculate in one operation
    updateTipAndRecalculate(tipAmount);

    // Navigate after a frame to let state settle
    requestAnimationFrame(() => {
      if (isMounted.current) {
        router.replace('/split/results');
      }
    });
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
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>Continue to Results</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
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
                      ['rgba(40, 40, 40, 0.8)', 'rgba(25, 25, 25, 0.8)'] as const : 
                      ['rgba(255, 255, 255, 0.9)', 'rgba(245, 245, 245, 0.9)'] as const}
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
                      !isCustom && tipPercent === 0 && styles.selectedTip
                    ]}
                    onPress={() => handleSelectTip(0)}
                  >
                    <ThemedText style={[
                      styles.tipText,
                      { color: (!isCustom && tipPercent === 0) ? '#3498db' : textColor },
                    ]}>0%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      { color: (!isCustom && tipPercent === 0) ? '#3498db' : textColor },
                    ]}>No Tip</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tipOption,
                      !isCustom && tipPercent === 18 && styles.selectedTip
                    ]}
                    onPress={() => handleSelectTip(18)}
                  >
                    <ThemedText style={[
                      styles.tipText,
                      { color: (!isCustom && tipPercent === 18) ? '#3498db' : textColor },
                    ]}>18%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      { color: (!isCustom && tipPercent === 18) ? '#3498db' : textColor },
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
                      { color: (!isCustom && tipPercent === 20) ? '#3498db' : textColor },
                    ]}>20%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      { color: (!isCustom && tipPercent === 20) ? '#3498db' : textColor },
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
                      { color: (!isCustom && tipPercent === 22) ? '#3498db' : textColor },
                    ]}>22%</ThemedText>
                    <ThemedText style={[
                      styles.tipAmount,
                      { color: (!isCustom && tipPercent === 22) ? '#3498db' : textColor },
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
                        onChangeText={handleCustomTipChange}
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
    // Explicitly set color using the theme's text color
    // Note: 'textColor' must be in scope here.
    // This change assumes 'textColor' is available in the StyleSheet.create scope.
    // If not, this needs to be handled differently, e.g., by passing color as a prop
    // or by dynamically creating the style in the component.
    // For now, I'll assume it can be accessed or this will be adjusted.
    // A better approach would be to ensure ThemedText handles this by default
    // or to adjust ThemedText itself.
    // However, to directly address the style:
    // This will cause an error if textColor is not defined in this scope.
    // A more robust solution is needed if textColor is not accessible here.
    // Let's assume for now we will make textColor available or adjust.
    // For the purpose of this diff, I will add a placeholder and then refine.
    // color: textColor, // This line will be problematic if textColor is not in scope
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
  buttonIcon: {
    marginLeft: 8,
  }
});