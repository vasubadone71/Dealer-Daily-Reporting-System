import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import apiClient from '../utils/apiClient';

export default function RetailTargetsScreen({ navigation, route }) {
  const { dealer } = route.params;
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('remaining'); // 'remaining', 'achievement', 'name'

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const res = await apiClient.get(`/dealers/${dealer.id}/performance`);
      if (res.data.success) {
        setPerformance(res.data.data);
      }
    } catch (e) {
      console.error('Fetch performance failed', e);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return '#27ae60'; // Green
    if (percent >= 80) return '#f39c12';  // Yellow/Orange
    if (percent >= 50) return '#e67e22';  // Orange
    return '#CC0000';                     // Red
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#CC0000" />
      </View>
    );
  }

  if (!performance || !performance.modelWisePerformance) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No target data available.</Text>
      </View>
    );
  }

  let models = [...performance.modelWisePerformance];
  
  // Sort logic
  models.sort((a, b) => {
    // Focus models always on top
    if (a.isFocus && !b.isFocus) return -1;
    if (!a.isFocus && b.isFocus) return 1;

    if (sortBy === 'remaining') {
      return b.remaining - a.remaining; // Highest remaining first
    } else if (sortBy === 'achievement') {
      return b.achievementPercent - a.achievementPercent; // Highest achievement first
    } else {
      return a.modelName.localeCompare(b.modelName); // Alphabetical
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Retail Targets</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Monthly Overall</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Target</Text>
              <Text style={styles.summaryValue}>{performance.targetQty}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Achieved</Text>
              <Text style={[styles.summaryValue, { color: '#27ae60' }]}>{performance.totalRetail}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text style={[styles.summaryValue, { color: '#f39c12' }]}>{Math.max(0, performance.targetQty - performance.totalRetail)}</Text>
            </View>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${Math.min(100, performance.targetPercent)}%`, backgroundColor: getProgressColor(performance.targetPercent) }]} />
          </View>
          <Text style={styles.summaryPercent}>{performance.targetPercent}% Achieved</Text>
        </View>

        {/* Sorting Options */}
        <View style={styles.sortContainer}>
          <TouchableOpacity style={[styles.sortBtn, sortBy === 'remaining' && styles.sortBtnActive]} onPress={() => setSortBy('remaining')}>
            <Text style={[styles.sortText, sortBy === 'remaining' && styles.sortTextActive]}>By Remaining</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortBtn, sortBy === 'achievement' && styles.sortBtnActive]} onPress={() => setSortBy('achievement')}>
            <Text style={[styles.sortText, sortBy === 'achievement' && styles.sortTextActive]}>By Achievement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortBtn, sortBy === 'name' && styles.sortBtnActive]} onPress={() => setSortBy('name')}>
            <Text style={[styles.sortText, sortBy === 'name' && styles.sortTextActive]}>By Name</Text>
          </TouchableOpacity>
        </View>

        {/* Model Cards */}
        {models.map((m, idx) => (
          <View key={idx} style={[styles.modelCard, m.isFocus && styles.modelCardFocus]}>
            <View style={styles.modelHeader}>
              <Text style={[styles.modelName, m.isFocus && { color: '#CC0000' }]}>
                {m.isFocus && '⭐ '}{m.modelName}
              </Text>
              <Text style={[styles.modelPercent, { color: getProgressColor(m.achievementPercent) }]}>{m.achievementPercent}%</Text>
            </View>
            
            <View style={styles.modelStatsRow}>
              <Text style={styles.modelStat}>Target: <Text style={styles.bold}>{m.targetQty}</Text></Text>
              <Text style={styles.modelStat}>Retail: <Text style={styles.bold}>{m.totalRetail}</Text></Text>
              <Text style={styles.modelStat}>Remaining: <Text style={[styles.bold, { color: '#CC0000' }]}>{m.remaining}</Text></Text>
            </View>
            
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(100, m.achievementPercent)}%`, backgroundColor: getProgressColor(m.achievementPercent) }]} />
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#777' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#CC0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backBtn: { padding: 5, width: 60 },
  backText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scroll: { padding: 15 },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 15, textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryBox: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 5 },
  summaryValue: { fontSize: 22, fontWeight: '900', color: '#1a1a2e' },
  barBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  summaryPercent: { textAlign: 'right', marginTop: 8, fontSize: 12, fontWeight: 'bold', color: '#555' },
  sortContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sortBtn: { flex: 1, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#eee', alignItems: 'center' },
  sortBtnActive: { backgroundColor: '#CC0000' },
  sortText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  sortTextActive: { color: 'white' },
  modelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  modelCardFocus: {
    borderColor: '#ffcccc',
    backgroundColor: '#fffcfc'
  },
  modelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modelName: { fontSize: 16, fontWeight: '900', color: '#1a1a2e' },
  modelPercent: { fontSize: 16, fontWeight: '900' },
  modelStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modelStat: { fontSize: 13, color: '#555' },
  bold: { fontWeight: 'bold', color: '#1a1a2e' }
});
