import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, StatusBar, RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';

const getDateString = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export default function GodownDispatchScreen({ user }) {
  const [dispatchDate, setDispatchDate] = useState(getDateString(0));
  const [inventoryTree, setInventoryTree] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // items: { variant_color_id: qty }
  const [items, setItems] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, dealerRes] = await Promise.all([
        apiClient.get('/master/inventory-tree'),
        apiClient.get('/dealers')
      ]);
      
      if (invRes.data.success) {
        setInventoryTree(invRes.data.data);
      }
      
      if (dealerRes.data.success) {
        // Filter out godowns, we only dispatch to dealers and showrooms
        const targets = dealerRes.data.data.filter(d => d.role === 'dealer' || d.role === 'showroom' || (!d.role && d.dealer_type));
        setDealers(targets);
        if (targets.length > 0) {
            setSelectedDealerId(targets[0].id.toString());
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load master data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleQtyChange = (vcId, value) => {
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
    setItems(prev => ({ ...prev, [vcId]: (prev[vcId] || 0) + 1 }));
  };

  const decrementQty = (vcId) => {
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

  const parseDataForSave = () => {
    const itemsArray = Object.keys(items)
        .map(vcId => ({
            variant_color_id: parseInt(vcId, 10),
            quantity: items[vcId]
        }))
        .filter(i => i.quantity > 0);

    return {
        dealerId: parseInt(selectedDealerId, 10),
        date: dispatchDate,
        isOpeningStock: false,
        items: itemsArray,
    };
  };

  const handleSave = async () => {
    if (!selectedDealerId) {
      Alert.alert('Validation', 'Please select a destination.');
      return;
    }

    const data = parseDataForSave();
    if (data.items.length === 0) {
      Alert.alert('Validation', 'Please add at least one item to dispatch.');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post('/dispatches', data);
      if (response.data.success) {
        Alert.alert('Success', 'Dispatch created successfully.');
        setItems({});
      } else {
        Alert.alert('Error', response.data.message || 'Failed to dispatch.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.userFriendlyMessage || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Extract flat models with their colors
  const models = useMemo(() => {
    return inventoryTree.map(model => {
      const colors = model.variants.length > 0 ? model.variants[0].colors : [];
      return {
        id: model.id,
        name: model.name,
        type: model.type,
        colors: colors.sort((a, b) => a.color_name.localeCompare(b.color_name))
      };
    });
  }, [inventoryTree]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#CC0000" />
        <Text style={{ marginTop: 10 }}>Loading dispatch portal...</Text>
      </View>
    );
  }

  const totalItems = Object.values(items).reduce((sum, qty) => sum + qty, 0);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Dispatch</Text>
        <Text style={styles.headerSubtitle}>Send stock from Godown</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC0000']} />
        }
      >
        <View style={styles.card}>
          <Text style={styles.label}>Destination</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDealerId}
              onValueChange={(itemValue) => setSelectedDealerId(itemValue)}
              style={styles.picker}
            >
              {dealers.map((d) => (
                <Picker.Item key={d.id} label={`${d.name} (${d.dealer_code})`} value={d.id.toString()} />
              ))}
            </Picker>
          </View>
        </View>

        {models.map(model => {
            const hasAnyQty = model.colors.some(c => items[c.variant_color_id] > 0);
            return (
              <View key={model.id} style={[styles.modelGroup, hasAnyQty && styles.modelGroupActive]}>
                <View style={styles.modelHeaderRow}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelType}>{model.type}</Text>
                </View>

                {model.colors.map(color => {
                  const qty = items[color.variant_color_id] || 0;
                  return (
                    <View key={color.variant_color_id} style={styles.colorRow}>
                      <View style={styles.colorInfo}>
                        <View style={[styles.colorBox, { backgroundColor: color.hex_code || '#ccc' }]} />
                        <Text style={styles.colorName}>{color.color_name}</Text>
                      </View>
                      
                      <View style={styles.qtyControls}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => decrementQty(color.variant_color_id)}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="numeric"
                          value={qty > 0 ? qty.toString() : ''}
                          placeholder="0"
                          onChangeText={(val) => handleQtyChange(color.variant_color_id, val)}
                        />
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => incrementQty(color.variant_color_id)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={styles.fabContainer}>
        <View style={styles.fabInfo}>
          <Text style={styles.fabTotalLabel}>Total Items</Text>
          <Text style={styles.fabTotalValue}>{totalItems}</Text>
        </View>
        <TouchableOpacity 
            style={[styles.fabBtn, totalItems === 0 && styles.fabBtnDisabled]}
            onPress={handleSave}
            disabled={totalItems === 0 || saving}
        >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.fabBtnText}>Dispatch Stock</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#CC0000',
    padding: 20,
    paddingTop: 10,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginBottom: 10,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#ffd6d6', fontSize: 14, marginTop: 2 },
  scrollContent: { padding: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 'bold' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  picker: { height: 50, width: '100%' },
  modelGroup: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  modelGroupActive: { borderLeftColor: '#CC0000' },
  modelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  modelName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  modelType: { fontSize: 12, color: '#666', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  colorInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorBox: { width: 16, height: 16, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  colorName: { fontSize: 14, color: '#444' },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center'
  },
  qtyBtnText: { fontSize: 18, color: '#555', fontWeight: 'bold' },
  qtyInput: {
    width: 50, textAlign: 'center', fontSize: 16,
    fontWeight: 'bold', paddingVertical: 4
  },
  fabContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  fabInfo: { flex: 1 },
  fabTotalLabel: { fontSize: 12, color: '#888' },
  fabTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#CC0000' },
  fabBtn: {
    backgroundColor: '#CC0000',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  fabBtnDisabled: { backgroundColor: '#ccc' },
  fabBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
