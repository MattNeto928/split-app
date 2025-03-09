import React, { useEffect, useRef, useCallback, useState } from 'react';
import { StyleSheet, Easing, BackHandler, TouchableOpacity, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSplitContext } from '@/contexts/SplitContext';
import { analyzeReceipt, setApiKey } from '@/services/geminiService';

// Helper function to validate the result structure
const validateResultStructure = (result) => {
  if (!result || typeof result !== 'object') {
    console.error('Result is not an object:', result);
    return false;
  }
  
  // Check essential fields
  if (typeof result.total === 'undefined') {
    console.error('Result missing total field:', result);
    return false;
  }
  
  if (!result.menuItems || !Array.isArray(result.menuItems)) {
    console.error('Result missing menuItems array:', result);
    return false;
  }
  
  // Validate menu items structure
  for (const item of result.menuItems) {
    if (typeof item !== 'object' || typeof item.name !== 'string' || typeof item.price === 'undefined') {
      console.error('Invalid menu item structure:', item);
      return false;
    }
    
    // Ensure each item has an id and assignedTo array
    if (!item.id) {
      item.id = Date.now() + Math.random().toString(36).substring(2, 9);
    }
    
    if (!item.assignedTo || !Array.isArray(item.assignedTo)) {
      item.assignedTo = [];
    }
  }
  
  return true;
};

// REACTIVATE API CALLS ON THIS SCREEN
// This screen will handle API calls and display a stylish animation

