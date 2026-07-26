import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import apiClient from '../utils/apiClient';

const today = new Date().toISOString().split('T')[0];
const getLastNDates = (n) => {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const getRecentMonths = (n) => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.toISOString().substring(0, 7); // YYYY-MM
    const lbl = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    months.push({ label: lbl, value: val });
  }
  return months;
};

export default function ActivityLogScreen() {
  const [mode, setMode] = useState('date'); // 'date' or 'month'
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(getRecentMonths(1)[0].value);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const dates = getLastNDates(14);
  const months = getRecentMonths(6);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const qs = mode === 'date' ? `?date=${selectedDate}` : `?month=${selectedMonth}`;
      const response = await apiClient.get('/dealers/activity-logs' + qs);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (e) {
      console.error('Fetch logs error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [mode, selectedDate, selectedMonth]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tracking Logs</Text>
        <Text style={styles.headerSub}>Date-wise Work History</Text>
      </View>

      <View style={styles.modeTabs}>
        <TouchableOpacity style={[styles.modeTab, mode === 'date' && styles.modeTabActive]} onPress={() => setMode('date')}>
          <Text style={[styles.modeTabText, mode === 'date' && styles.modeTabTextActive]}>ß By Date</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'month' && styles.modeTabActive]} onPress={() => setMode('month')}>
          <Text style={[styles.modeTabText, mode === 'month' && styles.modeTabTextActive]}>📒 By Month</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectorRow}>
        {mode === 'date' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {dates.map(d => (
              <TouchableOpacity key={d} style={[styles.selectorChip, selectedDate === d && styles.selectorChipActive]} onPress={() => setSelectedDate(d)}>
                <Text style={[styles.selectorText, selectedDate === d && styles.selectorTextActive]}>
                  {d === today ? 'Today' : new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {months.map(m => (
              <TouchableOpacity key={m.value} style={[styles.selectorChip, selectedMonth === m.value && styles.selectorChipActive]} onPress={() => setSelectedMonth(m.value)}>
                <Text style={[styles.selectorText, selectedMonth === m.value && styles.selectorTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#CC0000" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No activity logs found for {mode === 'date' ? selectedDate : selectedMonth}.</Text>
          ) : (
            logs.map((log, index) => {
              const dateObj = new Date(log.created_at);
              const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              
              return (
                <View key={log.id || index} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text style={styles.actionText}>{log.action}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.dateText}>{dateStr}</Text>
                      <Text style={styles.timeText}>{timeStr}</Text>
                    </View>
                  </View>
                  {log.details && (
                    <Text style={styles.detailsText}>{log.details}</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: {
    backgroundColor: '#CC0000',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#ffcccc', fontSize: 14, marginTop: 4 },
  modeTabs: { flexDirection: 'row', backgroundColor: 'white', padding: 8, marginHorizontal: 16, marginTop: -15, borderRadius: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeTabActive: { backgroundColor: '#ffe6e6' },
  modeTabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  modeTabTextActive: { color: '#CC0000', fontWeight: 'bold' },
  selectorRow: { paddingVertical: 16 },
  selectorChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  selectorChipActive: { backgroundColor: '#CC0000', borderColor: '#CC0000' },
  selectorText: { fontSize: 14, color: '#666', fontWeight: '500' },
  selectorTextActive: { color: 'white', fontWeight: 'bold' },
  content: { paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 16 },
  logCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#CC0000' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  actionText: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', flex: 1, marginRight: 10 },
  dateText: { fontSize: 13, fontWeight: 'bold', color: '#CC0000' },
  timeText: { fontSize: 12, color: '#888', marginTop: 2 },
  detailsText: { fontSize: 14, color: '#555', lineHeight: 20 },
});
