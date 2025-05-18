import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

export function UpdateHandler() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Function to check for updates
  const checkForUpdates = async () => {
    // Skip update checks in development
    if (__DEV__) return;
    
    try {
      setChecking(true);
      setError(null);
      
      console.log('Checking for updates...');
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('Update available!');
        setUpdateAvailable(true);
      } else {
        console.log('No updates available');
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError('Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  // Function to apply the update
  const applyUpdate = async () => {
    try {
      setChecking(true);
      console.log('Downloading update...');
      await Updates.fetchUpdateAsync();
      console.log('Update downloaded, restarting app...');
      // Give UI a moment to show the "Restarting..." state
      setTimeout(() => {
        Updates.reloadAsync();
      }, 1000);
    } catch (err) {
      console.error('Error applying update:', err);
      setError('Failed to apply update');
      setChecking(false);
    }
  };

  // Check for updates when component mounts
  useEffect(() => {
    // Only check for updates in production builds
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  // If there's no update or we're in dev mode, don't render anything
  if (!updateAvailable || __DEV__) {
    return null;
  }

  // Background gradient colors
  const updateButtonGradient = isDark 
    ? ['#3498db', '#2c7db1'] 
    : ['#3498db', '#2980b9'];

  return (
    <View style={styles.container}>
      <View style={[
        styles.updateCard,
        { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
      ]}>
        <Text style={[
          styles.updateText,
          { color: isDark ? '#FFFFFF' : '#333333' }
        ]}>
          {checking 
            ? 'Applying update...' 
            : 'A new version is available!'}
        </Text>
        
        {!checking && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={applyUpdate}
            disabled={checking}
          >
            <LinearGradient
              colors={updateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                Update Now
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  updateCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  updateText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'InterMedium',
  },
  updateButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'InterSemiBold',
  },
  errorText: {
    marginTop: 12,
    color: '#FF5722',
    fontSize: 14,
    textAlign: 'center',
  }
});