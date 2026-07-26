import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, TouchableOpacity, RefreshControl, Modal, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
import { generateAndShare } from '../utils/exportUtils';

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
  const [expandedId, setExpandedId] = useState(null);

  // Date mode state
  const [statuses, setStatuses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);

  // Export State
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState('Daily');
  const [exportDate, setExportDate] = useState(today);
  const [exporting, setExporting] = useState(false);
  
  // Dealers for Export
  const [dealers, setDealers] = useState([]);
  const [exportDealer, setExportDealer] = useState('');

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

  const fetchDealers = async () => {
    try {
      const res = await apiClient.get('/dealers');
      if (res.data.success) {
        const list = res.data.data.filter(d => d.role !== 'network_manager' && d.role !== 'admin');
        setDealers(list);
        if (list.length > 0) {
          setExportDealer(list[0].id.toString());
        }
      }
    } catch (e) {
      console.error('Failed to fetch dealers', e);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, []);

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>
            {mode === 'month' ? `${selectedMonth} · Read Only` : `${selectedDate} · Dealer Status`}
          </Text>
        </View>
        <TouchableOpacity 
          style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}
          onPress={() => setExportModalVisible(true)}
        >
          <Text style={{ color: '#CC0000', fontWeight: 'bold', fontSize: 12 }}>📥 Export</Text>
        </TouchableOpacity>
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
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {last14.map(d => {
              const val = formatDate(d);
              const active = selectedDate === val;
              const isToday = val === today;
              return (
                <TouchableOpacity
                  key={val}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 18,
                    borderRadius: 8, marginRight: 10,
                    backgroundColor: active ? '#CC0000' : '#f8f9fa',
                    borderWidth: 1, borderColor: active ? '#CC0000' : '#e9ecef',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                  onPress={() => setSelectedDate(val)}
                >
                  <Text style={{
                    fontSize: 14, fontWeight: '700',
                    color: active ? '#ffffff' : '#495057'
                  }}>
                    {isToday ? 'Today' : String(d.getDate()) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Export Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' }}>Export Reports</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Text style={{ fontSize: 20, color: '#999' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6 }}>Report Type</Text>
            <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 16 }}>
              <Picker selectedValue={exportType} onValueChange={(v) => setExportType(v)}>
                <Picker.Item label="Daily Report" value="Daily" />
                <Picker.Item label="Monthly Report" value="Monthly" />
                <Picker.Item label="Dealer Ledger" value="Dealer" />
                <Picker.Item label="Stock Report" value="Stock" />
                <Picker.Item label="Retail Report" value="Retail" />
                <Picker.Item label="Performance Report" value="Performance" />
              </Picker>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6 }}>Date / Month</Text>
            <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 20, padding: 10 }}>
              <Text style={{ fontSize: 16, color: '#333' }}>
                {(exportType === 'Monthly' || exportType === 'Retail' || exportType === 'Performance') ? selectedMonth : selectedDate}
              </Text>
              <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Change date from main screen tabs before exporting.</Text>
            </View>

            {/* Dealer Selection (Only show for reports that need a dealer filter) */}
            {(exportType === 'Dealer' || exportType === 'Retail' || exportType === 'Stock') && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6 }}>Select Dealer</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 20 }}>
                  <Picker selectedValue={exportDealer} onValueChange={(v) => setExportDealer(v)}>
                    {dealers.map(d => (
                      <Picker.Item key={d.id} label={d.name} value={d.id.toString()} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            {exporting ? (
              <ActivityIndicator size="large" color="#CC0000" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#CC0000', padding: 14, borderRadius: 8, alignItems: 'center' }}
                  onPress={async () => {
                    setExporting(true);
                    try {
                      const dt = (exportType === 'Monthly' || exportType === 'Retail' || exportType === 'Performance') ? selectedMonth : selectedDate;
                      await generateAndShare(exportType, 'PDF', dt, exportDealer);
                    } catch (e) {
                      Alert.alert("Export Error", "Failed to export report.");
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Export PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#27ae60', padding: 14, borderRadius: 8, alignItems: 'center' }}
                  onPress={async () => {
                    setExporting(true);
                    try {
                      const dt = (exportType === 'Monthly' || exportType === 'Retail' || exportType === 'Performance') ? selectedMonth : selectedDate;
                      await generateAndShare(exportType, 'Excel', dt, exportDealer);
                    } catch (e) {
                      Alert.alert("Export Error", "Failed to export report.");
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Export Excel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
              ) : reports.map((r, index) => {
                const isExpanded = expandedId === r.id;
                return (
                  <TouchableOpacity key={r.id || index} style={styles.reportCard} onPress={() => setExpandedId(isExpanded ? null : r.id)} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.dealerCode}>{r.dealer_code}</Text>
                          <Text style={styles.reportDate}>{r.date}</Text>
                        </View>
                        <Text style={styles.dealerName}>{r.dealer_name}</Text>
                        {r.total_retail > 0 && (
                          <Text style={styles.retailText}>Retail: {r.total_retail} units {isExpanded ? '▲' : '▼'}</Text>
                        )}
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: STATUS_BG[r.status] || '#f5f5f5' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] || '#999' }]}>
                          {r.status}
                        </Text>
                      </View>
                    </View>
                    {isExpanded && r.retail_items && r.retail_items.length > 0 && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>Retailed Vehicles</Text>
                        {r.retail_items.map((item, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                            <Text style={{ fontSize: 13, color: '#333', flex: 1 }} numberOfLines={1}>• {item.model_name}</Text>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1a1a2e' }}>{item.quantity}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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
              ) : statuses.map((d, index) => {
                const isExpanded = expandedId === d.report_id && d.report_id != null;
                return (
                  <TouchableOpacity key={d.dealer_id || index} style={styles.reportCard} onPress={() => { if (d.report_id) setExpandedId(isExpanded ? null : d.report_id); }} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.dealerCode}>{d.dealer_code}</Text>
                          {d.submitted_at && (
                            <Text style={styles.reportDate}>{new Date(d.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          )}
                        </View>
                        <Text style={styles.dealerName}>{d.dealer_name}</Text>
                        <Text style={styles.dealerMeta}>{d.network_name} • {d.district}</Text>
                        {d.total_retail > 0 && (
                          <Text style={styles.retailText}>Retail: {d.total_retail} units {isExpanded ? '▲' : '▼'}</Text>
                        )}
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: STATUS_BG[d.status] || '#f5f5f5' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLOR[d.status] || '#999' }]}>
                          {d.status}
                        </Text>
                      </View>
                    </View>
                    {isExpanded && d.retail_items && d.retail_items.length > 0 && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>Retailed Vehicles</Text>
                        {d.retail_items.map((item, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                            <Text style={{ fontSize: 13, color: '#333', flex: 1 }} numberOfLines={1}>• {item.model_name}</Text>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1a1a2e' }}>{item.quantity}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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
  dateScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },

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
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
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
