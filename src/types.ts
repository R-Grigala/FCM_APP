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
  fcmToken: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
};
