import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, StatusBar, RefreshControl
} from 'react-native';
import apiClient from '../utils/apiClient';

const getDateString = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export default function ReportEntryScreen({ dealer }) {
  const [targetDate, setTargetDate] = useState(getDateString(0));
  const [inventoryTree, setInventoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('Pending');
  const [isLocked, setIsLocked] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoLockTime, setAutoLockTime] = useState('11:59 PM');
  const [activeTab, setActiveTab] = useState('Sales');
  const [stockData, setStockData] = useState([]);

  // items: { variant_color_id: qty }
  const [items, setItems] = useState({});
  const [bookings, setBookings] = useState({ today_booking: '0', total_booking: '0' });

  const fetchInventoryTree = useCallback(async () => {
    try {
      const response = await apiClient.get('/master/inventory-tree');
      if (response.data.success) {
        setInventoryTree(response.data.data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load inventory tree.');
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/reports/today?date=${targetDate}`);
      const resData = response.data;

      if (resData.success && resData.data) {
        const r = resData.data;
        setStatus(r.status);
        setIsLocked(r.is_locked || false);
        setLastUpdated(r.last_updated || null);
        setAutoLockTime(r.auto_lock_time || '11:59 PM');

        const newItems = {};
        if (r.retail_items) {
            r.retail_items.forEach(item => {
                newItems[item.variant_color_id] = item.quantity;
            });
        }
        setItems(newItems);
        
        setBookings({
          today_booking: r.today_booking?.toString() || '0',
          total_booking: r.total_booking?.toString() || '0'
        });

        if (r.stock_data) {
          // stock_data comes from today report, but live stock comes from today-stock endpoint
          setStockData(r.stock_data);
        } else {
          setStockData([]);
        }
      } else {
        setItems({});
        setBookings({ today_booking: '0', total_booking: '0' });
        setIsLocked(false);
        setStatus('Pending');
        setStockData([]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.userFriendlyMessage || 'Failed to connect.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetDate]);

  const fetchStockOverview = useCallback(async () => {
    try {
      const res = await apiClient.get('/reports/today-stock');
      if (res.data.success && res.data.data) {
        // API returns { breakdown: [...], totalClosing, ... }
        setStockData(res.data.data.breakdown || []);
      }
    } catch (e) {
      console.error('Stock fetch failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchInventoryTree().then(fetchReport).then(fetchStockOverview);
  }, [fetchInventoryTree, fetchReport, fetchStockOverview]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventoryTree().then(fetchReport).then(fetchStockOverview);
  };

  const handleQtyChange = (vcId, value) => {
    if (isLocked) return;
    let num = parseInt(value, 10);
    if (isNaN(num) || num < 0) num = 0;
    
    setItems(prev => {
        const next = { ...prev };
        if (num === 0) delete next[vcId];
        else next[vcId] = num;
        return next;
    });
  };

  const incrementQty = (vcId) => {
    if (isLocked) return;
    setItems(prev => ({ ...prev, [vcId]: (prev[vcId] || 0) + 1 }));
  };

  const decrementQty = (vcId) => {
    if (isLocked) return;
    setItems(prev => {
      const current = prev[vcId] || 0;
      if (current <= 1) {
          const next = { ...prev };
          delete next[vcId];
          return next;
      }
      return { ...prev, [vcId]: current - 1 };
    });
  };

  const handleBookingChange = (key, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setBookings(prev => ({ ...prev, [key]: value }));
  };

  const parseDataForSave = () => {
    const itemsArray = Object.keys(items)
        .map(vcId => ({
            variant_color_id: parseInt(vcId, 10),
            quantity: parseInt(items[vcId] || '0', 10)
        }))
        .filter(item => item.quantity > 0);

    return {
      date: targetDate,
      items: itemsArray,
      today_booking: parseInt(bookings.today_booking || '0', 10),
      total_booking: parseInt(bookings.total_booking || '0', 10)
    };
  };

  const handleSaveDraft = async () => {
    if (isLocked) return;
    setSaving(true);
    try {
      const payload = parseDataForSave();
      const response = await apiClient.post('/reports/draft', payload);
      if (response.data.success) {
        Alert.alert('Success', 'Draft saved successfully.');
        fetchReport();
      }
    } catch (error) {
      Alert.alert('Error', error.userFriendlyMessage || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    Alert.alert(
      'Submit Report',
      'Are you sure you want to submit? This action will lock the report for today and deduct stock balances automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const payload = parseDataForSave();
              await apiClient.post('/reports/draft', payload);
              const submitRes = await apiClient.post('/reports/submit', { date: targetDate });
              if (submitRes.data.success) {
                Alert.alert('Success', 'Report submitted! Stock balances updated.');
                fetchReport();
              }
            } catch (error) {
              Alert.alert('Error', error.userFriendlyMessage || 'Failed to submit report.');
            } finally {
              setSaving(false);
            }
          } 
        }
      ]
    );
  };

  const toggleDate = () => {
    const today = getDateString(0);
    const yesterday = getDateString(-1);
    setTargetDate(targetDate === today ? yesterday : today);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'Submitted': return '#27ae60'; // Green
      case 'Locked': return '#721c24'; // Dark Red
      case 'Pending': return '#f39c12'; // Orange
      case 'Late': return '#c0392b'; // Red
      case 'Not Sent': return '#7f8c8d'; // Grey
      default: return '#f39c12';
    }
  };

  const isToday = targetDate === getDateString(0);

  // Flatten models for display
  const flatModels = useMemo(() => {
    return inventoryTree.map(model => {
      const colors = model.variants.length > 0 ? model.variants[0].colors : [];
      return { ...model, colors: colors.sort((a,b) => a.color_name.localeCompare(b.color_name)) };
    });
  }, [inventoryTree]);

  const renderSalesTab = () => {
    const scooters = flatModels.filter(m => m.type === 'Scooter');
    const motorcycles = flatModels.filter(m => m.type === 'Motorcycle');

    const renderCard = (model) => {
      let modelTotal = 0;
      model.colors.forEach(c => modelTotal += (items[c.variant_color_id] || 0));

      return (
        <View key={model.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>{model.name}</Text>
            <Text style={styles.cardHeaderTotal}>Total: {modelTotal}</Text>
          </View>
          <View style={styles.cardBody}>
            {model.colors.map(vc => {
              const qty = items[vc.variant_color_id] || 0;
              return (
                <View key={vc.variant_color_id} style={[styles.colorRow, qty > 0 && styles.colorRowActive]}>
                  <View style={styles.colorLabelBox}>
                    <View style={[styles.colorDot, { backgroundColor: vc.hex_code }]} />
                    <Text style={styles.colorText}>{vc.color_name}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity onPress={() => decrementQty(vc.variant_color_id)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <TextInput 
                      style={styles.qtyInput}
                      keyboardType="numeric"
                      value={qty === 0 ? '' : qty.toString()}
                      onChangeText={(val) => handleQtyChange(vc.variant_color_id, val)}
                      placeholder="0"
                      editable={!isLocked}
                    />
                    <TouchableOpacity onPress={() => incrementQty(vc.variant_color_id)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      );
    };

    return (
      <View style={{ paddingBottom: 100 }}>
        <Text style={styles.sectionTitle}>Scooters</Text>
        {scooters.map(renderCard)}
        
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Motorcycles</Text>
        {motorcycles.map(renderCard)}
      </View>
    );
  };

  const renderStockTab = () => {
    if (!stockData || stockData.length === 0) return (
      <Text style={{ padding: 20, textAlign: 'center', color: '#666' }}>No stock data available. Refresh to load live stock.</Text>
    );
    
    // stockData is the breakdown array: { model_name, model_type, closing, colors: [{variant_color_id, color_name, hex_code, closing}] }
    const scooters = stockData.filter(m => m.model_type === 'Scooter');
    const motorcycles = stockData.filter(m => m.model_type === 'Motorcycle');

    const renderStockCard = (m) => {
        // Colors with stock > 0
        const activeColors = (m.colors || []).filter(c => c.closing > 0);

        return (
            <View key={m.model_name} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderTitle}>{m.model_name}</Text>
                    <Text style={styles.cardHeaderTotal}>Stock: {m.closing}</Text>
                </View>
                <View style={[styles.cardBody, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
                    {activeColors.map(c => (
                        <View key={c.variant_color_id} style={styles.stockChip}>
                            <View style={[styles.colorDot, { backgroundColor: c.hex_code || '#ccc' }]} />
                            <Text style={styles.stockChipText}>{c.color_name}: <Text style={{fontWeight: 'bold'}}>{c.closing}</Text></Text>
                        </View>
                    ))}
                    {activeColors.length === 0 && <Text style={{color: '#999'}}>Out of stock</Text>}
                </View>
            </View>
        );
    };

    return (
      <View style={{ paddingBottom: 100 }}>
        {scooters.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Scooters Stock</Text>
            {scooters.map(renderStockCard)}
          </>
        )}
        {motorcycles.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Motorcycles Stock</Text>
            {motorcycles.map(renderStockCard)}
          </>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#CC0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f9" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Retail</Text>
        <TouchableOpacity style={styles.dateToggle} onPress={toggleDate}>
          <Text style={styles.dateToggleText}>{isToday ? "Today" : "Yesterday"}</Text>
          <Text style={styles.dateValue}>{targetDate}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBanner}>
        <View>
          <Text style={styles.statusLabel}>Status: {isLocked ? 'Locked' : 'Editable'}</Text>
          {lastUpdated && <Text style={styles.timeSubtext}>Last Updated: {lastUpdated}</Text>}
          {!isLocked && <Text style={styles.timeSubtext}>Auto-Lock: {autoLockTime}</Text>}
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Sales' && styles.activeTab]} onPress={() => setActiveTab('Sales')}>
          <Text style={[styles.tabText, activeTab === 'Sales' && styles.activeTabText]}>Retail Sales</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Stock' && styles.activeTab]} onPress={() => setActiveTab('Stock')}>
          <Text style={[styles.tabText, activeTab === 'Stock' && styles.activeTabText]}>Live Stock</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC0000']} />}
      >
        {activeTab === 'Sales' && (
          <>
            {/* Bookings Section */}
            <View style={styles.bookingCard}>
              <Text style={styles.sectionTitle}>Bookings</Text>
              <View style={styles.bookingRow}>
                <View style={styles.bookingBox}>
                  <Text style={styles.bookingLabel}>Today's Booking</Text>
                  <TextInput 
                    style={styles.bookingInput}
                    keyboardType="numeric"
                    value={bookings.today_booking}
                    onChangeText={val => handleBookingChange('today_booking', val)}
                    editable={!isLocked}
                  />
                </View>
                <View style={styles.bookingBox}>
                  <Text style={styles.bookingLabel}>Total Booking</Text>
                  <TextInput 
                    style={styles.bookingInput}
                    keyboardType="numeric"
                    value={bookings.total_booking}
                    onChangeText={val => handleBookingChange('total_booking', val)}
                    editable={!isLocked}
                  />
                </View>
              </View>
            </View>

            {renderSalesTab()}
          </>
        )}

        {activeTab === 'Stock' && renderStockTab()}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      {activeTab === 'Sales' && (
        <View style={styles.footer}>
          {!isLocked ? (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
              <Text style={styles.submitBtnText}>{saving ? 'Saving...' : 'Save & Submit'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.lockedBanner}>
              <Text style={styles.lockedText}>🔒 This report has been locked. Please contact your administrator.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  dateToggle: { alignItems: 'flex-end', backgroundColor: '#f8f9fa', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dateToggleText: { fontSize: 12, color: '#CC0000', fontWeight: 'bold' },
  dateValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  statusLabel: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  timeSubtext: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#CC0000' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#CC0000' },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#CC0000', marginBottom: 12 },
  bookingCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bookingRow: { flexDirection: 'row', gap: 12 },
  bookingBox: { flex: 1 },
  bookingLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6 },
  bookingInput: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1a1a2e' },
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { backgroundColor: '#CC0000', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cardHeaderTotal: { color: 'white', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  cardBody: { padding: 12 },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  colorRowActive: { backgroundColor: '#fff5f5', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 },
  colorLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#ddd' },
  colorText: { fontSize: 14, color: '#1a1a2e', fontWeight: '500' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 30, height: 30, backgroundColor: '#f0f0f0', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, color: '#333', fontWeight: 'bold', lineHeight: 20 },
  qtyInput: { width: 40, height: 30, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: 'bold', padding: 0 },
  stockChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  stockChipText: { fontSize: 12, color: '#333', marginLeft: 6 },
  footer: { backgroundColor: 'white', padding: 16, flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 30 },
  draftBtn: { flex: 1, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ddd', padding: 16, borderRadius: 8, alignItems: 'center' },
  draftBtnText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
  submitBtn: { flex: 2, backgroundColor: '#CC0000', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  lockedBanner: { flex: 1, backgroundColor: '#f8d7da', padding: 16, borderRadius: 8, alignItems: 'center' },
  lockedText: { color: '#721c24', fontWeight: 'bold' }
});
