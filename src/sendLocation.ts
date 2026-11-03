import type { LocationPayload } from './types';

const TIMEOUT_MS = 20_000;

export async function sendLocation(serverUrl: string, payload: LocationPayload): Promise<string> {
  const url = serverUrl.trim();
  if (!url) {
    throw new Error('მიუთითეთ სერვერის მისამართი.');
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('მისამართი უნდა იწყებოდეს http:// ან https://-ით.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = (await response.text()).trim();
    const excerpt = text.slice(0, 180);
    if (!response.ok) {
      throw new Error(
        excerpt
          ? `სერვერმა დააბრუნა ${response.status}: ${excerpt}`
          : `სერვერმა დააბრუნა ${response.status}.`,
      );
    }
    return excerpt ? `გაიგზავნა (${response.status}): ${excerpt}` : `გაიგზავნა (${response.status}).`;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('სერვერმა პასუხი 20 წამში არ დააბრუნა.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
