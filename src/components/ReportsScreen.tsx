import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { readCurrentLocation } from '../gps';
import { deviceInit } from '../deviceInit';
import { sendReport } from '../sendReport';
import type { LocationFix } from '../types';

type TimeAgo = '2 წუთზე ნაკლები' | '5 წუთზე ნაკლები' | '30 წუთზე ნაკლები';
type Intensity = 'mild' | 'moderate' | 'severe';
type SavedReport = { timeAgo: TimeAgo; intensity: Intensity; location: LocationFix; savedAt: string };

const REPORT_KEY = 'fcm-app.last-report';
const timeOptions: TimeAgo[] = ['2 წუთზე ნაკლები', '5 წუთზე ნაკლები', '30 წუთზე ნაკლები'];
const timeAgoMinutes: Record<TimeAgo, number> = {
  '2 წუთზე ნაკლები': 2,
  '5 წუთზე ნაკლები': 5,
  '30 წუთზე ნაკლები': 30,
};
const intensityOptions: { value: Intensity; title: string; image: number }[] = [
  { value: 'mild', title: 'მსუბუქი', image: require('../../assets/images/mild.png') },
  { value: 'moderate', title: 'საშუალო', image: require('../../assets/images/moderate.png') },
  { value: 'severe', title: 'ძლიერი', image: require('../../assets/images/severe.png') },
];

