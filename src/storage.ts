import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PushNotice } from './types';

const NOTICE_KEY = 'fcm-app.last-notice';
const DEVICE_ID_KEY = 'fcm-app.device-id';
const LOCATION_SHARING_KEY = 'fcm-app.location-sharing';
const LOCATION_SHARING_PENDING_KEY = 'fcm-app.location-sharing-pending';
const PUSH_NOTIFICATIONS_KEY = 'fcm-app.push-notifications';

function createDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export async function loadDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const deviceId = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export async function loadLocationSharing(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOCATION_SHARING_KEY)) === 'true';
}

export async function saveLocationSharing(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCATION_SHARING_KEY, String(enabled));
}

export async function isLocationSharingPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOCATION_SHARING_PENDING_KEY)) === 'true';
}

export async function setLocationSharingPending(pending: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCATION_SHARING_PENDING_KEY, String(pending));
}

export async function loadPushNotificationsEnabled(): Promise<boolean | null> {
  const value = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_KEY);
  return value === null ? null : value === 'true';
}

export async function savePushNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, String(enabled));
}

export async function arePushNotificationsEnabled(): Promise<boolean> {
  return (await loadPushNotificationsEnabled()) !== false;
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
