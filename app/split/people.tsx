import { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  TextInput, 
  Keyboard, 
  Platform, 
  KeyboardAvoidingView,
  View,
  Dimensions,
  Text,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { useSplitContext } from '@/contexts/SplitContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PeopleScreen() {
  const router = useRouter();
  const { people, addPerson, removePerson } = useSplitContext();
  const [newName, setNewName] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const listItemAnimations = useRef<Animated.Value[]>([]);
  const buttonOpacityAnim = useRef(new Animated.Value(0.5)).current;
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Prepare animations for existing items
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    
    // Initialize animations for each person
    listItemAnimations.current = people.map(() => new Animated.Value(0));
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      ...listItemAnimations.current.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: 100 + (index * 50),
          useNativeDriver: true,
        })
      )
    ]).start();
    
    // Clean up function
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Animate button opacity based on whether there's text input
  useEffect(() => {
    Animated.timing(buttonOpacityAnim, {
      toValue: newName.trim() ? 1 : 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [newName]);

  const handleAddPerson = () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    
    // Create new animation for the new item
    const newItemAnim = new Animated.Value(0);
    listItemAnimations.current.push(newItemAnim);
    
    // Add the person first
    addPerson(newName.trim());
    setNewName('');
    inputRef.current?.focus();
    
    // Then animate the new item
    Animated.timing(newItemAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (people.length < 1) {
      Alert.alert('Error', 'Please add at least one person');
      return;
    }
    // Dismiss keyboard before navigation
    Keyboard.dismiss();
    
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (isMounted.current) {
        router.push('/split/camera');
      }
    });
  };

  const handleBack = () => {
    console.log('Back pressed on people screen, going to home');
    
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (isMounted.current) {
        // Go back to home tab
        router.replace('/');
      }
    });
  };
  
  // Background gradient colors
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a']
    : ['#ffffff', '#f8f9fa'];
    
  // Button gradient
  const buttonGradient = isDark 
    ? ['#3498db', '#2c7db1'] 
    : ['#3498db', '#2980b9'];

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={backgroundGradient}
        style={styles.background}
      />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <Animated.View style={[
          styles.mainContainer, 
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.contentContainer}>
            <SafeAreaHeader
              title="Who's splitting?"
              onBack={handleBack}
            />

            <ThemedText style={styles.subtitle}>
              Add everyone who will split the bill
            </ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: textColor }]}
                placeholder="Enter name"
                placeholderTextColor={isDark ? "#777" : "#999"}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={handleAddPerson}
                returnKeyType="done"
              />
              <TouchableOpacity 
                onPress={newName.trim() ? handleAddPerson : () => inputRef.current?.focus()}
                activeOpacity={0.9}
              >
                <Animated.View style={{ opacity: buttonOpacityAnim }}>
                  <LinearGradient
                    colors={buttonGradient}
                    style={styles.addButton}
                  >
                    <Ionicons name="add" size={22} color="#fff" />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </View>

            <FlatList
              data={people}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <Animated.View style={{
                  opacity: listItemAnimations.current[index] || fadeAnim,
                  transform: [{ 
                    translateX: (listItemAnimations.current[index] || fadeAnim).interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }]
                }}>
                  <View style={[
                    styles.personItem,
                    isDark ? styles.personItemDark : styles.personItemLight,
                    item.id === 'me' && styles.meItem
                  ]}>
                    <View style={styles.personAvatar}>
                      <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.personName, { color: textColor }]}>{item.name}</Text>
                    {item.id !== 'me' && (
                      <TouchableOpacity 
                        onPress={() => removePerson(item.id)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={22} color={isDark ? "#ff6161" : "#ff3b30"} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )}
            />
          </View>

          <Animated.View style={styles.buttonWrapper}>
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Next: Scan Receipt</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.nextButtonIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    opacity: 0.8,
    fontFamily: 'InterRegular',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    fontSize: 16,
    fontFamily: 'InterRegular',
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  personItemLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  personItemDark: {
    backgroundColor: 'rgba(50, 50, 50, 0.4)',
  },
  meItem: {
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
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
    fontFamily: 'InterMedium',
    fontWeight: 'bold',
  },
  personName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'InterMedium',
  },
  removeButton: {
    padding: 8,
  },
  buttonWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  nextButtonText: {
    color: '#fff',
    fontFamily: 'InterSemiBold',
    fontSize: 16,
  },
  nextButtonIcon: {
    marginLeft: 8,
  }
});