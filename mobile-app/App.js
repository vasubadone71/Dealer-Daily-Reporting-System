import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, StatusBar, LogBox, Linking } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported'
]);

import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import LoginScreen from './screens/LoginScreen';
import MainNavigator from './screens/MainNavigator';
import apiClient from './utils/apiClient';
import { API_BASE_URL } from './config';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Read the current app version from app.json via expo-constants
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isServerHealthy, setIsServerHealthy] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Version check state
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    checkServerAndSession();
  }, []);

  const checkServerAndSession = async () => {
    setLoading(true);
    try {
      console.log(`[App] Verifying API Server health at: ${API_BASE_URL}`);
      const response = await apiClient.get('/health');
      if (response.data && response.data.status === 'ok') {
        console.log('[App] API Server is healthy and running.');
        setIsServerHealthy(true);
      } else {
        setIsServerHealthy(true);
      }

      // ── Version Check ────────────────────────────────────────────
      try {
        console.log(`[App] Checking version compatibility. Current: ${CURRENT_VERSION}`);
        const versionRes = await apiClient.get(`/app/version?version=${CURRENT_VERSION}`);
        if (versionRes.data.success) {
          const vd = versionRes.data.data;
          console.log(`[App] Version check: needs_update=${vd.needs_update}, minimum=${vd.minimum_version}`);
          if (vd.needs_update) {
            setUpdateInfo(vd);
            setUpdateRequired(true);
            setLoading(false);
            try { await SplashScreen.hideAsync(); } catch (_) {}
            return; // Stop initialization — show force update screen
          }
        }
      } catch (vErr) {
        // Version check failure is non-fatal — app continues normally
        console.warn('[App] Version check failed (non-fatal):', vErr.message);
      }
      // ─────────────────────────────────────────────────────────────

      // Restore session
      const savedUser = await AsyncStorage.getItem('user');
      const savedDealer = await AsyncStorage.getItem('dealer');
      const token = await AsyncStorage.getItem('token');

      if (token) {
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else if (savedDealer) {
          const dealerObj = JSON.parse(savedDealer);
          const unifiedUser = { ...dealerObj, role: dealerObj.role || 'dealer', type: 'dealer' };
          await AsyncStorage.setItem('user', JSON.stringify(unifiedUser));
          setUser(unifiedUser);
        }
      }
    } catch (e) {
      console.warn('[App] Health check failed:', e.userFriendlyMessage || e.message);
      setIsServerHealthy(false);
      setErrorMessage(e.userFriendlyMessage || 'Unable to connect to Shiva Honda reporting server.');
    } finally {
      setLoading(false);
      try { await SplashScreen.hideAsync(); } catch (_) {}
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'dealer', 'token']);
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // ── Force Update Screen ──────────────────────────────────────────
  if (updateRequired && updateInfo) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
        <View style={styles.updateContainer}>
          <View style={styles.updateIconBg}>
            <Text style={styles.updateIcon}>🚀</Text>
          </View>
          <Text style={styles.updateTitle}>Update Required</Text>
          <Text style={styles.updateVersion}>
            Your Version: <Text style={styles.versionBad}>v{updateInfo.current_version}</Text>
          </Text>
          <Text style={styles.updateVersion}>
            Latest Version: <Text style={styles.versionGood}>v{updateInfo.latest_version}</Text>
          </Text>
          <View style={styles.updateMsgBox}>
            <Text style={styles.updateMsg}>{updateInfo.update_message}</Text>
          </View>
          {updateInfo.update_url ? (
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => Linking.openURL(updateInfo.update_url)}
            >
              <Text style={styles.updateBtnText}>Download Update ↗</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.updateBtn, { backgroundColor: '#555' }]}>
              <Text style={styles.updateBtnText}>Contact your administrator for the latest APK.</Text>
            </View>
          )}
        </View>
      </SafeAreaProvider>
    );
  }
  // ────────────────────────────────────────────────────────────────

  if (isServerHealthy === false) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Server Offline</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <View style={styles.configBox}>
            <Text style={styles.configLabel}>Configured Endpoint:</Text>
            <Text style={styles.configUrl}>{API_BASE_URL}</Text>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={checkServerAndSession}>
            <Text style={styles.retryBtnText}>Retry Connection 🔄</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#CC0000" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {user ? (
        <MainNavigator user={user} dealer={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },

  // ── Force Update Screen styles ──
  updateContainer: {
    flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  updateIconBg: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff3cd',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: '#f39c12', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  updateIcon: { fontSize: 48 },
  updateTitle: { fontSize: 26, fontWeight: '900', color: '#1a1a2e', marginBottom: 12 },
  updateVersion: { fontSize: 13, color: '#555', marginBottom: 4 },
  versionBad: { color: '#CC0000', fontWeight: '800' },
  versionGood: { color: '#27ae60', fontWeight: '800' },
  updateMsgBox: {
    backgroundColor: '#f4f6f9', borderRadius: 14, padding: 16, marginVertical: 24,
    width: '100%', borderLeftWidth: 4, borderLeftColor: '#CC0000',
  },
  updateMsg: { fontSize: 14, color: '#333', lineHeight: 22, textAlign: 'center' },
  updateBtn: {
    backgroundColor: '#CC0000', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    width: '100%', alignItems: 'center',
    shadowColor: '#CC0000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Server Offline Screen styles ──
  errorContainer: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 30 },
  badgeContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ffebe9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  badgeIcon: { fontSize: 32 },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 10 },
  errorMessage: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  configBox: { backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e2e5ec', borderRadius: 12, padding: 14, width: '100%', marginBottom: 40, alignItems: 'center' },
  configLabel: { fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  configUrl: { fontSize: 13, color: '#1a1a2e', fontWeight: '700' },
  retryBtn: { backgroundColor: '#CC0000', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, shadowColor: '#CC0000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  retryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});
