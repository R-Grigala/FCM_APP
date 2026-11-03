import type { RemoteMessage } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushNotice } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function textField(data: RemoteMessage['data'], key: string): string {
  const value = data?.[key];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

export function noticeFromMessage(message: RemoteMessage): PushNotice {
  const title =
    message.notification?.title?.trim() ||
    textField(message.data, 'title') ||
    'სათაურის გარეშე';
  const body =
    message.notification?.body?.trim() ||
    textField(message.data, 'body') ||
    textField(message.data, 'message');

  return {
    title,
    body,
    receivedAt: new Date(message.sentTime ?? Date.now()).toLocaleString('ka-GE'),
  };
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'შეტყობინებები',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1456C0',
  });
}

export async function presentNotice(notice: PushNotice): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notice.title,
      body: notice.body,
      sound: true,
    },
    trigger: null,
  });
}

export async function showBackgroundNotice(message: RemoteMessage): Promise<void> {
  if (message.notification) {
    return;
  }

  const notice = noticeFromMessage(message);
  if (!notice.body && notice.title === 'სათაურის გარეშე') {
    return;
  }

  await presentNotice(notice);
}
