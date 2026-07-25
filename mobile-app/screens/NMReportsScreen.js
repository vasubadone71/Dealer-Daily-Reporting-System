import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, TouchableOpacity, RefreshControl
} from 'react-native';
import apiClient from '../utils/apiClient';

const MONTHS = [
  { label: 'This Month', value: () => new Date().toISOString().substring(0, 7) },
  { label: 'Last Month', value: () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().substring(0, 7);
  }},
];

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function getLastNDates(n) {
  const today = new Date();
  const dates = [];
  for (let index = 0; index < n; index++) {
    const d = new Date(today);
    d.setDate(today.getDate() - index);
    dates.push(d);
  }
  return dates;
}

const STATUS_COLOR = {
  Submitted: '#27ae60', Pending: '#f39c12', Late: '#e74c3c', 'Not Sent': '#9e9e9e'
};
const STATUS_BG = {
  Submitted: '#e8f5e9', Pending: '#fff8e1', Late: '#fde8e8', 'Not Sent': '#f5f5f5'
};

export default function NMReportsScreen({ user }) {
  const today = formatDate(new Date());

  // Mode: 'month' or 'date'
  const [mode, setMode] = useState('month');

  // Month mode state
  const [reports, setReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Date mode state
  const [statuses, setStatuses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMonthReports = async (month, quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await apiClient.get(`/reports?month=${month}`);
      if (res.data.success) setReports(res.data.data || []);
    } catch (e) {
      console.error('NM Reports fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDateStatuses = async (date, quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await apiClient.get(`/reports/statuses?date=${date}`);
      if (res.data.success) setStatuses(res.data.data || []);
    } catch (e) {
      console.error('NM Date statuses fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mode === 'month') fetchMonthReports(selectedMonth);
    else fetchDateStatuses(selectedDate);
  }, [mode, selectedMonth, selectedDate]);

  const onRefresh = () => {
    if (mode === 'month') fetchMonthReports(selectedMonth, true);
    else fetchDateStatuses(selectedDate, true);
  };

  // ─── Month Mode ─────────────────────────────────────────────
  const totalSubmitted = reports.filter(r => r.status === 'Submitted').length;
  const totalLate      = reports.filter(r => r.status === 'Late').length;

  // ─── Date Mode ──────────────────────────────────────────────
  const submitted  = statuses.filter(s => s.status === 'Submitted').length;
  const pending    = statuses.filter(s => s.status === 'Pending').length;
  const notSent    = statuses.filter(s => s.status === 'Not Sent' || !s.status).length;
  const late       = statuses.filter(s => s.status === 'Late').length;
  const last14     = getLastNDates(14);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>
          {mode === 'month' ? `${selectedMonth} · Read Only` : `${selectedDate} · Dealer Status`}
        </Text>
      </View>

      {/* Mode Tabs */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'month' && styles.modeTabActive]}
          onPress={() => setMode('month')}
        >
          <Text style={[styles.modeTabText, mode === 'month' && styles.modeTabTextActive]}>
            📋 By Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'date' && styles.modeTabActive]}
          onPress={() => setMode('date')}
        >
          <Text style={[styles.modeTabText, mode === 'date' && styles.modeTabTextActive]}>
            📅 By Date
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selector Row */}
      {mode === 'month' ? (
        <View style={styles.selectorRow}>
          {MONTHS.map(m => {
            const val = m.value();
            return (
              <TouchableOpacity
                key={m.label}
                style={[styles.pill, selectedMonth === val && styles.pillActive]}
                onPress={() => setSelectedMonth(val)}
              >
                <Text style={[styles.pillText, selectedMonth === val && styles.pillTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={{ padding: 10, gap: 8 }}
        >
          {last14.map(d => {
            const val = formatDate(d);
            const active = selectedDate === val;
            const isToday = val === today;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setSelectedDate(val)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {isToday ? 'Today' : `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color="#CC0000" size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC0000']} />}
        >
          {/* ── MONTH MODE ── */}
          {mode === 'month' && (
            <>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderTopColor: '#27ae60' }]}>
                  <Text style={[styles.summaryValue, { color: '#27ae60' }]}>{totalSubmitted}</Text>
                  <Text style={styles.summaryLabel}>Submitted</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#e74c3c' }]}>
                  <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>{totalLate}</Text>
                  <Text style={styles.summaryLabel}>Late</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#CC0000' }]}>
                  <Text style={[styles.summaryValue, { color: '#CC0000' }]}>{reports.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
              </View>

              {reports.length === 0 ? (
                <Text style={styles.emptyText}>No reports found for {selectedMonth}.</Text>
              ) : reports.map((r, index) => (
                <View key={r.id || index} style={styles.reportCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.dealerCode}>{r.dealer_code}</Text>
                      <Text style={styles.reportDate}>{r.date}</Text>
                    </View>
                    <Text style={styles.dealerName}>{r.dealer_name}</Text>
                    {r.total_retail > 0 && (
                      <Text style={styles.retailText}>Retail: {r.total_retail} units</Text>
                    )}
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: STATUS_BG[r.status] || '#f5f5f5' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] || '#999' }]}>
                      {r.status}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── DATE MODE ── */}
          {mode === 'date' && (
            <>
              {/* Summary cards */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderTopColor: '#27ae60' }]}>
                  <Text style={[styles.summaryValue, { color: '#27ae60' }]}>{submitted}</Text>
                  <Text style={styles.summaryLabel}>Submitted</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#f39c12' }]}>
                  <Text style={[styles.summaryValue, { color: '#f39c12' }]}>{pending}</Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#9e9e9e' }]}>
                  <Text style={[styles.summaryValue, { color: '#9e9e9e' }]}>{notSent}</Text>
                  <Text style={styles.summaryLabel}>Not Sent</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#e74c3c' }]}>
                  <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>{late}</Text>
                  <Text style={styles.summaryLabel}>Late</Text>
                </View>
              </View>

              {/* Progress bar */}
              {statuses.length > 0 && (
                <View style={styles.progressBar}>
                  {submitted > 0 && (
                    <View style={[styles.progressSeg, { flex: submitted, backgroundColor: '#27ae60' }]} />
                  )}
                  {pending > 0 && (
                    <View style={[styles.progressSeg, { flex: pending, backgroundColor: '#f39c12' }]} />
                  )}
                  {notSent > 0 && (
                    <View style={[styles.progressSeg, { flex: notSent, backgroundColor: '#ddd' }]} />
                  )}
                  {late > 0 && (
                    <View style={[styles.progressSeg, { flex: late, backgroundColor: '#e74c3c' }]} />
                  )}
                </View>
              )}

              {statuses.length === 0 ? (
                <Text style={styles.emptyText}>No dealer data for {selectedDate}.</Text>
              ) : statuses.map((d, index) => (
                <View key={d.dealer_id || index} style={styles.reportCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.dealerCode}>{d.dealer_code}</Text>
                      {d.submitted_at && (
                        <Text style={styles.reportDate}>{d.submitted_at.substring(11, 16)}</Text>
                      )}
                    </View>
                    <Text style={styles.dealerName}>{d.dealer_name}</Text>
                    <Text style={styles.dealerMeta}>{d.network_name} · {d.district}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: STATUS_BG[d.status] || '#f5f5f5' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[d.status] || '#999' }]}>
                      {d.status || 'Not Sent'}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: {
    backgroundColor: '#CC0000', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  modeTabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modeTab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  modeTabActive: { borderBottomColor: '#CC0000' },
  modeTabText: { fontSize: 14, color: '#666', fontWeight: '600' },
  modeTabTextActive: { color: '#CC0000' },

  selectorRow: {
    flexDirection: 'row', padding: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee', gap: 10,
  },
  dateScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', maxHeight: 56 },

  pill: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  pillActive: { backgroundColor: '#CC0000', borderColor: '#CC0000' },
  pillText: { fontSize: 13, color: '#555', fontWeight: '600' },
  pillTextActive: { color: '#fff' },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  summaryCard: {
    flex: 1, minWidth: 70, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: '#888', marginTop: 4, textAlign: 'center' },

  progressBar: {
    flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
    marginBottom: 14, backgroundColor: '#eee',
  },
  progressSeg: { height: 6 },

  reportCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dealerCode: { fontSize: 12, fontWeight: '800', color: '#CC0000' },
  reportDate: { fontSize: 11, color: '#aaa' },
  dealerName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginTop: 2 },
  dealerMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  retailText: { fontSize: 11, color: '#27ae60', marginTop: 2, fontWeight: '600' },
  statusChip: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyText: { color: '#bbb', textAlign: 'center', padding: 40, fontSize: 13 },
});
