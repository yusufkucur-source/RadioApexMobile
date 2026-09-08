import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

type AnalyticsParameters = Record<string, string | number | boolean | undefined>;

/** Logs only non-identifying, product-usage events to the native GA4 stream. */
export function trackAnalyticsEvent(name: string, parameters: AnalyticsParameters = {}) {
  if (Platform.OS === 'web') {
    return;
  }

  logEvent(getAnalytics(), name, parameters);
}
