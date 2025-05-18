import { StyleSheet, TouchableOpacity, Animated, View, Dimensions, ScrollView, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSplitContext } from '@/contexts/SplitContext';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { clearResettingFlag } = useSplitContext();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(20)).current;

  const handleStartSplitting = () => {
    console.log("!!! handleStartSplitting called !!!");
    clearResettingFlag();
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(() => {
      router.push('/split/people');
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const isDark = colorScheme === 'dark';
  
  const primaryGradient = isDark 
    ? ['#2c7db1', '#3498db'] as const
    : ['#3498db', '#2980b9'] as const;
    
  const backgroundGradient = isDark
    ? ['#121212', '#1a1a1a'] as const
    : ['#ffffff', '#f7f9fc'] as const;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={backgroundGradient}
        style={styles.background}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.mainContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }]
            }
          ]}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              <Image 
                source={require('@/assets/images/split-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <ThemedText type="title" style={styles.title}>Split</ThemedText>
          </View>
          
          <View style={styles.contentContainer}>
            <ThemedText style={styles.description}>
              Easily split restaurant checks with your friends. Just take a photo and we'll handle the rest.
            </ThemedText>

            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
              <TouchableOpacity 
                style={styles.startButton}
                onPress={handleStartSplitting}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                >
                  <ThemedText style={styles.buttonText}>Start Splitting</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          <View style={styles.featureSection}>
            <ThemedText type="subtitle" style={styles.featureTitle}>How it works</ThemedText>
            
            <View style={styles.featuresList}>
              <View style={styles.feature}>
                <View style={[styles.featureIconContainer, styles.iconOne]}>
                  <Ionicons name="people" size={24} color="#ffffff" />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="defaultSemiBold">1. Add people</ThemedText>
                  <ThemedText style={styles.featureDescription}>Add everyone at the table who should split the bill</ThemedText>
                </View>
              </View>
              
              <View style={styles.feature}>
                <View style={[styles.featureIconContainer, styles.iconTwo]}>
                  <Ionicons name="camera" size={24} color="#ffffff" />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="defaultSemiBold">2. Scan your check</ThemedText>
                  <ThemedText style={styles.featureDescription}>Take a photo of the receipt</ThemedText>
                </View>
              </View>
              
              <View style={styles.feature}>
                <View style={[styles.featureIconContainer, styles.iconThree]}>
                  <Ionicons name="calculator" size={24} color="#ffffff" />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="defaultSemiBold">3. See the split</ThemedText>
                  <ThemedText style={styles.featureDescription}>We'll calculate exactly how much each person owes</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80, // Increased to prevent text cutoff across devices
    paddingBottom: 40,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#3498db',
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
  },
  startButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  featureSection: {
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresList: {
    gap: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconOne: {
    backgroundColor: '#3498db',
  },
  iconTwo: {
    backgroundColor: '#e74c3c',
  },
  iconThree: {
    backgroundColor: '#2ecc71',
  },
  featureContent: {
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
});
