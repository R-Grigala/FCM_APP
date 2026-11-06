export type PushNotice = {
  title: string;
  body: string;
  receivedAt: string;
};

export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
};

export type LocationPayload = {
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
};

export type ReportPayload = {
  device_id: string;
  time_ago: number;
  intensity: 'mild' | 'moderate' | 'severe';
  latitude: number;
  longitude: number;
  accuracy: number | null;
};
