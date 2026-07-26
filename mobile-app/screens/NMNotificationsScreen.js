import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, ActivityIndicator, Alert, StatusBar, RefreshControl
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';

export default function NMNotificationsScreen({ user }) {
  const [history, setHistory] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [networks, setNetworks] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('broadcast'); // broadcast, urgent, network, dealer
  const [targetId, setTargetId] = useState('');

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [histRes, dlRes, netRes] = await Promise.all([
        apiClient.get('/notifications'),
        apiClient.get('/dealers'),
        apiClient.get('/networks')
      ]);

      if (histRes.data.success) setHistory(histRes.data.data);
      if (dlRes.data.success) {
        setDealers(dlRes.data.data.filter(d => d.status === 'active'));
      }
      if (netRes.data.success) setNetworks(netRes.data.data);
    } catch (e) {
      console.error('NM Notifications fetch error:', e);
      Alert.alert('Error', 'Failed to load notifications data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update targetId when type changes
  useEffect(() => {
    if (type === 'dealer' && dealers.length > 0) {
      setTargetId(dealers[0].id.toString());
    } else if (type === 'network' && networks.length > 0) {
      setTargetId(networks[0].id.toString());
    } else {
      setTargetId('');
    }
  }, [type, dealers, networks]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Validation Error', 'Title and Message are required.');
      return;
    }
    
    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetId: (type === 'dealer' || type === 'network') ? parseInt(targetId) : null
      };
      
      const res = await apiClient.post('/notifications', payload);
      if (res.data.success) {
        Alert.alert('Success', `Push notification sent to ${res.data.recipients_count} active devices.`);
        setTitle('');
        setMessage('');
        fetchData(true);
      }
    } catch (e) {
      console.error('Send error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const handleResend = (id) => {
    Alert.alert(
      'Confirm Reminder',
      'Resend this notification to dealers mobile devices now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resend', 
          onPress: async () => {
            try {
              const res = await apiClient.post(`/notifications/${id}/resend`);
              if (res.data.success) {
                Alert.alert('Success', `Reminder sent to ${res.data.recipients_count} devices.`);
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to resend reminder.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#CC0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network Alerts</Text>
        <Text style={styles.headerSub}>Dispatch Push Notifications</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#CC0000']} />}
      >
        {/* Send Alert Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📢 Send Push Alert</Text>
          
          <Text style={styles.label}>Audience Type</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={type} onValueChange={(val) => setType(val)} style={styles.picker}>
              <Picker.Item label="📢 Broadcast (All Active)" value="broadcast" />
              <Picker.Item label="🚨 Urgent Alert (All Active)" value="urgent" />
              <Picker.Item label="🌐 Specific Network" value="network" />
              <Picker.Item label="👤 Specific Dealer" value="dealer" />
            </Picker>
          </View>

          {type === 'network' && (
            <>
              <Text style={styles.label}>Select Network</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={targetId} onValueChange={(val) => setTargetId(val)} style={styles.picker}>
                  {networks.map(n => (
                    <Picker.Item key={n.id} label={n.name} value={n.id.toString()} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          {type === 'dealer' && (
            <>
              <Text style={styles.label}>Select Dealer</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={targetId} onValueChange={(val) => setTargetId(val)} style={styles.picker}>
                  {dealers.map(d => (
                    <Picker.Item key={d.id} label={`${d.dealer_code} - ${d.name}`} value={d.id.toString()} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          <Text style={styles.label}>Title</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Notification Title" 
            value={title} 
            onChangeText={setTitle} 
          />

          <Text style={styles.label}>Message</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            placeholder="Enter alert details..." 
            value={message} 
            onChangeText={setMessage} 
            multiline 
          />

          <TouchableOpacity 
            style={[styles.sendBtn, sending && { backgroundColor: '#e57373' }]} 
            onPress={handleSend}
            disabled={sending}
          >
            <Text style={styles.sendBtnText}>{sending ? 'Sending...' : 'Send Push Notification'}</Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🕰️ Push Logs & History</Text>
          
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No notification history.</Text>
          ) : (
            history.map(item => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyRow}>
                  <View style={[styles.badge, item.type === 'urgent' ? styles.badgeUrgent : item.type === 'broadcast' ? styles.badgeBroadcast : styles.badgeNormal]}>
                    <Text style={styles.badgeText}>{item.type}</Text>
                  </View>
                  <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                </View>
                <Text style={styles.histTitle}>{item.title}</Text>
                <Text style={styles.histMessage}>{item.message}</Text>
                <View style={[styles.historyRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }]}>
                  <Text style={styles.sentBy}>Sent By: {item.sent_by_user}</Text>
                  <TouchableOpacity style={styles.resendBtn} onPress={() => handleResend(item.id)}>
                    <Text style={styles.resendBtnText}>🔄 Reminder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: {
    backgroundColor: '#CC0000', paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 10 },
  pickerContainer: {
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fafafa', overflow: 'hidden'
  },
  picker: { height: 50, width: '100%' },
  input: {
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fafafa',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a2e'
  },
  sendBtn: {
    backgroundColor: '#CC0000', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20
  },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  emptyText: { textAlign: 'center', color: '#999', padding: 20, fontSize: 13 },
  historyItem: {
    borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12, padding: 14, marginBottom: 12
  },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeBroadcast: { backgroundColor: '#e8f5e9' },
  badgeUrgent: { backgroundColor: '#fde8e8' },
  badgeNormal: { backgroundColor: '#fff8e1' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dateText: { fontSize: 11, color: '#888' },
  histTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  histMessage: { fontSize: 13, color: '#555', lineHeight: 18 },
  sentBy: { fontSize: 11, color: '#888', fontStyle: 'italic' },
  resendBtn: { padding: 6 },
  resendBtnText: { color: '#CC0000', fontWeight: '700', fontSize: 12 }
});
