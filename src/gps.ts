import * as Location from 'expo-location';

import type { LocationFix } from './types';

export async function readCurrentLocation(): Promise<LocationFix> {
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('ლოკაციის ნებართვა არ არის მიცემული.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    recordedAt: new Date(position.timestamp).toISOString(),
  };
}
