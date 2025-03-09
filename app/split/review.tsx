import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  View,
  Animated,
  Easing,
  Text,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { useSplitContext } from '@/contexts/SplitContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function ReviewScreen() {
  // 1. HOOKS FIRST: Hook calls first to avoid conditional hook execution
  const router = useRouter();
  const { receiptImage, setReceiptImage, people, setSplitResult, recalculateSplitAmounts } = useSplitContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();
  
  // 2. UI APPEARANCE: Background and button styles
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a']
    : ['#ffffff', '#f8f9fa'];
    
  const buttonGradient = isDark 
    ? ['#3498db', '#2c7db1'] 
    : ['#3498db', '#2980b9'];

  // 3. STATE VARIABLES: All state must be defined before any conditional logic  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [showProcessingPopup, setShowProcessingPopup] = useState(false);
  const [showNoItemsPopup, setShowNoItemsPopup] = useState(false);
  
  // Animation values for the no items popup
  const popupFadeAnim = useRef(new Animated.Value(0)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.8)).current;
  
  // 4. UI ANIMATIONS: Base UI animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const imageScale = useRef(new Animated.Value(0.9)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  
  // 5. PROCESSING ANIMATIONS: Processing overlay animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const stepOneOpacity = useRef(new Animated.Value(0)).current;
  const stepTwoOpacity = useRef(new Animated.Value(0)).current;
  const stepThreeOpacity = useRef(new Animated.Value(0)).current;
  
  // 6. POPUP ANIMATIONS: Animation refs for processing popup
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;
  const circleScaleAnimation = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.9)).current;
  
  // 7. TEXT ANIMATIONS: Text and element animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-10)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;
  const stepsTranslateY = useRef(new Animated.Value(10)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  
  // 8. DERIVED VALUES: Computed values from animations
  const spin = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  console.log('Review screen mounted, receipt image:', receiptImage ? 'exists' : 'missing');
  
  // Track component mounting
  const isMounted = useRef(false);
  
  // Use useEffect to initialize the component properly
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Start with mounted=true, will check for image in the render function
    console.log('Review screen useEffect, receipt image:', receiptImage ? 'exists' : 'missing');
    
    return () => {
      // Cleanup when unmounting
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (receiptImage) {
      // Sequence of animations
      Animated.sequence([
        // First fade in the header and image
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(slideUp, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(imageScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.elastic(1.1),
          }),
        ]),
        // Then animate in the buttons
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),
      ]).start();
    }
  }, [fadeAnim, slideUp, imageScale, buttonOpacity, buttonTranslateY, receiptImage]);

  // If there's no receipt image, navigate to camera
  useEffect(() => {
    if (!receiptImage && isMounted.current) {
      console.log('No receipt image detected, navigating to camera screen');
      // Don't set a timeout as that can cause the buggy "flash" of this screen
      router.replace('/split/camera');
    }
  }, [receiptImage, router]);
  
  // Define all function declarations BEFORE any conditional returns
  const handleRetake = () => {
    console.log('Retaking photo...');
    // Don't clear the image before navigation to prevent auto-redirect
    
    // Use animation before navigating
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (isMounted.current) {
        // Navigate directly to camera for retaking the photo
        router.replace('/split/camera');
        // Clear the image AFTER navigation starts
        setTimeout(() => setReceiptImage(undefined), 100);
      }
    });
  };
  
  // All animations, state variables, and interpolations are already defined at the top level of the component
  
  const handleContinue = async () => {
    try {
      console.log('🔍 CONTINUE BUTTON PRESSED - Showing processing animation');
      
      // Set loading state
      setIsLoading(true);
      setError(null);
      setProcessingStep(1);
      
      // Show the processing popup
      setShowProcessingPopup(true);
      
      // Reset animation values
      popupOpacity.setValue(0);
      popupScale.setValue(0.9);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(-10);
      stepsOpacity.setValue(0);
      stepsTranslateY.setValue(10);
      messageOpacity.setValue(0);
      
      // Animate the popup in
      Animated.parallel([
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(popupScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back()),
        }),
      ]).start();
      
      // Sequence the internal animations
      Animated.stagger(120, [
        // Title animation
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
        ]),
        
        // Steps animation
        Animated.parallel([
          Animated.timing(stepsOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(stepsTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),
        
        // Message animation
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start the content animations
      Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 0.95,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Pulse animation for the circles
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.8,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.4,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Circle scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(circleScaleAnimation, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(circleScaleAnimation, {
            toValue: 0.8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Start the API call directly
      const { analyzeReceipt } = await import('@/services/geminiService');
      
      // Make API call
      console.log('📞 Making direct API call from Review screen');
      
      // Show step 2 after a delay
      setTimeout(() => {
        setProcessingStep(2);
      }, 1500);
      
      const result = await analyzeReceipt(receiptImage);
      console.log('✅ API call successful', result);
      
      // Show step 3
      setProcessingStep(3);
      
      // Check that the result is valid
      if (!result || !result.menuItems || !Array.isArray(result.menuItems) || result.menuItems.length === 0 ||
          (result.menuItems.length === 1 && result.menuItems[0].name.toLowerCase().includes('failed to identify'))) {
        console.log('No menu items found in the receipt image');
        setProcessingStep(0);
        setShowProcessingPopup(false);
        setIsLoading(false);
        
        // Show the no items found popup with animation
        setShowNoItemsPopup(true);
        // Reset animation values
        popupFadeAnim.setValue(0);
        popupScaleAnim.setValue(0.8);
        
        // Start animations
        Animated.parallel([
          Animated.timing(popupFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(popupScaleAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          })
        ]).start();
        return;
      }
      
      // Prepare the data for context
      const initialSplitAmounts = people.map(person => ({
        personId: person.id,
        amount: "0.00"
      }));
      
      // Update context with result
      setSplitResult({
        ...result,
        splitAmounts: initialSplitAmounts
      });
      
      // Recalculate split amounts
      recalculateSplitAmounts();
      
      // Wait a moment to show the completed steps then animate out
      setTimeout(() => {
        // Animate out
        Animated.parallel([
          Animated.timing(popupOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(popupScale, {
            toValue: 0.95,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // After animation completes
          setShowProcessingPopup(false);
          setIsLoading(false);
          
          // Navigate to items screen
          console.log('✅ Navigating directly to items screen');
          router.push('/split/items');
        });
      }, 1000);
      
    } catch (err) {
      console.error('❌ API call failed:', err);
      
      // Set error state
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Animate out on error
      Animated.parallel([
        Animated.timing(popupOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(popupScale, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide the processing popup
        setShowProcessingPopup(false);
        setIsLoading(false);
      });
    }
  };

  // Return early but don't navigate directly in render
  if (!receiptImage) {
    // Show a minimal loading state instead of null
    // This prevents the "flash" of content
    return (
      <View style={[styles.outerContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={backgroundGradient} style={styles.background} />
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
        
        {/* Stylish Processing Overlay */}
        {showProcessingPopup && (
          <Animated.View 
            style={[
              styles.processingOverlay,
              { opacity: popupOpacity }
            ]}
          >
            <LinearGradient
              colors={isDark ? ['rgba(0,0,0,0.9)', 'rgba(30,30,30,0.95)'] : ['rgba(255,255,255,0.95)', 'rgba(250,250,250,0.98)']}
              style={styles.processingBackground}
            >
              <Animated.View 
                style={[
                  styles.processingContent,
                  { transform: [{ scale: popupScale }] }
                ]}
              >
                <Animated.View style={{
                  opacity: titleOpacity,
                  transform: [{ translateY: titleTranslateY }]
                }}>
                  <ThemedText style={styles.processingTitle}>Analyzing Receipt</ThemedText>
                </Animated.View>
                
                <View style={styles.animationContainer}>
                  {/* Central icon with ring */}
                  <Animated.View
                    style={[
                      styles.mainIconCircle,
                      {
                        transform: [
                          { scale: circleScaleAnimation }
                        ],
                      },
                    ]}
                  >
                    <Animated.View style={[styles.pulseCircle, { opacity: pulseOpacity }]} />
                    <Ionicons name="receipt-outline" size={40} color="#3498db" />
                  </Animated.View>
                  
                  {/* Satellite icons */}
                  <Animated.View 
                    style={[
                      styles.satelliteIcon, 
                      styles.satelliteTopRight,
                      { transform: [{ rotate: spin }] }
                    ]}
                  >
                    <Ionicons name="search" size={20} color="#8e44ad" />
                  </Animated.View>
                  
                  <Animated.View 
                    style={[
                      styles.satelliteIcon, 
                      styles.satelliteBottomRight,
                      { transform: [{ rotate: spin }] }
                    ]}
                  >
                    <Ionicons name="calculator" size={20} color="#e74c3c" />
                  </Animated.View>
                  
                  <Animated.View 
                    style={[
                      styles.satelliteIcon, 
                      styles.satelliteBottomLeft,
                      { transform: [{ rotate: spin }] }
                    ]}
                  >
                    <Ionicons name="people" size={20} color="#2ecc71" />
                  </Animated.View>
                  
                  <Animated.View 
                    style={[
                      styles.satelliteIcon, 
                      styles.satelliteTopLeft,
                      { transform: [{ rotate: spin }] }
                    ]}
                  >
                    <Ionicons name="cash" size={20} color="#f39c12" />
                  </Animated.View>
                </View>
                
                <Animated.View style={[
                  styles.stepsContainer,
                  {
                    opacity: stepsOpacity,
                    transform: [{ translateY: stepsTranslateY }]
                  }
                ]}>
                  <View style={styles.stepRow}>
                    <View style={styles.checkCircleComplete}>
                      {processingStep > 1 ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Animated.View style={{transform: [{rotate: spin}]}}>
                          <Ionicons name="sync" size={14} color="#fff" />
                        </Animated.View>
                      )}
                    </View>
                    <ThemedText style={styles.stepComplete}>Reading text from image</ThemedText>
                  </View>
                  
                  <View style={styles.stepRow}>
                    <View style={[
                      processingStep >= 2 ? styles.checkCircleActive : styles.checkCirclePending
                    ]}>
                      {processingStep > 2 ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : processingStep === 2 ? (
                        <Animated.View style={{transform: [{rotate: spin}]}}>
                          <Ionicons name="sync" size={14} color="#fff" />
                        </Animated.View>
                      ) : null}
                    </View>
                    <ThemedText style={processingStep >= 2 ? styles.stepActive : styles.stepPending}>
                      Identifying menu items
                    </ThemedText>
                  </View>
                  
                  <View style={styles.stepRow}>
                    <View style={[
                      processingStep >= 3 ? styles.checkCircleActive : styles.checkCirclePending
                    ]}>
                      {processingStep > 3 ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : processingStep === 3 ? (
                        <Animated.View style={{transform: [{rotate: spin}]}}>
                          <Ionicons name="sync" size={14} color="#fff" />
                        </Animated.View>
                      ) : null}
                    </View>
                    <ThemedText style={processingStep >= 3 ? styles.stepActive : styles.stepPending}>
                      Calculating totals
                    </ThemedText>
                  </View>
                  
                  <View style={styles.stepRow}>
                    <View style={styles.checkCirclePending} />
                    <ThemedText style={styles.stepPending}>Preparing split details</ThemedText>
                  </View>
                </Animated.View>
                
                <Animated.View style={{ opacity: messageOpacity }}>
                  <ThemedText style={styles.processingMessage}>
                    Our AI is analyzing your receipt to prepare your split
                  </ThemedText>
                </Animated.View>
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        )}
        
        <Animated.View style={{ opacity: fadeAnim }}>
          <SafeAreaHeader 
            title="Review Photo"
            onBack={handleRetake}
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.imageContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideUp },
                { scale: imageScale }
              ]
            }
          ]}
        >
          <Image source={{ uri: receiptImage }} style={styles.image} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.questionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUp }]
            }
          ]}
        >
          <ThemedText style={styles.question}>Is this image clear and legible?</ThemedText>
          <ThemedText style={styles.instructions}>
            Make sure all items, prices, tax, and total are clearly visible
          </ThemedText>
        </Animated.View>

        <Animated.View 
          style={[
            styles.actions,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }]
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleRetake}
            activeOpacity={0.9}
          >
            <Ionicons name="camera-outline" size={20} color="#3498db" />
            <ThemedText style={styles.secondaryButtonText}>Retake</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleContinue}
            activeOpacity={0.9}
            disabled={isLoading}
          >
            <LinearGradient
              colors={buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </Animated.View>
      </View>
      
      {/* No Items Found Popup - MOVED OUTSIDE THE VIEW HIERARCHY */}
      {showNoItemsPopup && (
        <View style={styles.popupOverlay}>
          <Animated.View 
            style={[
              styles.popupContainer,
              {
                opacity: popupFadeAnim,
                transform: [{ scale: popupScaleAnim }],
                backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground
              }
            ]}
          >
            <ThemedView style={[
              styles.popupIconContainer,
              {
                backgroundColor: isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: isDark ? Colors.dark.error : Colors.light.error
              }
            ]}>
              <Ionicons 
                name="alert-circle-outline" 
                size={50}
                color={isDark ? Colors.dark.error : Colors.light.error} 
              />
            </ThemedView>
            <ThemedText style={styles.popupTitle}>No Items Found</ThemedText>
            <ThemedText style={styles.popupMessage}>
              No items were found in the picture. Would you like to try again?
            </ThemedText>
            <TouchableOpacity 
              style={[
                styles.tryAgainButton,
                { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }
              ]}
              onPress={() => {
                // Animate out before removing
                Animated.parallel([
                  Animated.timing(popupFadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.timing(popupScaleAnim, {
                    toValue: 0.8,
                    duration: 300,
                    useNativeDriver: true,
                  })
                ]).start(() => {
                  setShowNoItemsPopup(false);
                  handleRetake();
                });
              }}
            >
              <ThemedText style={styles.tryAgainButtonText}>
                Try Again
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
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
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    width: '85%',
    maxWidth: 360,
    padding: 28,
    borderRadius: 20,
    backgroundColor: 'white', // Will be themed with dark/light colors in the component
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  popupIconContainer: {
    width: 94,
    height: 94,
    borderRadius: 47,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 2,
  },
  popupTitle: {
    fontSize: 26,
    fontFamily: 'OutfitBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: 16,
    fontFamily: 'OutfitRegular',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  tryAgainButton: {
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tryAgainButtonText: {
    color: 'white',
    fontFamily: 'OutfitSemiBold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 36, // Add extra padding at the bottom to prevent buttons from getting cut off
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  processingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  processingTitle: {
    fontSize: 28,
    fontFamily: 'InterBold',
    marginBottom: 15,
    paddingVertical: 10,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  animationContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  pulseCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: 'rgba(52, 152, 219, 0.4)',
  },
  satelliteIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  satelliteTopRight: {
    top: 20,
    right: 20,
    borderColor: '#8e44ad',
    borderWidth: 1.5,
  },
  satelliteTopLeft: {
    top: 20,
    left: 20,
    borderColor: '#f39c12',
    borderWidth: 1.5,
  },
  satelliteBottomRight: {
    bottom: 20,
    right: 20,
    borderColor: '#e74c3c',
    borderWidth: 1.5,
  },
  satelliteBottomLeft: {
    bottom: 20,
    left: 20,
    borderColor: '#2ecc71',
    borderWidth: 1.5,
  },
  stepsContainer: {
    width: '90%',
    maxWidth: 300,
    marginBottom: 30,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkCircleComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkCirclePending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    marginRight: 14,
  },
  stepComplete: {
    fontSize: 16,
    color: '#2ecc71',
    fontFamily: 'InterMedium',
  },
  stepActive: {
    fontSize: 16,
    color: '#3498db',
    fontFamily: 'InterSemiBold',
  },
  stepPending: {
    fontSize: 16,
    opacity: 0.5,
    fontFamily: 'InterRegular',
  },
  processingMessage: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
    letterSpacing: 0.3,
    maxWidth: '80%',
    fontFamily: 'InterRegular',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#FF3B30',
    flex: 1,
    marginRight: 8,
    fontFamily: 'InterRegular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'InterSemiBold',
  },
  backButton: {
    marginRight: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  imageContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
  questionContainer: {
    marginBottom: 32,
  },
  question: {
    fontSize: 18,
    fontFamily: 'InterSemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: 'InterRegular',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  button: {
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
  secondaryButton: {
    backgroundColor: 'rgba(46, 134, 222, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'InterSemiBold',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#3498db',
    fontFamily: 'InterSemiBold',
    marginLeft: 10,
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});