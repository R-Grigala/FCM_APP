import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';
import { showBackgroundNotice } from './src/notices';

if (Platform.OS !== 'web') {
  try {
    const { getMessaging, setBackgroundMessageHandler } =
      require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
    setBackgroundMessageHandler(getMessaging(), async (message) => {
      await showBackgroundNotice(message);
    });
  } catch (error) {
    console.warn('FCM background handler was not registered.', error);
  }
}

registerRootComponent(App);
