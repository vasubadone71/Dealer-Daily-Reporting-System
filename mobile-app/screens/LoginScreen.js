import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import apiClient from '../utils/apiClient';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your Username / Dealer Code and Password.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = Device.modelId || Device.designName || 'mobile-device-' + Math.random().toString(36).substring(3, 10);
      const deviceName = `${Device.brand || 'Generic'} ${Device.modelName || 'Mobile'}`;
      const pushToken = await registerForPushNotificationsAsync();

      const response = await apiClient.post('/auth/login/mobile', {
        username: username.trim(),
        password: password,
        deviceId,
        pushToken,
        deviceName,
      });

      const data = response.data;

      if (data.success) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        // Keep legacy 'dealer' key for backward compat with existing screens
        if (data.role === 'dealer') {
          await AsyncStorage.setItem('dealer', JSON.stringify(data.user));
        } else {
          await AsyncStorage.removeItem('dealer');
        }
        onLogin(data.user);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      const serverMessage = error.response?.data?.message;
      Alert.alert(
        'Login Error',
        serverMessage || error.userFriendlyMessage || 'Cannot connect to the server. Please check your network connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <Text style={styles.companyName}>My Shiva Honda</Text>
          <Text style={styles.tagline}>Dealer Daily Reporting System</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>Enter your Dealer Code or Network Manager username</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username / Dealer Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MP430001 or NETWORK"
              placeholderTextColor="#aaaaaa"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#aaaaaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Secure Sign In →</Text>
            )}
          </TouchableOpacity>

          {/* Role hint pills */}
          <View style={styles.roleHints}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>👤 Dealer</Text>
            </View>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>👨‍💼 Network Manager</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Contact Shiva support to reset credentials.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#CC0000' },
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  companyName: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 24,
    padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#888888', marginBottom: 24 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#444444', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1a1a2e', backgroundColor: '#fafafa',
  },
  loginBtn: {
    backgroundColor: '#CC0000', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#CC0000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  roleHints: { flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'center' },
  roleChip: {
    backgroundColor: '#f8f8f8', borderRadius: 20, borderWidth: 1,
    borderColor: '#eee', paddingHorizontal: 14, paddingVertical: 6,
  },
  roleChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  footer: { marginTop: 32, color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },
});
