import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  Animated, 
  Dimensions,
  BackHandler 
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSplitContext } from '@/contexts/SplitContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define TypeScript types for context and props where needed
type SplitContextType = {
  setReceiptImage: (image: string) => void;
  resetReceiptData: () => void;
};

export default function CameraScreen() {
  const router = useRouter();
  const { setReceiptImage, resetReceiptData } = useSplitContext() as SplitContextType;
  const [loading, setLoading] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [showCamera, setShowCamera] = useState(true);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const guideBoxAnim = useRef(new Animated.Value(0.5)).current;
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Reset camera state when component mounts
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Reset UI state
    setShowCamera(true);
    setLoading(false);
    
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    
    // Reset API state but preserve people
    console.log('Camera mounted - resetting API state to allow new API call');
    // Note: We don't call reset() here anymore, as it would clear people data
    // Instead, we'll just reset the API state directly
    
    // Import and reset the API state directly
    const resetApiState = async () => {
      try {
        const { resetApiState } = await import('@/services/geminiService');
        resetApiState();
        console.log('API state reset complete - ready for new scan');
      } catch (err) {
        console.error('Failed to reset API state:', err);
      }
    };
    
    resetApiState();
    
    // Start animations
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
    ]).start();
    
    // Smoother pulse animation for guide box with easing
    Animated.loop(
      Animated.sequence([
        Animated.timing(guideBoxAnim, {
          toValue: 0.9,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(guideBoxAnim, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Override the hardware back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('Hardware back pressed from camera, going to people');
        // Animation before navigation
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
          // Go to people screen for consistent navigation
          if (isMounted.current) {
            router.replace('/split/people');
          }
        });
        return true; // Prevent default back behavior
      }
    );
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      backHandler.remove();
    };
  }, []);
  
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  // Track API call status - moved here to ensure consistent hook order
  const [isLoading, setIsLoading] = useState(false);

  const takePicture = async () => {
    if (!cameraRef.current) {
      console.log('Camera ref is not set');
      return;
    }
    
    try {
      // Add a camera shutter animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.2,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();
      
      setLoading(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,  // Reduce quality slightly to ensure smaller file size
        base64: true,
        exif: false,   // Don't include EXIF data to keep the image smaller
      });
      
      if (photo.base64) {
        const base64Image = `data:image/jpeg;base64,${photo.base64}`;
        
        // Animate out before disabling camera
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(() => {
          // Immediately disable camera to prevent it from staying on
          setShowCamera(false);
          
          // Set the image in context
          setReceiptImage(base64Image);
          
          // Navigation to the review screen
          router.push('/split/review');
        });
      } else {
        console.log('Base64 not available');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        exif: false,
        allowsEditing: true,  // Allow user to crop image to focus on receipt
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let base64Image = '';
        
        if (asset.base64) {
          base64Image = `data:image/jpeg;base64,${asset.base64}`;
        } else if (asset.uri) {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Image = `data:image/jpeg;base64,${fileContent}`;
        }
        
        if (base64Image) {
          // Animate out before disabling camera
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: -20,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start(() => {
            // Disable camera
            setShowCamera(false);
            
            // Set the image in context
            setReceiptImage(base64Image);
            
            // Navigate to review screen
            router.push('/split/review');
          });
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    console.log('Back pressed on camera, going to people selection...');
    
    // Animation before navigation
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
        // Navigate directly to people selection for more stable flow
        router.replace('/split/people');
      }
    });
  };

  const buttonGradient = ['#3498db', '#2980b9'];
  
  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#EFF6FF']}
          style={styles.background}
        />
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#7678FF' : '#5B5FFF'} />
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#EFF6FF']}
          style={styles.background}
        />
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: 'center',
          width: '100%',
          padding: 24,
          maxWidth: 380,
          alignSelf: 'center'
        }}>
          <View style={styles.permissionCard}>
            <ThemedText type="title" style={styles.permissionTitle}>Camera Access</ThemedText>
            
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={colorScheme === 'dark' ? ['#5B5FFF20', '#7678FF40'] : ['#5B5FFF15', '#7678FF30']}
                style={styles.iconGradient}
              >
                <Ionicons 
                  name="camera-outline" 
                  size={70} 
                  color={colorScheme === 'dark' ? '#7678FF' : '#5B5FFF'} 
                />
              </LinearGradient>
            </View>
            
            <ThemedText style={styles.permissionText}>
              We need camera access to scan your receipt and help you split expenses with friends
            </ThemedText>
          </View>
          
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={colorScheme === 'dark' ? ['#7678FF', '#5B5FFF'] : ['#5B5FFF', '#4B4DFF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <ThemedText style={styles.buttonText}>Grant Camera Permission</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={colorScheme === 'dark' ? ['#7678FF', '#5B5FFF'] : ['#5B5FFF', '#4B4DFF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="images" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <ThemedText style={styles.buttonText}>Select from Gallery</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.permissionButton, styles.secondaryButton]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <View style={styles.secondaryButtonContent}>
              <Ionicons 
                name="arrow-back-outline" 
                size={20} 
                color={colorScheme === 'dark' ? '#7678FF' : '#5B5FFF'} 
                style={styles.buttonIcon} 
              />
              <ThemedText 
                style={[styles.secondaryButtonText, { color: colorScheme === 'dark' ? '#7678FF' : '#5B5FFF' }]}
              >
                Go Back
              </ThemedText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // If camera is disabled (after taking photo), show loading screen instead
  if (!showCamera) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#EFF6FF']}
          style={styles.background}
        />
        <View style={styles.processingContainer}>
          <View style={styles.loadingIconContainer}>
            <ActivityIndicator 
              size="large" 
              color={colorScheme === 'dark' ? '#7678FF' : '#5B5FFF'} 
            />
          </View>
          <ThemedText style={styles.loadingText}>Processing photo...</ThemedText>
          <ThemedText style={styles.loadingSubText}>
            We're analyzing your receipt
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
      >
        <Animated.View 
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[
            styles.header, 
            { 
              paddingTop: Math.max(insets.top + 40, 90), // Significantly increased padding to prevent text cutoff
              backgroundColor: 'rgba(0,0,0,0.5)', // Darker background for better contrast
              paddingBottom: 15, // Additional bottom padding
            }
          ]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <ThemedText style={styles.headerText}>Scan Receipt</ThemedText>
            </View>
          </View>
          
          <Animated.View 
            style={[
              styles.guideBox,
              {
                // Shadow animation to create a subtle glow effect
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: guideBoxAnim.interpolate({
                  inputRange: [0.6, 0.9],
                  outputRange: [0.1, 0.3]
                }),
                shadowRadius: 8,
              }
            ]}
          >
            <Animated.View 
              style={[
                styles.guideBoxCorner, 
                styles.topLeft,
                {
                  borderColor: guideBoxAnim.interpolate({
                    inputRange: [0.6, 0.9],
                    outputRange: ['rgba(79,70,229,0.8)', 'rgba(99,102,241,1)']
                  }),
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.guideBoxCorner, 
                styles.topRight,
                {
                  borderColor: guideBoxAnim.interpolate({
                    inputRange: [0.6, 0.9],
                    outputRange: ['rgba(79,70,229,0.8)', 'rgba(99,102,241,1)']
                  }),
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.guideBoxCorner, 
                styles.bottomLeft,
                {
                  borderColor: guideBoxAnim.interpolate({
                    inputRange: [0.6, 0.9],
                    outputRange: ['rgba(79,70,229,0.8)', 'rgba(99,102,241,1)']
                  }),
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.guideBoxCorner, 
                styles.bottomRight,
                {
                  borderColor: guideBoxAnim.interpolate({
                    inputRange: [0.6, 0.9],
                    outputRange: ['rgba(79,70,229,0.8)', 'rgba(99,102,241,1)']
                  }),
                }
              ]} 
            />
          </Animated.View>
          
          <View style={styles.controlsContainer}>
            <View style={styles.instructionContainer}>
              <Ionicons name="information-circle-outline" size={18} color="#4F46E5" style={styles.infoIcon} />
              <ThemedText style={styles.instruction}>
                Position receipt within the box
              </ThemedText>
            </View>
            
            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.galleryButton}
                onPress={pickImage}
              >
                <Ionicons name="images" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={takePicture}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.galleryButton}
                onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
              >
                <Ionicons name="camera-reverse" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 320,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(91, 95, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'OutfitSemiBold',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  loadingSubText: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'OutfitRegular',
    opacity: 0.8,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 15,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
  },
  headerText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'OutfitBold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    paddingVertical: 3,
    textAlign: 'center',
  },
  guideBox: {
    alignSelf: 'center',
    width: '80%',
    height: '50%',
    borderWidth: 0,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  guideBoxCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#5B5FFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },
  controlsContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoIcon: {
    marginRight: 10,
    color: '#5B5FFF',
  },
  instruction: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'OutfitMedium',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  galleryButton: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  captureButtonInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#5B5FFF',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#5B5FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  // Permission screen styles
  permissionCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  permissionTitle: {
    fontSize: 32,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'OutfitBold',
    letterSpacing: -0.3,
  },
  iconContainer: {
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B5FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  permissionText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'OutfitRegular',
    opacity: 0.9,
    maxWidth: '90%',
  },
  permissionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#5B5FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#5B5FFF20',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'transparent',
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'OutfitMedium',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondaryButtonText: {
    fontFamily: 'OutfitMedium',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});