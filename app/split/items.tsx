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
  Text
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

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ItemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromReview = params.from === 'review';
  const { people, result, assignItemToPerson } = useSplitContext();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideInHeader = useRef(new Animated.Value(-20)).current;
  const scaleButton = useRef(new Animated.Value(0.95)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const itemsAppear = useRef(result?.menuItems?.map(() => new Animated.Value(0)) || []).current;

  // Animation refs for chevron rotation and option animations
  const chevronRotation = useRef({});
  const personOptionAnims = useRef({}); // Store animations for each person option
  
  // Track component mounting state and prevent concurrent updates
  const isMounted = useRef(true);
  const isUpdating = useRef(false);

  // Animate toggle for item expansion with enhanced spring physics
  const setupCustomLayoutAnimation = () => {
    LayoutAnimation.configureNext({
      duration: 300, // Slightly faster for better flow
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.8, // Increased damping for less oscillation
        initialVelocity: 0.6, // Slightly higher initial velocity
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.75, // Increased damping for smoother motion
        initialVelocity: 0.5,
      },
      delete: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.85, // Increased damping for less oscillation
      }
    });
  };

  // Create animated values for UI elements
  useEffect(() => {
    if (result && result.menuItems) {
      // Initialize rotation values for each item
      result.menuItems.forEach(item => {
        chevronRotation.current[item.id] = new Animated.Value(0);
        
        // Initialize person option animations for each item
        if (!personOptionAnims.current[item.id]) {
          personOptionAnims.current[item.id] = {};
          
          // Create animation values for each person in each item
          people.forEach((person, index) => {
            personOptionAnims.current[item.id][person.id] = {
              opacity: new Animated.Value(0),
              translateY: new Animated.Value(20)
            };
          });
        }
      });
    }
  }, [result, people]);

  // Set up component mount state and prevent API calls - MUST be first
  useEffect(() => {
    console.log('Items screen mounting, setting up state');
    // Set mounted flag to true when component mounts
    isMounted.current = true;
    // Reset the update lock when mounting
    isUpdating.current = false;
    
    // Clean up function to prevent updates after unmounting
    return () => {
      console.log('Items screen unmounting');
      isMounted.current = false;
      isUpdating.current = false;
    };
  }, []);

  // Use memo to prevent recalculation of unassigned items on each render
  const unassignedItemsCount = useMemo(() => {
    if (result && result.menuItems) {
      const items = result.menuItems.filter(item => 
        item.price > 0 && item.assignedTo.length === 0
      );
      return items.length;
    }
    return 0;
  }, [result?.menuItems]);
  
  // Log unassigned items once when count changes
  useEffect(() => {
    if (unassignedItemsCount > 0) {
      console.log(`Found ${unassignedItemsCount} unassigned items`);
    }
  }, [unassignedItemsCount]);

  // Handle animations ONCE on initial render only - no dependencies on result
  useEffect(() => {
    console.log('Starting animations');
    
    // Only start animations once
    const animationTimeout = setTimeout(() => {
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(slideInHeader, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 800,
          delay: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleButton, {
          toValue: 1,
          duration: 800,
          delay: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1.2),
        }),
        Animated.stagger(100, 
          itemsAppear.map(anim => 
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            })
          )
        )
      ]).start();
    }, 100);
    
    return () => {
      clearTimeout(animationTimeout);
    };
  }, []);

  // Track if we've already logged the mount message
  const hasLoggedMount = useRef(false);
  
  // Handle hardware back button - completely separate from other effects
  useEffect(() => {
    console.log('Setting up hardware back button handler');
    
    // Add hardware back handler to prevent navigation issues
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Hardware back pressed on items screen');
      // Always go back to review on hardware back press
      router.push('/split/review'); // Using push instead of replace for better stability
      return true; // Prevent default behavior
    });
    
    // Clean up back handler
    return () => {
      console.log('Removing hardware back button handler');
      backHandler.remove();
    };
  }, [router]);
  
  // Log mount status only once, separate from other effects
  useEffect(() => {
    // Only log the mount message once
    if (!hasLoggedMount.current) {
      console.log('🎯 ITEMS SCREEN MOUNTED! Verifying result data and people:', {
        hasMenuItems: !!result?.menuItems,
        menuItemsCount: result?.menuItems?.length || 0,
        peopleCount: people.length,
        people: people.map(p => `${p.id}:${p.name}`).join(', ')
      });
      hasLoggedMount.current = true;
    }
    
    // Never do any navigation or state updates in this effect
  }, [people, result]);
  
  // Define result data to avoid hook-order issues
  const hasValidResult = result && result.menuItems;

  const toggleItemExpansion = (itemId: string) => {
    // Check if we're clicking the same item that's already expanded
    const isSameItem = expandedItem === itemId;
    
    // Animate chevron rotation
    const isExpanding = !isSameItem;
    const toValue = isExpanding ? 1 : 0;
    
    if (chevronRotation.current[itemId]) {
      Animated.spring(chevronRotation.current[itemId], {
        toValue,
        friction: 6, // Reduced friction for smoother motion
        tension: 40,
        useNativeDriver: true
      }).start();
    }
    
    // When expanding, animate person options with staggered delay
    if (isExpanding && personOptionAnims.current[itemId]) {
      // Delay each person's animation
      Object.keys(personOptionAnims.current[itemId]).forEach((personId, index) => {
        const animations = personOptionAnims.current[itemId][personId];
        const staggerDelay = index * 50; // Reduced stagger delay for smoother flow
        
        // Reset animation values in case they were already animated
        animations.opacity.setValue(0);
        animations.translateY.setValue(20);
        
        // Start animations with staggered delays
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(animations.opacity, {
              toValue: 1,
              duration: 250, // Slightly faster fade in
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic)
            }),
            Animated.spring(animations.translateY, {
              toValue: 0,
              friction: 6, // Reduced friction for smoother motion
              tension: 35, // Slightly reduced tension
              useNativeDriver: true
            })
          ]).start();
        }, staggerDelay);
      });
    }
    
    // Setup layout animation for smooth expansion/collapse
    setupCustomLayoutAnimation();
    
    // Toggle expanded state - close if clicking the same item, otherwise open the clicked item
    setExpandedItem(isSameItem ? null : itemId);
  };

  // Define stable callback for toggling person assignment with useCallback
  const togglePersonAssignment = useCallback((itemId: string, personId: string) => {
    // Get a direct reference to the item to avoid issues with state updates
    const item = result?.menuItems?.find(i => i.id === itemId);
    if (!item) return;
    
    const isAssigned = item.assignedTo.includes(personId);
    console.log(`Toggling assignment for item ${itemId}, person ${personId}, current: ${isAssigned}`);
    
    // No animation here - we're using a simpler approach with activeOpacity
    
    // Directly call assignItemToPerson without any additional wrapping
    assignItemToPerson(itemId, personId, !isAssigned);
  }, [result, assignItemToPerson]);

  // Memoize validation result to prevent recalculation
  const validateAssignments = useCallback(() => {
    // Skip validation if no menu items
    if (!result || !result.menuItems || result.menuItems.length === 0) return true;
    
    // Check if any non-free items are unassigned
    const unassignedItems = result.menuItems.filter(item => 
      item.price > 0 && item.assignedTo.length === 0
    );
    
    return unassignedItems.length === 0;
  }, [result]);
  
  const handleDone = () => {
    // Validate that all items are assigned to at least one person
    if (!validateAssignments()) {
      // Show alert for unassigned items
      Alert.alert(
        "Unassigned Items",
        "Some items haven't been assigned to anyone. Please assign all items before continuing.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    console.log('Done pressed, navigating to tip screen');
    
    // Use a short timeout to ensure state is settled before navigation
    setTimeout(() => {
      if (isMounted.current) {
        console.log('Items assignment complete, navigating to tip screen');
        try {
          // First try using the replace method
          router.replace('/split/tip');
          
          // As a backup, try push if replace fails
          setTimeout(() => {
            if (isMounted.current) {
              console.log('Backup navigation to tip with push');
              router.push('/split/tip');
            }
          }, 500);
        } catch (e) {
          console.error('Navigation error to tip:', e);
          // If there's an error, try the direct approach
          router.push({
            pathname: '/split/tip'
          });
        }
      }
    }, 300); // Increased delay for stability
  };

  // Create a map of item scale animations
  const itemScaleAnims = useRef({}).current;
  
  // Initialize item scale animations
  useEffect(() => {
    if (result && result.menuItems) {
      result.menuItems.forEach(item => {
        if (!itemScaleAnims[item.id]) {
          itemScaleAnims[item.id] = new Animated.Value(1);
        }
      });
    }
  }, [result?.menuItems]);
  
  const animateItemPress = (itemId) => {
    if (itemScaleAnims[itemId]) {
      Animated.sequence([
        Animated.timing(itemScaleAnims[itemId], {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(itemScaleAnims[itemId], {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const renderItem = ({ item, index }) => {
    const isExpanded = expandedItem === item.id;
    const assignedPeopleCount = item.assignedTo.length;
    const itemAnimation = itemsAppear[index] || fadeAnim;
    const pressScaleAnim = itemScaleAnims[item.id] || new Animated.Value(1);

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
            }
          ]}
        >
          <Pressable 
            style={styles.itemHeader} 
            onPress={() => {
              animateItemPress(item.id);
              toggleItemExpansion(item.id);
            }}
          >
            <View style={styles.itemInfo}>
              <ThemedText style={styles.itemName}>{item.name}</ThemedText>
              <ThemedText style={styles.itemPrice}>${item.price.toFixed(2)}</ThemedText>
            </View>
            
            <View style={styles.itemSummary}>
              {assignedPeopleCount > 0 ? (
                <ThemedText style={styles.assignedCount}>
                  {assignedPeopleCount} {assignedPeopleCount === 1 ? 'person' : 'people'}
                </ThemedText>
              ) : (
                <ThemedText style={styles.unassigned}>Unassigned</ThemedText>
              )}
              
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
                  size={18} 
                  color={textColor} 
                />
              </Animated.View>
            </View>
          </Pressable>
          
          {isExpanded && (
            <View style={[styles.peopleContainer, { overflow: 'hidden' }]}>
              <ThemedText style={styles.assignText}>Who had this item?</ThemedText>
              
              {people.map((person, personIndex) => {
                const isAssigned = item.assignedTo.includes(person.id);
                // Instead of using useRef here, use the already established animation objects
                const personAnimKey = `${item.id}_${person.id}`;
                
                return (
                  <Animated.View 
                  key={person.id} 
                  style={{
                    opacity: personOptionAnims.current[item.id]?.[person.id]?.opacity || fadeAnim,
                    transform: [{ 
                      translateY: personOptionAnims.current[item.id]?.[person.id]?.translateY || fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }],
                    marginBottom: 8
                  }}
                >
                    <Animated.View style={{
                      transform: [{ scale: 1 }] // Fixed scale instead of dynamic animation
                    }}>
                      <TouchableOpacity
                        style={[
                          styles.personToggle,
                          isAssigned && styles.personToggleActive
                        ]}
                        activeOpacity={0.7}
                        onPress={() => togglePersonAssignment(item.id, person.id)}
                      >
                        <View style={styles.personAvatar}>
                          <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        
                        <ThemedText style={[
                          styles.personName,
                          isAssigned && styles.personNameActive
                        ]}>
                          {person.name}
                        </ThemedText>
                        
                        {isAssigned && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={22} 
                            color="#2E86DE" 
                          />
                        )}
                      </TouchableOpacity>
                    </Animated.View>
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
            </View>
          )}
        </Animated.View>
      </Animated.View>
    );
  };

  // Removed duplicate back handler - already handled above

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
          <ThemedText style={styles.listHeaderText}>
            {validateAssignments() 
              ? "All items are assigned" 
              : "Tap items below to assign them"}
          </ThemedText>
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

        <Animated.View style={{
          opacity: buttonOpacity,
          transform: [{ scale: scaleButton }]
        }}>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => {
              // Add button press animation
              Animated.sequence([
                Animated.timing(scaleButton, {
                  toValue: 0.96,
                  duration: 100,
                  useNativeDriver: true,
                  easing: Easing.out(Easing.cubic),
                }),
                Animated.spring(scaleButton, {
                  toValue: 1,
                  friction: 4,
                  tension: 40,
                  useNativeDriver: true,
                }),
              ]).start();
              
              // Add slight delay to make animation visible before navigation
              setTimeout(handleDone, 150);
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneButtonGradient}
            >
              <Text style={styles.doneButtonText}>
                {validateAssignments() ? 'Continue to Results' : 'Assign All Items'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
          
          {!validateAssignments() && (
            <Animated.View style={{
              opacity: buttonOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1]
              })
            }}>
              <ThemedText style={styles.warningText}>
                Please assign all items to at least one person before continuing
              </ThemedText>
            </Animated.View>
          )}
        </Animated.View>
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
  listHeaderText: {
    fontWeight: '500',
    fontSize: 15,
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
  assignedCount: {
    fontSize: 14,
    color: '#2E86DE',
  },
  unassigned: {
    fontSize: 14,
    opacity: 0.5,
  },
  peopleContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(46, 134, 222, 0.02)',
  },
  assignText: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  personToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  personToggleActive: {
    backgroundColor: 'rgba(46, 134, 222, 0.1)',
    borderWidth: 1,
    borderColor: '#2E86DE',
    shadowColor: '#2E86DE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  personName: {
    fontSize: 16,
    fontFamily: 'InterRegular',
  },
  personNameActive: {
    fontFamily: 'InterSemiBold',
    color: '#2E86DE',
  },
  splitInfo: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'InterSemiBold',
    color: '#2E86DE',
  },
  doneButton: {
    borderRadius: 16,
    marginTop: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  doneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontFamily: 'InterSemiBold',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  warningText: {
    color: '#FF5722',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'InterRegular',
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'InterSemiBold',
  },
});