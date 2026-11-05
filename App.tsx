import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import {
  getNotificationPermission,
  obtainFcmToken,
  subscribeToPush,
} from './src/fcm';
import { readCurrentLocation } from './src/gps';
import { registerDevice, sendLocation, updateLocationSharing } from './src/sendLocation';
import { APP_VERSION } from './src/config';
import {
  isLocationSharingPending,
  loadDeviceId,
  loadLocationSharing,
  loadNotice,
  loadPushNotificationsEnabled,
  savePushNotificationsEnabled,
  saveNotice,
  setLocationSharingPending,
} from './src/storage';
import type { LocationFix, PushNotice } from './src/types';

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export default function App() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [location, setLocation] = useState<LocationFix | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [notice, setNotice] = useState<PushNotice | null>(null);
  const [sharingEnabled, setSharingEnabled] = useState(false);

  const syncSharingStatus = useCallback(async (
    enabled: boolean,
    id: string,
  ) => {
    await registerDevice({
      device_id: id,
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
      language: 'ka',
      app_version: APP_VERSION,
    });
    await updateLocationSharing(id, enabled);
    await setLocationSharingPending(false);
  }, []);

  const refreshToken = useCallback(async () => {
    setTokenLoading(true);
    setTokenError(null);
    setCopied(false);
    try {
      const [permission, savedPreference] = await Promise.all([
        getNotificationPermission(),
        loadPushNotificationsEnabled(),
      ]);
      const pushEnabled = savedPreference ?? permission.granted;
      if (savedPreference === null) {
        await savePushNotificationsEnabled(pushEnabled);
      }
      const enabled = pushEnabled && permission.granted;
      if (!enabled) {
        setFcmToken(null);
        setTokenError(
          pushEnabled
            ? 'შეტყობინებების სისტემური ნებართვა გამორთულია.'
            : 'Push შეტყობინებები გამორთულია. ჩასართავად გამოიყენეთ გადამრთველი.',
        );
        return;
      }
      setFcmToken(await obtainFcmToken());
    } catch (error) {
      setFcmToken(null);
      setTokenError(errorText(error, 'FCM ტოკენი ვერ მივიღე.'));
    } finally {
      setTokenLoading(false);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      setLocation(await readCurrentLocation());
    } catch (error) {
      setLocation(null);
      setLocationError(errorText(error, 'ლოკაცია ვერ მივიღე.'));
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const updateAndSendLocation = useCallback(async () => {
    if (!(await loadLocationSharing())) {
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    setSendError(null);
    setSendMessage(null);
    try {
      const fix = await readCurrentLocation();
      setLocation(fix);
      const deviceId = await loadDeviceId();
      await registerDevice({
        device_id: deviceId,
        ...(fcmToken ? { push_token: fcmToken } : {}),
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        language: 'ka',
        app_version: APP_VERSION,
      });
      await updateLocationSharing(deviceId, true);
      await setLocationSharingPending(false);
      const result = await sendLocation({
        device_id: deviceId,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        recorded_at: fix.recordedAt,
      });
      setSendMessage(result);
    } catch (error) {
      const message = errorText(error, 'ლოკაციის მიღება ან სერვერზე გაგზავნა ვერ მოხერხდა.');
      setLocationError(message);
      setSendError(message);
    } finally {
      setLocationLoading(false);
    }
  }, [fcmToken]);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let active = true;
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshToken();
        void updateAndSendLocation();
      }
    });

    void (async () => {
      const [savedNotice, savedSharing, savedDeviceId, pending] = await Promise.all([
        loadNotice(),
        loadLocationSharing(),
        loadDeviceId(),
        isLocationSharingPending(),
      ]);
      if (!active) {
        return;
      }
      if (savedNotice) {
        setNotice(savedNotice);
      }
      if (pending) {
        try {
          await syncSharingStatus(savedSharing, savedDeviceId);
        } catch {
          // Keep the pending flag so the settings screen can retry later.
        }
      }
      unsubscribe = subscribeToPush((incoming) => {
        setNotice(incoming);
        void saveNotice(incoming);
      });
    })();

    void refreshToken();
    void updateAndSendLocation();
    return () => {
      active = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [refreshToken, syncSharingStatus, updateAndSendLocation]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadLocationSharing().then((enabled) => {
      if (!active) return;
      setSharingEnabled(enabled);
      if (enabled) {
        void refreshLocation();
      } else {
        setLocation(null);
        setLocationError(null);
      }
    });
    void refreshToken();
    return () => {
      active = false;
    };
  }, [refreshLocation, refreshToken]));

  const copyToken = useCallback(async () => {
    if (!fcmToken) {
      return;
    }
    await Clipboard.setStringAsync(fcmToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fcmToken]);

  const submitLocation = useCallback(async () => {
    if (!sharingEnabled) {
      setSendError('ლოკაციის გასაგზავნად ჯერ ჩართეთ გაზიარება.');
      setSendMessage(null);
      return;
    }
    if (!location) {
      setSendError('ჯერ საჭიროა ლოკაცია.');
      setSendMessage(null);
      return;
    }

    setSending(true);
    setSendError(null);
    setSendMessage(null);
    try {
      const deviceId = await loadDeviceId();
      await registerDevice({
        device_id: deviceId,
        ...(fcmToken ? { push_token: fcmToken } : {}),
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        language: 'ka',
        app_version: APP_VERSION,
      });
      const result = await sendLocation({
        device_id: deviceId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        recorded_at: location.recordedAt,
      });
      setSendMessage(result);
    } catch (error) {
      setSendError(errorText(error, 'გაგზავნა ვერ მოხერხდა.'));
    } finally {
      setSending(false);
    }
  }, [fcmToken, location, sharingEnabled]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>FCM და ლოკაცია</Text>
          <Text style={styles.lead}>
            ტოკენის კოპირება, GPS კოორდინატები და სერვერიდან მოსული შეტყობინება.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>FCM Token</Text>
            {tokenLoading ? (
              <ActivityIndicator color="#0F4C81" />
            ) : (
              <Text selectable style={styles.token}>
                {fcmToken ?? 'ტოკენი ჯერ არ არის'}
              </Text>
            )}
            {tokenError ? <Text style={styles.error}>{tokenError}</Text> : null}
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  !fcmToken && styles.buttonDisabled,
                  pressed && fcmToken && styles.buttonPressed,
                ]}
                onPress={() => void copyToken()}
                disabled={!fcmToken}
              >
                <Text style={styles.buttonText}>{copied ? 'დაკოპირდა' : 'კოპირება'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={() => void refreshToken()}
              >
                <Text style={styles.secondaryButtonText}>განახლება</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>GPS ლოკაცია</Text>
            {locationLoading ? <ActivityIndicator color="#0F4C81" /> : null}
            <Text style={styles.label}>Latitude</Text>
            <Text style={styles.value}>
              {location ? formatCoordinate(location.latitude) : '—'}
            </Text>
            <Text style={styles.label}>Longitude</Text>
            <Text style={styles.value}>
              {location ? formatCoordinate(location.longitude) : '—'}
            </Text>
            <Text style={styles.meta}>
              {location?.accuracy != null
                ? `სიზუსტე: ${Math.round(location.accuracy)} მ`
                : 'სიზუსტე უცნობია'}
            </Text>
            {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                (!sharingEnabled || locationLoading) && styles.buttonDisabled,
                pressed && sharingEnabled && styles.buttonPressed,
              ]}
              onPress={() => void refreshLocation()}
              disabled={!sharingEnabled || locationLoading}
            >
              <Text style={styles.buttonText}>ლოკაციის მიღება</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>სერვერზე გაგზავნა</Text>
            <Text style={styles.meta}>
              მოწყობილობა რეგისტრირდება, შემდეგ კი მისი კოორდინატები სერვერს ეგზავნება.
            </Text>
            {sendMessage ? <Text style={styles.success}>{sendMessage}</Text> : null}
            {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                (sending || pressed) && styles.buttonPressed,
                (sending || !sharingEnabled) && styles.buttonDisabled,
              ]}
              onPress={() => void submitLocation()}
              disabled={sending || !sharingEnabled}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>გაგზავნა</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Push Notification</Text>
            <Text style={styles.label}>სათაური</Text>
            <Text style={styles.value}>{notice?.title ?? 'შეტყობინება ჯერ არ მოსულა'}</Text>
            <Text style={styles.label}>ტექსტი</Text>
            <Text style={styles.value}>{notice?.body || '—'}</Text>
            {notice ? <Text style={styles.meta}>{notice.receivedAt}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#102033',
  },
  lead: {
    color: '#5E7088',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D9E2EC',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#102033',
  },
  token: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: '#102033',
  },
  label: {
    color: '#5E7088',
    fontSize: 13,
  },
  value: {
    color: '#102033',
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    color: '#5E7088',
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#0F4C81',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  secondaryButton: {
    backgroundColor: '#E7EEF6',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0F4C81',
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: '#A32020',
    fontSize: 14,
    lineHeight: 20,
  },
  success: {
    color: '#0F7A45',
    fontSize: 14,
    lineHeight: 20,
  },
});
