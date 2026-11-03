import type { RemoteMessage } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { noticeFromMessage, presentNotice } from './notices';
import type { PushNotice } from './types';

type MessagingModule = typeof import('@react-native-firebase/messaging');

const DEV_BUILD_MESSAGE =
  'FCM ტოკენი ამ გარემოში მიუწვდომელია. დაამატეთ google-services.json (Android) ან GoogleService-Info.plist (iOS) და გაუშვით development build.';

function loadMessaging(): MessagingModule {
  return require('@react-native-firebase/messaging') as MessagingModule;
}

function messagingInstance() {
  const messaging = loadMessaging();
  return { messaging, instance: messaging.getMessaging() };
}

export async function obtainFcmToken(): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error(DEV_BUILD_MESSAGE);
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('შეტყობინებების ნებართვა არ არის მიცემული.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'შეტყობინებები',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1456C0',
    });
  }

  let token = '';
  try {
    const { messaging, instance } = messagingInstance();
    if (Platform.OS === 'ios') {
      await messaging.registerDeviceForRemoteMessages(instance);
    }
    token = (await messaging.getToken(instance)).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const missingNative =
      message.includes('Native module') ||
      message.includes('RNFB') ||
      message.includes('not installed') ||
      message.includes('Cannot find module');
    if (missingNative || message === '') {
      throw new Error(DEV_BUILD_MESSAGE);
    }
    throw error instanceof Error ? error : new Error(DEV_BUILD_MESSAGE);
  }

  if (!token) {
    throw new Error('Firebase-მ ცარიელი ტოკენი დააბრუნა. შეამოწმეთ google-services.json.');
  }
  return token;
}

export function subscribeToPush(onNotice: (notice: PushNotice) => void): () => void {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  let messaging: MessagingModule;
  let instance: ReturnType<MessagingModule['getMessaging']>;
  try {
    const loaded = messagingInstance();
    messaging = loaded.messaging;
    instance = loaded.instance;
  } catch {
    return () => undefined;
  }

  const deliver = (message: RemoteMessage) => {
    onNotice(noticeFromMessage(message));
  };

  const unsubscribeMessage = messaging.onMessage(instance, (message) => {
    const notice = noticeFromMessage(message);
    onNotice(notice);
    void presentNotice(notice);
  });
  const unsubscribeOpened = messaging.onNotificationOpenedApp(instance, deliver);

  void messaging
    .getInitialNotification(instance)
    .then((message) => {
      if (message) {
        deliver(message);
      }
    })
    .catch(() => undefined);

  return () => {
    unsubscribeMessage();
    unsubscribeOpened();
  };
}