function formatLocation(location: LocationFix): string {
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

export default function ReportsScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPadding = windowWidth >= 600 ? 28 : 16;
  const cardPadding = windowWidth >= 600 ? 20 : 16;
  const contentWidth = Math.min(windowWidth, 720);
  const fallbackCarouselWidth = contentWidth - (horizontalPadding * 2) - (cardPadding * 2);
  const [carouselWidth, setCarouselWidth] = useState(fallbackCarouselWidth);
  const [timeAgo, setTimeAgo] = useState<TimeAgo>('2 წუთზე ნაკლები');
  const [intensity, setIntensity] = useState<Intensity>('mild');
  const [intensityIndex, setIntensityIndex] = useState(0);
  const [location, setLocation] = useState<LocationFix | null>(null);
  const [lastReport, setLastReport] = useState<SavedReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(REPORT_KEY).then((raw) => {
      if (!raw) return;
      try {
        setLastReport(JSON.parse(raw) as SavedReport);
      } catch {
        // Ignore an invalid previous report.
      }
    });
  }, []);

  const getLocation = useCallback(async () => {
    setError(null);
    try {
      setLocation(await readCurrentLocation());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ლოკაციის მიღება ვერ მოხერხდა.');
    }
  }, []);

  useEffect(() => {
    void getLocation();
  }, [getLocation]);

  const saveReport = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const currentLocation = location ?? (await readCurrentLocation());
      setLocation(currentLocation);
      const deviceId = await deviceInit();
      const serverMessage = await sendReport({
        device_id: deviceId,
        time_ago: timeAgoMinutes[timeAgo],
        intensity,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      });
      const report: SavedReport = {
        timeAgo,
        intensity,
        location: currentLocation,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(REPORT_KEY, JSON.stringify(report));
      setLastReport(report);
      setMessage(`${serverMessage} გმადლობთ გაზიარებისთვის.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'შეტყობინების შენახვა ვერ მოხერხდა.');
    } finally {
      setSaving(false);
    }
  }, [intensity, location, timeAgo]);

  const selectIntensity = useCallback((index: number) => {
    setIntensityIndex(index);
    setIntensity(intensityOptions[index].value);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <Text style={styles.heading}>მიწისძვრის რეპორტი</Text>
          <Text style={styles.lead}>მოგვწერე, როდის და რამდენად ძლიერად იგრძენი ბიძგები.</Text>

          <View style={[styles.card, { padding: cardPadding }]}>
            <Text style={styles.cardTitle}>რა დრო გავიდა რაც იგრძენი მიწისძვრა?</Text>
            <View style={styles.timeOptionsRow}>
              {timeOptions.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: timeAgo === option }}
                  onPress={() => setTimeAgo(option)}
                  style={[styles.timeOption, timeAgo === option && styles.selectedOption]}
                >
                  <Text style={[styles.timeText, timeAgo === option && styles.selectedText]}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, { padding: cardPadding }]}>
            <View style={styles.selectionHeader}>
              <Text style={styles.cardTitle}>როგორი იყო შენი შეგრძნება?</Text>
              <Text style={styles.counter}>{intensityIndex + 1} / {intensityOptions.length}</Text>
            </View>
            <ScrollView
              horizontal
              pagingEnabled
              style={styles.carousel}
              onLayout={(event) => {
                const measuredWidth = event.nativeEvent.layout.width;
                if (measuredWidth > 0 && Math.abs(measuredWidth - carouselWidth) > 1) {
                  setCarouselWidth(measuredWidth);
                }
              }}
              showsHorizontalScrollIndicator={false}
              snapToInterval={carouselWidth}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
                selectIntensity(Math.max(0, Math.min(nextIndex, intensityOptions.length - 1)));
              }}
            >
              {intensityOptions.map((option, index) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: intensity === option.value }}
                  onPress={() => selectIntensity(index)}
                  style={[styles.intensityOption, { width: carouselWidth }, intensity === option.value && styles.selectedIntensity]}
                >
                  <Text style={styles.intensityTitle}>{option.title}</Text>
                  <Image source={option.image} style={styles.intensityImage} resizeMode="contain" />
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {intensityOptions.map((option, index) => (
                <View key={option.value} style={[styles.dot, index === intensityIndex && styles.activeDot]} />
              ))}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
          <Pressable onPress={() => void saveReport()} style={({ pressed }) => [styles.button, pressed && styles.pressed]} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Submit — გაგზავნა</Text>}
          </Pressable>

          {lastReport ? (
            <View style={styles.lastReport}>
              <Text style={styles.lastReportTitle}>ბოლო რეპორტი</Text>
              <Text style={styles.meta}>{lastReport.timeAgo} · {intensityOptions.find((item) => item.value === lastReport.intensity)?.title}</Text>
              <Text style={styles.meta}>ლოკაცია: {formatLocation(lastReport.location)}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF3F8' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingVertical: 20, gap: 14 },
  heading: { fontSize: 28, fontWeight: '700', color: '#102033' },
  lead: { color: '#5E7088', fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#D9E2EC' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#102033' },
  meta: { color: '#5E7088', fontSize: 13, lineHeight: 18 },
  timeOptionsRow: { flexDirection: 'row', gap: 8 },
  timeOption: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6 },
  selectedOption: { backgroundColor: '#E7EEF6', borderColor: '#0F4C81' },
  timeText: { color: '#41556D', fontSize: 13, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  selectedText: { color: '#0F4C81' },
  carousel: { width: '100%' },
  carouselContent: { flexGrow: 0 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  counter: { color: '#6B7D92', fontSize: 13, fontWeight: '700' },
  intensityOption: { alignItems: 'center', gap: 0, paddingTop: 0, borderWidth: 2, borderColor: '#D9E2EC', borderRadius: 16, overflow: 'hidden' },
  selectedIntensity: { borderColor: '#0F4C81', backgroundColor: '#F2F7FC' },
  intensityImage: { width: '100%', aspectRatio: 1194 / 1317, backgroundColor: '#F2F6FA' },
  intensityTitle: { width: '100%', paddingVertical: 12, color: '#102033', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C4D0DD' },
  activeDot: { width: 20, backgroundColor: '#0F4C81' },
  button: { backgroundColor: '#0F4C81', borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  error: { color: '#A32020', fontSize: 14, lineHeight: 20 },
  success: { color: '#0F7A45', fontSize: 14, lineHeight: 20 },
  lastReport: { backgroundColor: '#E8F4ED', borderRadius: 14, padding: 14, gap: 4 },
  lastReportTitle: { color: '#0F7A45', fontSize: 15, fontWeight: '700' },
});
