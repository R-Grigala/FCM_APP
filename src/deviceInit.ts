import { Platform } from 'react-native';

import { API_BASE_URL, APP_VERSION } from './config';
import { loadDeviceId } from './storage';

const TIMEOUT_MS = 20_000;
const API_ROOT = `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

async function requestDevice(
  deviceId: string,
  method: 'GET' | 'POST',
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = method === 'GET'
      ? `${API_ROOT}/devices/${encodeURIComponent(deviceId)}`
      : `${API_ROOT}/devices/`;
    const response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(method === 'POST'
        ? {
            body: JSON.stringify({
              device_id: deviceId,
              platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
              language: 'ka',
              app_version: APP_VERSION,
            }),
          }
        : {}),
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('სერვერმა პასუხი 20 წამში არ დააბრუნა.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function throwForFailedResponse(response: Response): Promise<never> {
  const excerpt = (await response.text()).trim().slice(0, 180);
  throw new Error(
    excerpt
      ? `სერვერმა დააბრუნა ${response.status}: ${excerpt}`
      : `სერვერმა დააბრუნა ${response.status}.`,
  );
}

export async function deviceInit(): Promise<string> {
  const deviceId = await loadDeviceId();
  const existing = await requestDevice(deviceId, 'GET');
  if (existing.ok) {
    return deviceId;
  }
  if (existing.status !== 404) {
    await throwForFailedResponse(existing);
  }

  const registered = await requestDevice(deviceId, 'POST');
  if (!registered.ok) {
    await throwForFailedResponse(registered);
  }
  return deviceId;
}
