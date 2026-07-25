import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

const getApiUrl = () => {
  const isProd = !__DEV__;
  if (isProd) {
    // ← This is the URL your APK will use in production.
    // This must match the domain you set in your Caddyfile on the VPS.
    return 'https://dms.badonemotors.cloud/api';
  }

  // 1. Android Emulator check:
  if (Platform.OS === 'android' && !Device.isDevice) {
    console.log('[Config] Android Emulator detected. Routing via loopback alias 10.0.2.2');
    return 'http://10.0.2.2:5000/api';
  }

  // 2. Physical Device (Expo Go) check:
  // If you are using a physical phone, it MUST connect via your PC's Wi-Fi IP address.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    console.log(`[Config] Physical Device detected. Routing via PC IP: ${ip}`);
    return `http://${ip}:5000/api`;
  }

  // 3. Fallback to standard localhost for iOS Simulator/Web
  console.log('[Config] Defaulting to localhost API route.');
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiUrl();
console.log(`[Config] API Base URL resolved: ${API_BASE_URL}`);
