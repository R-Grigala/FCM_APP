import type { ReportPayload } from './types';
import { API_BASE_URL } from './config';

const TIMEOUT_MS = 20_000;
const API_ROOT = `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

async function request(url: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

export async function sendReport(payload: ReportPayload): Promise<string> {
  const body = {
    intensity: payload.intensity.toUpperCase(),
    time_ago: payload.time_ago,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy
  };
  const response = await request(
    `${API_ROOT}/devices/${encodeURIComponent(payload.device_id)}/felt-report/`,
    body,
  );
  const responseText = await response.text();
  let reportId: string | number | undefined;
  try {
    const result: { id?: unknown; report_id?: unknown } = JSON.parse(responseText);
    if (typeof result.report_id === 'string' || typeof result.report_id === 'number') {
      reportId = result.report_id;
    } else if (typeof result.id === 'string' || typeof result.id === 'number') {
      reportId = result.id;
    }
  } catch {
    // Keep success handling compatible with servers that return an empty/non-JSON body.
  }

  return reportId
    ? `რეპორტი გაიგზავნა (${response.status}); ID: ${reportId}.`
    : `რეპორტი გაიგზავნა (${response.status}).`;
}
