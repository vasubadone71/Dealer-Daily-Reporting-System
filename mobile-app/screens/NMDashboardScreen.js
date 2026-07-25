import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, TouchableOpacity,
  RefreshControl, Platform
} from 'react-native';
import apiClient from '../utils/apiClient';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function DateSelector({ selectedDate, onSelect }) {
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d);
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={{ padding: 10, gap: 8 }}>
      {dates.map((d, i) => {
        const val = formatDate(d);
        const isToday = formatDate(new Date()) === val;
        const active = selectedDate === val;
        const label = i === 0 ? 'Today' : `${d.getDate()}/${d.getMonth()+1}`;
        return (
          <TouchableOpacity
            key={val}
            style={[styles.datePill, active && styles.datePillActive]}
            onPress={() => onSelect(val)}
          >
            <Text style={[styles.datePillText, active && styles.datePillTextActive]}>
              {val === formatDate(new Date()) ? 'Today' : `${d.getDate()} ${d.toLocaleString('default', {month:'short'})}`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function NMDashboardScreen({ user }) {
  const today = formatDate(new Date());
  const [stats, setStats] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const pollRef = useRef(null);

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      // Always fetch today's dashboard stats (for summary cards)
      const [dashRes, dealerRes] = await Promise.all([
        apiClient.get('/reports/dashboard'),
        apiClient.get(`/reports/statuses?date=${selectedDate}`),
      ]);
      if (dashRes.data.success) setStats(dashRes.data.data);
      if (dealerRes.data.success) setDealers(dealerRes.data.data || []);
    } catch (e) {
      console.error('NM Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Poll every 30s only for today
  useEffect(() => {
    if (selectedDate === today) {
      pollRef.current = setInterval(() => fetchData(true), 30000);
    }
    return () => clearInterval(pollRef.current);
  }, [selectedDate]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return '#27ae60';
      case 'Pending':   return '#f39c12';
      case 'Late':      return '#e74c3c';
      case 'Not Sent':  return '#9e9e9e';
      default:          return '#9e9e9e';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'Submitted': return '#e8f5e9';
      case 'Pending':   return '#fff8e1';
      case 'Late':      return '#fde8e8';
      case 'Not Sent':  return '#f5f5f5';
      default:          return '#f5f5f5';
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network Dashboard</Text>
        <Text style={styles.headerSub}>Loading live data…</Text>
      </View>
      <ActivityIndicator color="#CC0000" size="large" style={{ marginTop: 60 }} />
    </View>
  );

  const summary = stats?.summary || {};
  const submitted = dealers.filter(d => d.status === 'Submitted').length;
  const pending   = dealers.filter(d => d.status === 'Pending').length;
  const notSent   = dealers.filter(d => d.status === 'Not Sent').length;
  const late      = dealers.filter(d => d.status === 'Late').length;

  const isToday = selectedDate === today;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Network Dashboard</Text>
          <Text style={styles.headerSub}>
            Welcome, {user?.name || user?.username} · {isToday ? 'Live' : selectedDate}
          </Text>
        </View>
        {isToday && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>● LIVE</Text>
          </View>
        )}
      </View>

      {/* Date Selector */}
      <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#CC0000']} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          {[
            { label: 'Total Dealers', value: dealers.length, color: '#CC0000', icon: '👥' },
            { label: 'Submitted',     value: submitted,      color: '#27ae60', icon: '✅' },
            { label: 'Pending',       value: pending,        color: '#f59e0b', icon: '⏳' },
            { label: 'Not Sent',      value: notSent,        color: '#9e9e9e', icon: '❌' },
          ].map(card => (
            <View key={card.label} style={[styles.statCard, { borderTopColor: card.color }]}>
              <Text style={styles.statIcon}>{card.icon}</Text>
              <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Stock summary row — only show for today */}
        {isToday && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Network Stock Overview</Text>
            <View style={styles.stockRow}>
              {[
                { label: 'Total MTD Sales', value: summary.total_retail || 0 },
                { label: 'Network Dispatches', value: summary.total_dispatched || 0 },
              ].map(s => (
                <View key={s.label} style={styles.stockCard}>
                  <Text style={styles.stockValue}>{s.value}</Text>
                  <Text style={styles.stockLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dealer Status List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 {isToday ? "Today's" : selectedDate} Dealer Status
          </Text>
          {dealers.length === 0 ? (
            <Text style={styles.emptyText}>No dealer data for {selectedDate}.</Text>
          ) : dealers.map((d, i) => (
            <View key={d.dealer_id || i} style={styles.dealerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealerCode}>{d.dealer_code}</Text>
                <Text style={styles.dealerName}>{d.dealer_name}</Text>
                <Text style={styles.dealerNet}>{d.network_name} · {d.district}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: getStatusBg(d.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(d.status) }]}>
                  {d.status || 'Not Sent'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: {
    backgroundColor: '#CC0000', paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  liveBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  liveBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  dateScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', maxHeight: 56 },
  datePill: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  datePillActive: { backgroundColor: '#CC0000', borderColor: '#CC0000' },
  datePillText: { fontSize: 13, color: '#555', fontWeight: '600' },
  datePillTextActive: { color: '#fff' },

  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#888', fontWeight: '600', textAlign: 'center' },

  section: { paddingHorizontal: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },

  stockRow: { flexDirection: 'row', gap: 12 },
  stockCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  stockValue: { fontSize: 28, fontWeight: '800', color: '#CC0000', marginBottom: 4 },
  stockLabel: { fontSize: 11, color: '#888', textAlign: 'center' },

  dealerRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dealerCode: { fontSize: 13, fontWeight: '800', color: '#CC0000' },
  dealerName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginTop: 2 },
  dealerNet: { fontSize: 11, color: '#aaa', marginTop: 2 },
  statusChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#bbb', textAlign: 'center', padding: 24, fontSize: 13 },
});
