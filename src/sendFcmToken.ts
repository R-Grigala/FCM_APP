import { API_BASE_URL } from './config';

const TIMEOUT_MS = 20_000;
const API_ROOT = `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

type RegisteredFcmToken = {
  id: number;
};

async function request(
  url: string,
  method: 'DELETE' | 'GET' | 'POST',
  body?: unknown,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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

export async function sendFcmToken(deviceId: string, fcmToken: string): Promise<void> {
  await request(
    `${API_ROOT}/devices/${encodeURIComponent(deviceId)}/fcm-tokens/`,
    'POST',
    { fcm_token: fcmToken },
  );
}

export async function disableFcmTokenOnServer(deviceId: string): Promise<void> {
  const response = await request(
    `${API_ROOT}/devices/${encodeURIComponent(deviceId)}/fcm-tokens/`,
    'GET',
  );
  const result = (await response.json()) as { items?: RegisteredFcmToken[] };

  for (const token of result.items ?? []) {
    await request(
      `${API_ROOT}/devices/${encodeURIComponent(deviceId)}/fcm-tokens/${token.id}`,
      'DELETE',
    );
  }
}
