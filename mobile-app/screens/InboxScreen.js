import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from 'react-native';
import apiClient from '../utils/apiClient';
import * as DocumentPicker from 'expo-document-picker';

export default function InboxScreen({ dealer }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const notifRes = await apiClient.get('/notifications');
      if (notifRes.data.success) {
        setNotifications(notifRes.data.data);
      }
    } catch (e) {
      console.error('Inbox fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox & Communications</Text>
      </View>


      {loading ? (
        <ActivityIndicator color="#CC0000" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          <View>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications.</Text>
            ) : (
              notifications.map((item, idx) => (
                <View key={item.id || idx} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.badge, item.type === 'urgent' && { backgroundColor: '#ffe6e6', color: '#CC0000' }]}>
                      {item.type.toUpperCase()}
                    </Text>
                    <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  header: {
    backgroundColor: '#CC0000',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tabToggle: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#CC0000',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#e6f2ff',
    color: '#0066cc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  actionBtn: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});
