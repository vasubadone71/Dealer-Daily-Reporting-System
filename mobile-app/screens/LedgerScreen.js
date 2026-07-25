import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  StatusBar, TouchableOpacity, TextInput, ScrollView,
  RefreshControl, Animated
} from 'react-native';
import apiClient from '../utils/apiClient';

function getStockStatus(qty) {
  if (qty === 0) return 'out';
  if (qty <= 2) return 'low';
  return 'ok';
}

function StockDot({ qty }) {
  const status = getStockStatus(qty);
  const map = { ok: { bg: '#e8f5e9', color: '#27ae60', label: '🟢' },
                low: { bg: '#fff8e1', color: '#f59e0b', label: '🟡' },
                out: { bg: '#fde8e8', color: '#CC0000', label: '🔴' } };
  const s = map[status];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, color: s.color, fontWeight: '700' }}>
        {s.label} {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'OK'}
      </Text>
    </View>
  );
}

// ─── Animated counter ─────────────────────────────────────────
function AnimatedCounter({ value, style }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const target = value || 0;
    if (prev.current === target) return;
    const step = (target - prev.current) / 15;
    let cur = prev.current;
    const timer = setInterval(() => {
      cur += step;
      if ((step > 0 && cur >= target) || (step < 0 && cur <= target)) {
        cur = target;
        clearInterval(timer);
      }
      setDisplay(Math.round(cur));
    }, 16);
    prev.current = target;
    return () => clearInterval(timer);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

// ─── Section 2: Live Stock Card ───────────────────────────────
function LiveStockCard({ breakdown, search }) {
  if (!breakdown || breakdown.length === 0) return <Text style={{ padding: 20, textAlign: 'center', color: '#666' }}>No stock data available.</Text>;

  const scooters = breakdown.filter(m => m.model_type === 'Scooter' && (!search || m.model_name.toLowerCase().includes(search.toLowerCase())));
  const motorcycles = breakdown.filter(m => m.model_type === 'Motorcycle' && (!search || m.model_name.toLowerCase().includes(search.toLowerCase())));

  const renderModel = (m) => {
    const activeColors = (m.colors || []).filter(c => c.closing > 0);
    return (
      <View key={m.model_name} style={styles.modelGroupCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={styles.modelGroupTitle}>{m.model_name}</Text>
              <Text style={styles.modelGroupTotal}>Total: {m.closing}</Text>
          </View>
          <View style={styles.colorChipsContainer}>
              {activeColors.map(c => (
                  <View key={c.variant_color_id} style={styles.colorChip}>
                      <View style={[styles.colorDot, { backgroundColor: c.hex_code }]} />
                      <Text style={styles.colorChipText}>{c.color_name}: <Text style={{fontWeight: 'bold'}}>{c.closing}</Text></Text>
                  </View>
              ))}
              {activeColors.length === 0 && <Text style={{fontSize: 12, color: '#999'}}>Out of stock</Text>}
          </View>
      </View>
    );
  };

  return (
    <View style={styles.liveStockCard}>
      <Text style={styles.liveStockHeader}>Current Live Stock</Text>
      
      {scooters.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>🛵 Scooters</Text>
            {scooters.map(renderModel)}
          </View>
      )}

      {motorcycles.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>🏍️ Motorcycles</Text>
            {motorcycles.map(renderModel)}
          </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function LedgerScreen({ dealerId }) {
  const [data, setData] = useState({ ledger: [], breakdown: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const endpoint = dealerId ? `/networks/dealers/${dealerId}/ledger` : `/reports/ledger`;
      const response = await apiClient.get(endpoint);
      if (response.data.success) {
        
        // Also fetch live stock overview if looking at a specific dealer as admin
        let stockRes = null;
        try {
            if (dealerId) {
                stockRes = await apiClient.get(`/networks/dealers/${dealerId}/stock`);
            }
        } catch (err) {
            console.log('Failed to fetch dealer stock:', err);
        }

        let breakdown = [];
        if (stockRes && stockRes.data.success) {
            if (Array.isArray(stockRes.data.data)) {
                const myStock = stockRes.data.data.find(d => d.dealer_id === dealerId);
                breakdown = myStock ? myStock.stock.breakdown : [];
            } else {
                breakdown = stockRes.data.data.stock?.breakdown || stockRes.data.data.breakdown || [];
            }
        }

        if (!breakdown.length && !dealerId) {
             const todayRes = await apiClient.get(`/reports/today`);
             if (todayRes.data.success && todayRes.data.data && todayRes.data.data.stock_data) {
                 breakdown = todayRes.data.data.stock_data;
             }
        }

        setData({ ledger: response.data.data, breakdown: breakdown });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealerId]);

  const todayLedger = data.ledger[0] || { 
    total_opening: 0, 
    total_dispatched: 0, 
    total_retail: 0, 
    total_adjustment: 0, 
    total_closing: 0 
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Stock Ledger Dashboard</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search models..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#CC0000" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          style={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#CC0000']} />}
        >
          {/* Section 1: Daily Stock Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Daily Stock Summary</Text>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>Opening Stock</Text>
              <AnimatedCounter value={todayLedger.total_opening} style={styles.ledgerValue} />
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>+ Today's Dispatch</Text>
              <AnimatedCounter value={todayLedger.total_dispatched} style={[styles.ledgerValue, { color: '#27ae60' }]} />
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>- Today's Retail</Text>
              <AnimatedCounter value={todayLedger.total_retail} style={[styles.ledgerValue, { color: '#CC0000' }]} />
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>± Stock Adjustments</Text>
              <AnimatedCounter value={todayLedger.total_adjustment} style={[styles.ledgerValue, { color: '#f59e0b' }]} />
            </View>
            <View style={styles.divider} />
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabelBold}>= Closing Stock</Text>
              <AnimatedCounter value={todayLedger.total_closing} style={styles.ledgerValueBold} />
            </View>
          </View>

          {/* Section 2: Live Stock */}
          <LiveStockCard breakdown={data.breakdown} search={search} />

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 20, paddingTop: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  searchContainer: { padding: 16, backgroundColor: '#f8f9fa' },
  searchInput: { backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 16, color: '#333' },
  scrollArea: { flex: 1, paddingHorizontal: 16 },
  
  // Section 1
  summaryCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  summaryTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, letterSpacing: 0.5 },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  ledgerLabel: { color: '#a0a0b0', fontSize: 15 },
  ledgerValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  ledgerLabelBold: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ledgerValueBold: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  
  // Section 2
  liveStockCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  liveStockHeader: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },
  categorySection: { marginBottom: 20 },
  categoryTitle: { fontSize: 14, fontWeight: 'bold', color: '#CC0000', textTransform: 'uppercase', marginBottom: 10 },
  modelGroupCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', padding: 12, marginBottom: 12 },
  modelGroupTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  modelGroupTotal: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  variantContainer: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#f0f0f0' },
  variantTitle: { fontSize: 14, color: '#444', marginBottom: 6 },
  variantTotal: { fontWeight: 'bold' },
  colorChipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  colorChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', marginRight: 4 },
  colorChipText: { fontSize: 12, color: '#333' }
});
