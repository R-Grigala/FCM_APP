import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PushNotice } from './types';

const SERVER_URL_KEY = 'fcm-app.server-url';
const NOTICE_KEY = 'fcm-app.last-notice';

export async function loadServerUrl(): Promise<string> {
  return (await AsyncStorage.getItem(SERVER_URL_KEY)) ?? '';
}

export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url);
}

export async function loadNotice(): Promise<PushNotice | null> {
  const raw = await AsyncStorage.getItem(NOTICE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PushNotice;
    if (typeof parsed.title !== 'string' || typeof parsed.body !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveNotice(notice: PushNotice): Promise<void> {
  await AsyncStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
}