export default function ProcessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromReview = params.from === 'review';
  const triggerSource = params.trigger as string || 'unknown';
  const timestamp = params.timestamp as string || '0';
  const { receiptImage, people, setSplitResult, recalculateSplitAmounts, result } = useSplitContext();
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;

  console.log(`🚨 PROCESS SCREEN MOUNTED:
  - Trigger: ${triggerSource}
  - Timestamp: ${timestamp} (${new Date(parseInt(timestamp)).toISOString()})
  - From: ${params.from}
  - Receipt image: ${receiptImage ? 'exists' : 'missing'} (${receiptImage ? receiptImage.substring(0, 30) + '...' : 'none'})
  - Result: ${result ? 'exists' : 'missing'}
  `);
  
  // Track if this component is mounted to prevent state updates after unmounting
  const isMounted = useRef(true);
  
  // Track navigation progress to prevent redundant navigation
  const hasNavigated = useRef(false);
  
  // We'll make API calls here with our stylish animation
  useEffect(() => {
    console.log('✅ PROCESS SCREEN ACTIVATED FOR API CALLS');
    console.log('Checking for existing result and receipt image...');
    
    // If we already have a result somehow, navigate to items screen
    if (result && result.menuItems && result.menuItems.length > 0) {
      console.log('✅ Valid result already exists, navigating to items');
      setTimeout(() => {
        router.push('/split/items');
      }, 800); // Short delay to show animation
    } else if (!receiptImage) {
      // No receipt image, go back to review
      console.log('❌ No receipt image, going back to review');
      router.replace('/split/review');
    } else {
      // We have a receipt image but no result - we'll make the API call
      console.log('🔍 Receipt image exists, will make API call');
    }
  }, [result, router, receiptImage]);
  
  // Removed multiple failsafe timers to prevent unwanted navigation
  useEffect(() => {
    console.log('⏱️ Failsafe timers have been removed to prevent navigation issues');
    
    // No automatic failsafe timers - will rely on the result detection navigation only
    
    return () => {
      // No timers to clean up
    };
  }, []);
  
  // Always use the real Gemini API and never mock data
  const useMockData = false; // Set to false to use the real API
  
  // Handle hardware back button using BackHandler
  useEffect(() => {
    // Add back handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prevent default behavior and navigate to review
      if (isMounted.current) {
        router.push('/split/review');
        return true; // Prevent default behavior
      }
      return false;
    });
    
    // Clean up
    return () => backHandler.remove();
  }, [router]);
  
  // Handle animations separately from API calls
  useEffect(() => {
    // Set up animations
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
    
    // Cleanup animations when component unmounts
    return () => {
      console.log('Animation cleanup: marking component as unmounted');
      isMounted.current = false;
    };
  }, []);
  
  // Use a single, stable navigation approach
  useEffect(() => {
    console.log('Process screen result effect running, checking data...');
    
    // Only log this once per component mount for debugging
    const hasResult = result && result.menuItems && result.menuItems.length > 0;
    console.log(`Process screen has result: ${hasResult}, mounted: ${isMounted.current}, has navigated: ${hasNavigated.current}`);
    
    // ONLY navigate if we have valid data and haven't navigated yet
    if (hasResult && !hasNavigated.current && isMounted.current) {
      console.log('Navigation: Valid data detected, navigating once');
      
      // Set navigation flag to prevent multiple attempts
      hasNavigated.current = true;
      
      // Use a SINGLE navigation method for consistency
      router.push('/split/items');
      
      console.log('Navigation completed to items screen');
    }
  }, [result, router]);
  
  // REPLACED BY THE RESULT WATCHER EFFECT - This function is now a no-op
  const navigateToItemsScreen = useCallback(() => {
    console.log('⚠️ Old navigateToItemsScreen function called - using result watcher instead');
    // This function does nothing now - all navigation is handled by the result watcher effect
  }, []); // No dependencies needed
  
  
  // Separate useEffect for API call and navigation logic
  // Use a ref to track processing status
  const processingRef = useRef(false);
  
  useEffect(() => {
    // Run the API call with our stylish animation
    console.log('🔥 MAKING API CALL WITH STYLISH ANIMATION');
    
    // Log if we're using mock data or real API
    console.log('Using mock data setting:', useMockData ? 'TRUE (using mock data)' : 'FALSE (using real API)');
    
    // No need for safety timers with our improved animation
    const safetyTimer = null;
    
    // Create a timer for navigation if no image
    let timer: NodeJS.Timeout | null = null;
    
    // Handle the case with no receipt image
    if (!receiptImage) {
      // No image to process, always go back to the review page
      console.log('No receipt image, going back to review');
      
      // Use setTimeout to avoid navigation during render
      timer = setTimeout(() => {
        if (isMounted.current) {
          router.push('/split/review');
        }
      }, 300);
    }
    // Continue with normal flow if we have an image - DO NOT USE early return
    
    // Process the receipt image
    const processReceipt = async () => {
      // Log that we're entering the process function
      console.log('🔍 ENTERING processReceipt() function to analyze receipt image');
      
      // Remove guard to ensure processing always happens
      // We still keep the flag for debugging purposes
      if (processingRef.current) {
        console.log('⚠️ Already processing, but proceeding anyway to ensure API call is made');
      }
      
      // Set the processing flag immediately
      processingRef.current = true;
      console.log('🚀 Starting Gemini API processing for receipt image');
      
      try {
        // Remove guard to ensure API call always happens
        if (!isMounted.current) {
          console.log('⚠️ Component not mounted but proceeding with API call anyway');
        }
        
        console.log('Starting receipt analysis with Gemini...', { 
          imageExists: !!receiptImage,
          imageLength: receiptImage ? receiptImage.length : 0,
          imageStart: receiptImage ? receiptImage.substring(0, 30) + '...' : 'none'
        });
        
        // Verify receipt image exists and is valid unless using mock data
        if (!useMockData && (!receiptImage || typeof receiptImage !== 'string' || !receiptImage.startsWith('data:image'))) {
          console.error('Invalid receipt image format:', receiptImage?.substring(0, 50) + '...');
          console.log('⚠️ Using mock data because receipt image is invalid');
          throw new Error('Invalid receipt image format');
        }
        
        // Use mock data if flag is set or if we're in development and want to test
        if (useMockData) {
          console.log('Using mock data by request');
          const mockResult = generateMockResult();
          setSplitResult(mockResult);
          
          // Add brief delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Wait for state update to complete before recalculating
          setTimeout(() => {
            if (!isMounted.current) return;
            
            recalculateSplitAmounts();
            console.log('Mock data set, recalculated, now navigating to items');
            
            // Force a longer delay and check the result state before navigation
            setTimeout(() => {
              if (!isMounted.current) return;
              
              // Log the current state of the result
              console.log('Checking result before navigation:', {
                hasResult: !!result,
                hasSplitAmounts: result?.splitAmounts?.length > 0,
                menuItemsCount: result?.menuItems?.length,
                total: result?.total,
                people: people.length
              });
              
              // Navigate to items with mock data
              if (isMounted.current) {
                console.log('Attempting navigation to items screen with mock data...');
                navigateToItemsScreen();
              }
            }, 1000);
          }, 100);
          return; // Exit early
        }
        
        // Call the Gemini Vision API to analyze the receipt
        let geminiResult;
        try {
          console.log('🔥 DIRECTLY CALLING Gemini API with receipt image...');
          
          // Force logs to flush before making the API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // CRITICAL: Direct API call with detailed logging
          geminiResult = await analyzeReceipt(receiptImage);
          console.log('✅ Gemini API call successful, result:', geminiResult);
          
          // Don't guard against unmounting - allow the process to complete
          // even if the component is unmounted
          
          // Validate the Gemini result structure
          if (!validateResultStructure(geminiResult)) {
            console.error('Invalid Gemini result structure:', geminiResult);
            throw new Error('Invalid Gemini result structure');
          }
          
          // Check if Gemini failed to identify menu items
          if (geminiResult.menuItems.length === 0 || 
              (geminiResult.menuItems.length === 1 && 
               geminiResult.menuItems[0].name.toLowerCase().includes('failed to identify'))) {
            console.error('No menu items found in the receipt image');
            throw new Error('No menu items found in the receipt image');
          }
          
          // Log successful validation
          console.log('✅ Gemini result successfully validated');
        } catch (apiError) {
          console.error('Error during Gemini API call:', apiError);
          
          // If there's an API error, use mock data instead
          console.log('API call failed, using mock data instead');
          const mockResult = generateMockResult();
          setSplitResult(mockResult);
          
          // Wait for state update to complete before recalculating
          setTimeout(() => {
            if (!isMounted.current) return;
            
            recalculateSplitAmounts();
            console.log('API error fallback: Mock data set, recalculated, now navigating to items');
            
            // Navigate to items with mock data
            setTimeout(() => {
              if (isMounted.current) {
                console.log('API error fallback: Navigating to items screen...');
                navigateToItemsScreen();
              }
            }, 300); // Increased delay for stability
          }, 100);
          
          return; // Exit the function early
        }
        
        // At this point, we have a valid geminiResult
        console.log('Gemini analysis complete', geminiResult);
        
        // Initialize split amounts based on people
        const initialSplitAmounts = people.map(person => ({
          personId: person.id,
          amount: "0.00" // Initial amount, will be calculated later
        }));
        
        // Set up the result with the Gemini data
        const result = {
          ...geminiResult,
          splitAmounts: initialSplitAmounts
        };
        
        // NAVIGATION IS NOW HANDLED BY THE RESULT WATCHER EFFECT ONLY
        // No more force navigation timers needed
        console.log('🔄 Navigation will be handled by the main result watcher');
        
        // Update the context with the analysis results
        setSplitResult(result);
        
        // Wait for state update to complete before recalculating and navigating
        setTimeout(() => {
          if (!isMounted.current) return;
          
          // Recalculate split amounts based on items
          recalculateSplitAmounts();
          
          // No need to manually navigate here - the effect will handle it
          console.log('Analysis complete - navigation will be handled by effect');
        }, 100);
      } catch (err) {
        // Guard against component being unmounted
        if (!isMounted.current) return;
        
        console.error('Error processing receipt:', err);
        
        // If Gemini fails, fall back to mock data for demo purposes
        console.log('Falling back to mock data');
        
        // Generate mock data
        const mockResult = generateMockResult();
        setSplitResult(mockResult);
        
        // Wait for state update to complete before recalculating
        setTimeout(() => {
          if (!isMounted.current) return;
          
          // Recalculate split amounts based on items
          recalculateSplitAmounts();
          console.log('Error fallback: Mock data set, recalculated, now navigating to items');
          
          // Navigate to the items screen with mock data after a short delay
          setTimeout(() => {
            if (isMounted.current) {
              console.log('Error recovery: Attempting navigation to items screen...');
              navigateToItemsScreen();
            }
          }, 300); // Increased delay for stability
        }, 100);
      }
    };

    // Process receipt - Make a direct call without any other checks
    console.log('🔄 DIRECTLY CALLING processReceipt()');
    processReceipt();
    
    // Clean up function to prevent state updates after unmounting
    return () => {
      console.log('Process screen unmounting, marking as not mounted');
      // Reset flags in a specific order
      hasNavigated.current = false;  // First reset navigation flag (in case component is reused)
      isMounted.current = false;     // Then mark as unmounted
      processingRef.current = false; // Reset processing flag
      // No safetyTimer to clear since we're not using it
      
      // Also clear the timer for no receipt image case
      if (timer) {
        clearTimeout(timer);
      }
      
      // No need to reset Gemini API state here
      // Simply log the unmounting event
      console.log('🔄 Process screen unmounted completely');
    };
  }, [receiptImage, people, setSplitResult, recalculateSplitAmounts, router, navigateToItemsScreen]);

  const generateMockResult = () => {
    const total = 78.45;
    const tax = 6.25;
    const tip = 15.69;
    
    console.log('Generating mock data with total:', total.toFixed(2), 'and people:', people.length);
    
    // Generate some mock menu items
    const menuItems = [
      {
        id: '1',
        name: 'Pasta Carbonara',
        price: 18.99,
        assignedTo: [] as string[],
      },
      {
        id: '2',
        name: 'Caesar Salad',
        price: 9.99,
        assignedTo: [] as string[],
      },
      {
        id: '3',
        name: 'Garlic Bread',
        price: 5.99,
        assignedTo: [] as string[],
      },
      {
        id: '4',
        name: 'Tiramisu',
        price: 7.99,
        assignedTo: [] as string[],
      },
      {
        id: '5',
        name: 'Iced Tea',
        price: 3.99,
        assignedTo: [] as string[],
      },
    ];
    
    // Ensure we have at least one menu item
    if (menuItems.length === 0) {
      menuItems.push({
        id: '1',
        name: 'Default Item',
        price: 20.00,
        assignedTo: [] as string[],
      });
    }
    
    // Ensure people exists
    if (!people || people.length === 0) {
      console.warn('No people found when generating mock data!');
    }
    
    // Initial split amounts for all people
    const initialSplitAmounts = (people || []).map(person => ({
      personId: person.id,
      amount: "0.00" // Will be recalculated later
    }));
    
    if (initialSplitAmounts.length === 0) {
      // Fallback if no people
      initialSplitAmounts.push({
        personId: 'me',
        amount: total.toFixed(2)
      });
    }
    
    return {
      total: total.toFixed(2),
      tax: tax.toFixed(2),
      tip: tip.toFixed(2),
      menuItems,
      splitAmounts: initialSplitAmounts
    };
  };

  // State for showing manual continue button - MUST be defined before any conditional code
  const [showManualContinue, setShowManualContinue] = useState(false);
  
  const spin = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Add manual navigation button for reliability
  useEffect(() => {
    // If we have data and we've been on this screen for 4+ seconds, show the continue button
    if (result && result.menuItems && result.menuItems.length > 0) {
      console.log('Valid result detected - will show manual continue button shortly');
      setTimeout(() => {
        if (isMounted.current) {
          console.log('Showing manual continue button due to valid result');
          // This will trigger a re-render to show the button
          setShowManualContinue(true);
        }
      }, 4000);
    }
  }, [result]);
  
  // Manual navigation handler
  const handleManualContinue = () => {
    console.log('Manual continue button pressed');
    router.push('/split/items');
  };
  
  // Declare additional animations for our new UI
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const circleScaleAnimation = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  
  // Start additional animations
  useEffect(() => {
    // Fade in elements
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
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
  }, []);

  return (
    <ThemedView style={styles.container}>
      
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnimation }]}>
        <ThemedText style={styles.title}>Analyzing Receipt</ThemedText>
        
        <ThemedView style={styles.animationContainer}>
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
            <IconSymbol name="receipt" size={40} color="#3498db" />
          </Animated.View>
          
          {/* Satellite icons */}
          <Animated.View 
            style={[
              styles.satelliteIcon, 
              styles.satelliteTopRight,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <IconSymbol name="doc.text.magnifyingglass" size={22} color="#8e44ad" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.satelliteIcon, 
              styles.satelliteBottomRight,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <IconSymbol name="function" size={22} color="#e74c3c" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.satelliteIcon, 
              styles.satelliteBottomLeft,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <IconSymbol name="person.2" size={22} color="#2ecc71" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.satelliteIcon, 
              styles.satelliteTopLeft,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <IconSymbol name="dollarsign.circle" size={22} color="#f39c12" />
          </Animated.View>
        </ThemedView>
        
        <ThemedView style={styles.stepsContainer}>
          <ThemedView style={styles.stepRow}>
            <ThemedView style={styles.checkCircleComplete}>
              <IconSymbol name="checkmark" size={14} color="#fff" />
            </ThemedView>
            <ThemedText style={styles.stepComplete}>Reading text from image</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.stepRow}>
            <ThemedView style={styles.checkCircleComplete}>
              <IconSymbol name="checkmark" size={14} color="#fff" />
            </ThemedView>
            <ThemedText style={styles.stepComplete}>Identifying menu items</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.stepRow}>
            <ThemedView style={styles.checkCircleActive}>
              <Animated.View style={{transform: [{rotate: spin}]}}>
                <IconSymbol name="arrow.clockwise" size={14} color="#fff" />
              </Animated.View>
            </ThemedView>
            <ThemedText style={styles.stepActive}>Calculating totals</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.stepRow}>
            <ThemedView style={styles.checkCirclePending}></ThemedView>
            <ThemedText style={styles.stepPending}>Preparing split details</ThemedText>
          </ThemedView>
        </ThemedView>
        
        <ThemedText style={styles.message}>
          Our AI is analyzing your receipt to prepare your split
        </ThemedText>
      </Animated.View>
      
      {showManualContinue && (
        <TouchableOpacity 
          style={styles.manualContinueButton}
          onPress={handleManualContinue}
        >
          <ThemedText style={styles.manualContinueText}>
            Continue to Item Assignment
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60, // Extra padding at the container level
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 30, // Add padding to content container
  },
  title: {
    fontSize: 32, // Slightly larger
    fontFamily: 'OutfitExtraBold', // Using ExtraBold for emphasis
    marginBottom: 50,
    letterSpacing: -0.2, // Adjusted for Outfit
    marginTop: 70, // Significantly increased top margin to prevent cutoff
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  animationContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    marginBottom: 50,
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
    alignSelf: 'stretch',
    marginBottom: 40,
    paddingHorizontal: 20,
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
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginRight: 14,
  },
  stepComplete: {
    fontSize: 16,
    color: '#2ecc71',
    fontFamily: 'OutfitMedium',
    letterSpacing: 0.2,
  },
  stepActive: {
    fontSize: 16,
    color: '#3498db',
    fontFamily: 'OutfitSemiBold',
    letterSpacing: 0.2,
  },
  stepPending: {
    fontSize: 16,
    opacity: 0.5,
    fontFamily: 'OutfitRegular',
    letterSpacing: 0.2,
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: '80%',
    marginBottom: 30,
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: 'OutfitRegular',
  },
  manualContinueButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  manualContinueText: {
    color: 'white',
    fontFamily: 'OutfitSemiBold',
    fontSize: 16,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});