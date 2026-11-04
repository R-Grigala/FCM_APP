import * as Location from 'expo-location';

import type { LocationFix } from './types';

export class LocationPermissionError extends Error {
  constructor(public readonly canAskAgain: boolean) {
    super('ლოკაციის ნებართვა არ არის მიცემული.');
    this.name = 'LocationPermissionError';
  }
}

export async function requestLocationPermission(): Promise<void> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === 'granted') {
    return;
  }

  const result = existing.canAskAgain
    ? await Location.requestForegroundPermissionsAsync()
    : existing;
  if (result.status !== 'granted') {
    throw new LocationPermissionError(result.canAskAgain);
  }
}

export async function readCurrentLocation(): Promise<LocationFix> {
  await requestLocationPermission();

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
