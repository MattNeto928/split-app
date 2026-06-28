import { useEffect } from 'react';
import * as Updates from 'expo-updates';

export function UpdateHandler() {
  useEffect(() => {
    if (__DEV__) return;

    const handleUpdate = async () => {
      try {
        // If this is an emergency launch (fallback to embedded bundle due to crash),
        // skip update check to avoid crash loop
        if (Updates.isEmergencyLaunch) {
          console.log('Emergency launch detected, skipping update check');
          return;
        }

        console.log('Checking for updates...');
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log('Update available, downloading...');
          await Updates.fetchUpdateAsync();
          console.log('Update downloaded, restarting...');
          await Updates.reloadAsync();
        } else {
          console.log('No updates available');
        }
      } catch (err) {
        console.error('Error during OTA update:', err);
      }
    };

    handleUpdate();
  }, []);

  return null;
}
