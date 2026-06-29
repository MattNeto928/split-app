import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { useSplitContext } from '@/contexts/SplitContext';
import { Colors, Spacing, Radius, Elevation } from '@/constants/Colors';

const c = Colors.light;

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
  const [isTorchOn, setIsTorchOn] = useState(false);
  const insets = useSafeAreaInsets();

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
        allowsEditing: false,  // Disabled editing/cropping to use the entire screenshot
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let base64Image = '';

        if (asset.base64) {
          base64Image = `data:image/jpeg;base64,${asset.base64}`;
        } else if (asset.uri) {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64' as any,
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

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.centeredPaper}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.centeredPaper}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: '100%',
            maxWidth: 380,
            alignSelf: 'center',
          }}
        >
          <EmptyState
            icon="camera-outline"
            title="Camera access needed"
            message="We need camera access to scan your receipt and help you split the bill. You can also pick a photo from your library."
            actionLabel="Allow camera"
            onAction={requestPermission}
          />
          <View style={styles.permissionActions}>
            <Button
              title="Choose from library"
              variant="secondary"
              leftIcon="images-outline"
              onPress={pickImage}
            />
            <Button
              title="Go back"
              variant="ghost"
              leftIcon="arrow-back-outline"
              onPress={handleBack}
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  // If camera is disabled (after taking photo), show loading screen instead
  if (!showCamera) {
    return (
      <View style={styles.centeredPaper}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={c.accent} />
          <ThemedText type="subtitle" style={styles.processingTitle}>
            Processing photo
          </ThemedText>
          <ThemedText type="default" muted style={styles.processingSub}>
            We're reading your receipt
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
        enableTorch={isTorchOn} // Use the enableTorch prop
      />
      <Animated.View // This is the overlay content
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top + Spacing['2xl'], 88),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={c.onAccent} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <ThemedText type="h3" style={styles.headerText}>
              Scan receipt
            </ThemedText>
          </View>
        </View>

        {/* Dimmed scrim mask around a receipt-aspect guide box */}
        <View style={styles.maskMiddle}>
          <View style={styles.maskSide} />
          <Animated.View
            style={[
              styles.guideBox,
              {
                shadowColor: c.accent,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: guideBoxAnim.interpolate({
                  inputRange: [0.6, 0.9],
                  outputRange: [0.15, 0.4],
                }),
                shadowRadius: 8,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.guideBoxCorner,
                styles.topLeft,
                { opacity: guideBoxAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.guideBoxCorner,
                styles.topRight,
                { opacity: guideBoxAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.guideBoxCorner,
                styles.bottomLeft,
                { opacity: guideBoxAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.guideBoxCorner,
                styles.bottomRight,
                { opacity: guideBoxAnim },
              ]}
            />
          </Animated.View>
          <View style={styles.maskSide} />
        </View>

        <View style={[styles.controlsContainer, { paddingBottom: Spacing['4xl'] + insets.bottom }]}>
          <View style={styles.instructionContainer}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={c.onAccent}
              style={styles.infoIcon}
            />
            <ThemedText type="bodySm" style={styles.instruction}>
              Position receipt within the box
            </ThemedText>
          </View>

          <View style={styles.controls}>
            {/* Flash Toggle Button */}
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => setIsTorchOn((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={isTorchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            >
              <Ionicons
                name={isTorchOn ? 'flashlight' : 'flashlight-outline'}
                size={26}
                color={c.onAccent}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel="Choose photo from library"
            >
              <Ionicons name="images" size={26} color={c.onAccent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              {loading ? (
                <ActivityIndicator size="large" color={c.onAccent} />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
            >
              <Ionicons name="camera-reverse" size={26} color={c.onAccent} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },
  centeredPaper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: c.background,
  },
  processingContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    maxWidth: 320,
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    ...Elevation.e1,
  },
  processingTitle: {
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  processingSub: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: c.scrim,
  },
  backButton: {
    marginRight: Spacing.lg,
    backgroundColor: c.scrim,
    padding: Spacing.sm,
    borderRadius: Radius.pill,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing['4xl'],
  },
  headerText: {
    color: c.onAccent,
    textAlign: 'center',
  },
  // Dimmed mask around the receipt-aspect guide box
  maskMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskSide: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: c.scrim,
  },
  guideBox: {
    width: '78%',
    aspectRatio: 0.62, // receipt-tall guide box
    maxHeight: '64%',
    borderRadius: Radius.lg,
    position: 'relative',
  },
  guideBoxCorner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: c.accent,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: Radius.lg,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: Radius.lg,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: Radius.lg,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: Radius.lg,
  },
  controlsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    alignItems: 'center',
    backgroundColor: c.scrim,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.scrim,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  infoIcon: {
    marginRight: Spacing.sm,
  },
  instruction: {
    color: c.onAccent,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: c.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: c.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.borderStrong,
    ...Elevation.e2,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: c.accent,
    borderWidth: 3,
    borderColor: c.onAccent,
  },
  permissionActions: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
