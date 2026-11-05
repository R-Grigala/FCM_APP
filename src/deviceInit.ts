import { Platform } from 'react-native';

import { API_BASE_URL, APP_VERSION } from './config';
import { loadDeviceId } from './storage';

const TIMEOUT_MS = 20_000;
const API_ROOT = `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

async function registerOnServer(deviceId: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_ROOT}/devices/`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        language: 'ka',
        app_version: APP_VERSION,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const excerpt = (await response.text()).trim().slice(0, 180);
      throw new Error(
        excerpt
          ? `სერვერმა დააბრუნა ${response.status}: ${excerpt}`
          : `სერვერმა დააბრუნა ${response.status}.`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('სერვერმა პასუხი 20 წამში არ დააბრუნა.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function deviceInit(): Promise<string> {
  const deviceId = await loadDeviceId();
  await registerOnServer(deviceId);
  return deviceId;
}
