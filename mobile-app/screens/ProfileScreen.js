import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import apiClient from '../utils/apiClient';

export default function ProfileScreen({ dealer, onLogout, isNM }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const user = dealer;
  const isNetworkManager = isNM || user?.role === 'network_manager';
  const displayName = isNetworkManager ? (user?.username || 'Network Manager') : (user?.name || '—');
  const displayCode = isNetworkManager ? 'Network Manager' : (user?.dealer_code || '—');
  const avatarText = displayCode.substring(0, 2).toUpperCase();

  const handlePasswordChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill in both Current Password and New Password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/settings/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim()
      });

      const res = response.data;
      if (res.success) {
        Alert.alert('Success', 'Your password has been changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        Alert.alert('Failed', res.message || 'Current password was incorrect.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Connection Error',
        error.userFriendlyMessage || 'Failed to connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out from Shiva Honda Reporting System?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{avatarText}</Text>
        </View>
        <Text style={styles.dealerName}>{displayName}</Text>
        <Text style={styles.dealerCode}>
          {isNetworkManager ? '👨‍💼 Network Manager' : `Code: ${displayCode} | ${user?.dealer_type || ''}`}
        </Text>
      </View>

      <View style={styles.content}>
        
        {/* Profile details card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Showroom Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Group</Text>
            <Text style={styles.detailValue}>{dealer.network_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>District</Text>
            <Text style={styles.detailValue}>{dealer.district}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>State</Text>
            <Text style={styles.detailValue}>{dealer.state}</Text>
          </View>
        </View>

        {/* Change password card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Security - Change Password</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Strong Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={handlePasswordChange}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Signout button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
          <Text style={styles.logoutBtnText}>Sign Out Account 👋</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  header: {
    backgroundColor: '#CC0000',
    alignItems: 'center',
    padding: 30,
    paddingTop: 60,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dealerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  dealerCode: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fbfbfb',
  },
  detailLabel: {
    fontSize: 13,
    color: '#777777',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
  },
  actionBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#CC0000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  logoutBtnText: {
    color: '#CC0000',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
