import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, RefreshControl, ScrollView, ActivityIndicator
} from 'react-native';
import apiClient from '../utils/apiClient';

export default function NMDealersScreen({ user }) {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [dealerStock, setDealerStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  const fetchDealers = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await apiClient.get('/dealers');
      if (res.data.success) setDealers(res.data.data || []);
    } catch (e) {
      console.error('NM Dealers fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDealerStock = async (dealerId) => {
    setStockLoading(true);
    setDealerStock(null);
    try {
      const res = await apiClient.get(`/dealer-stock/${dealerId}`);
      if (res.data.success) setDealerStock(res.data.data);
    } catch (e) {
      console.error('NM dealer stock fetch error:', e);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, []);

  const filtered = dealers.filter(d => {
    const q = search.toLowerCase();
    return !q || d.name.toLowerCase().includes(q)
      || d.dealer_code.toLowerCase().includes(q)
      || (d.district || '').toLowerCase().includes(q)
      || (d.network_name || '').toLowerCase().includes(q);
  });

  const getStatusColor = (s) => s === 'active' ? '#27ae60' : '#e74c3c';
  const getStatusBg = (s) => s === 'active' ? '#e8f5e9' : '#fde8e8';

  if (loading) return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      <View style={styles.header}><Text style={styles.headerTitle}>Dealer List</Text></View>
      <ActivityIndicator color="#CC0000" size="large" style={{ marginTop: 60 }} />
    </View>
  );

  // Dealer detail view
  if (selectedDealer) {
    const stockData = dealerStock; // { date, daily_summary, breakdown: [...] } or { breakdown: {...scooters, motorcycles} }
    // Support both old (breakdown.scooters/motorcycles) and new flat breakdown array from stockService
    const breakdownArr = Array.isArray(stockData?.breakdown) ? stockData.breakdown : null;
    const oldBreakdown = !breakdownArr ? stockData?.breakdown : null;

    const scooters = breakdownArr ? breakdownArr.filter(m => m.model_type === 'Scooter') : (oldBreakdown?.scooters || []);
    const motorcycles = breakdownArr ? breakdownArr.filter(m => m.model_type === 'Motorcycle') : (oldBreakdown?.motorcycles || []);
    const grandTotal = breakdownArr
      ? breakdownArr.reduce((s, m) => s + (m.closing || 0), 0)
      : (oldBreakdown?.grandTotal || 0);
    const scooterTotal = scooters.reduce((s, m) => s + (breakdownArr ? (m.closing || 0) : (m.qty || 0)), 0);
    const motorcycleTotal = motorcycles.reduce((s, m) => s + (breakdownArr ? (m.closing || 0) : (m.qty || 0)), 0);

    const renderModelNew = (m) => {
      const activeColors = (m.colors || []).filter(c => c.closing > 0);
      return (
        <View key={m.model_name} style={styles.modelCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.modelCardName}>{m.model_name}</Text>
            <Text style={styles.modelCardTotal}>{m.closing} units</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {activeColors.map(c => (
              <View key={c.variant_color_id} style={styles.colorChip}>
                <View style={[styles.colorDot, { backgroundColor: c.hex_code || '#ccc' }]} />
                <Text style={styles.colorChipText}>{c.color_name}: <Text style={{ fontWeight: '800' }}>{c.closing}</Text></Text>
              </View>
            ))}
            {activeColors.length === 0 && (
              <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>Out of stock</Text>
            )}
          </View>
        </View>
      );
    };

    const renderModelOld = (m) => (
      <View key={m.key} style={styles.modelRow}>
        <Text style={styles.modelName}>{m.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.modelQty}>{m.qty}</Text>
          <View style={{
            backgroundColor: m.qty === 0 ? '#fde8e8' : m.qty <= 2 ? '#fff8e1' : '#e8f5e9',
            borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: m.qty === 0 ? '#CC0000' : m.qty <= 2 ? '#f59e0b' : '#27ae60' }}>
              {m.qty === 0 ? '🔴 Out' : m.qty <= 2 ? '🟡 Low' : '🟢 OK'}
            </Text>
          </View>
        </View>
      </View>
    );

    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <TouchableOpacity onPress={() => { setSelectedDealer(null); setDealerStock(null); }} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{selectedDealer.dealer_code}</Text>
            <Text style={styles.headerSub}>{selectedDealer.name}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 14 }}>
          {/* Dealer info */}
          <View style={styles.infoCard}>
            {[
              { label: 'Network', value: selectedDealer.network_name },
              { label: 'District', value: selectedDealer.district },
              { label: 'State', value: selectedDealer.state },
              { label: 'Type', value: selectedDealer.dealer_type },
              { label: 'Status', value: selectedDealer.status },
            ].map(row => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value || '—'}</Text>
              </View>
            ))}
          </View>

          {/* Stock */}
          <Text style={styles.sectionTitle}>📦 Live Stock</Text>
          {stockLoading ? (
            <ActivityIndicator color="#CC0000" style={{ marginVertical: 20 }} />
          ) : stockData ? (
            <>
              {/* Summary totals */}
              <View style={styles.stockSummaryRow}>
                <View style={styles.stockSummaryItem}>
                  <Text style={styles.stockSummaryValue}>{scooterTotal}</Text>
                  <Text style={styles.stockSummaryLabel}>🛵 Scooters</Text>
                </View>
                <View style={styles.stockSummaryItem}>
                  <Text style={styles.stockSummaryValue}>{motorcycleTotal}</Text>
                  <Text style={styles.stockSummaryLabel}>🏍️ Motorcycles</Text>
                </View>
                <View style={styles.stockSummaryItem}>
                  <Text style={[styles.stockSummaryValue, { color: '#CC0000' }]}>{grandTotal}</Text>
                  <Text style={styles.stockSummaryLabel}>Total</Text>
                </View>
              </View>

              {/* Scooters */}
              {scooters.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.categoryTitle}>🛵 Scooters</Text>
                  {scooters.map(m => breakdownArr ? renderModelNew(m) : renderModelOld(m))}
                </View>
              )}

              {/* Motorcycles */}
              {motorcycles.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.categoryTitle}>🏍️ Motorcycles</Text>
                  {motorcycles.map(m => breakdownArr ? renderModelNew(m) : renderModelOld(m))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No stock data available.</Text>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dealer List</Text>
        <Text style={styles.headerSub}>{filtered.length} dealers · Read Only</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, code, district, network…"
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDealers(true)} colors={['#CC0000']} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No dealers found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.dealerCard}
            onPress={() => {
              setSelectedDealer(item);
              fetchDealerStock(item.id);
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={styles.dealerCode}>{item.dealer_code}</Text>
                <View style={[styles.typeChip, { backgroundColor: '#fff8f8', borderColor: '#fcc' }]}>
                  <Text style={{ fontSize: 10, color: '#CC0000', fontWeight: '700' }}>{item.dealer_type}</Text>
                </View>
              </View>
              <Text style={styles.dealerName}>{item.name}</Text>
              <Text style={styles.dealerMeta}>{item.network_name} · {item.district}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.statusChip, { backgroundColor: getStatusBg(item.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status === 'active' ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: '#ccc' }}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
  backBtn: { padding: 6 },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  searchWrapper: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: {
    height: 40, backgroundColor: '#f5f5f5', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 13, color: '#333',
  },

  dealerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  dealerCode: { fontSize: 13, fontWeight: '800', color: '#CC0000' },
  dealerName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  dealerMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  typeChip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  statusChip: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },

  stockSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stockSummaryItem: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stockSummaryValue: { fontSize: 24, fontWeight: '800', color: '#1a1a2e' },
  stockSummaryLabel: { fontSize: 11, color: '#888', marginTop: 4 },

  modelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff', paddingHorizontal: 14, marginBottom: 4, borderRadius: 10,
  },
  modelName: { fontSize: 13, color: '#444' },
  modelQty: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },

  // New color-wise model card styles
  categoryTitle: { fontSize: 13, fontWeight: '700', color: '#CC0000', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  modelCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#e8e8e8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  modelCardName: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  modelCardTotal: { fontSize: 13, fontWeight: '800', color: '#CC0000' },
  colorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc' },
  colorChipText: { fontSize: 12, color: '#444' },

  emptyText: { color: '#bbb', textAlign: 'center', padding: 40, fontSize: 13 },
});
