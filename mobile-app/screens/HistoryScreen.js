import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native';
import apiClient from '../utils/apiClient';

const SC_MODELS = [
  { key: 'activa_110_std', name: 'Activa 110 Std' },
  { key: 'activa_110_dlx', name: 'Activa 110 DLX' },
  { key: 'activa_h_smart', name: 'Activa H Smart' },
  { key: 'activa_125', name: 'Activa 125' },
  { key: 'activa_125_h_smart', name: 'Activa 125 H Smart' }
];

const MC_MODELS = [
  { key: 'cb_hornet125', name: 'CB Hornet 125' },
  { key: 'shine100dx', name: 'Shine 100 DX' },
  { key: 'sp160', name: 'SP 160' },
  { key: 'sp125_drum', name: 'SP 125 Drum' },
  { key: 'sp125_disc', name: 'SP 125 Disc' },
  { key: 'shine125_drum', name: 'Shine 125 Drum' },
  { key: 'shine125_disc', name: 'Shine 125 Disc' },
  { key: 'shine100', name: 'Shine 100' },
  { key: 'shine100_2b', name: 'Shine 100 2B' },
  { key: 'hornet2_0', name: 'Hornet 2.0' }
];

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/reports/history');
      const resData = response.data;

      if (resData.success) {
        setHistory(resData.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return '#27ae60';
      case 'Late': return '#e74c3c';
      case 'Not Sent': return '#757575';
      default: return '#95a5a6';
    }
  };

  // Compute totals helper
  const getTotals = (report) => {
    if (!report || report.status !== 'Submitted') return { sales: 0, stock: 0 };
    
    let sales = 0;
    let stock = 0;

    SC_MODELS.forEach(m => {
      sales += report.sales_data?.[m.key] || 0;
      stock += report.stock_data?.[m.key] || 0;
    });

    MC_MODELS.forEach(m => {
      sales += report.sales_data?.[m.key] || 0;
      stock += report.stock_data?.[m.key] || 0;
    });

    return { sales, stock };
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC0000']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Submission History</Text>
        <Text style={styles.headerSub}>Audit reports submitted in the last 30 days</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color="#CC0000" size="large" style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No historical submission records found</Text>
          </View>
        ) : (
          history.map(item => {
            const isExpanded = expandedRows[item.id];
            const { sales: totalSales, stock: totalStock } = getTotals(item);
            
            return (
              <View key={item.id} style={styles.historyCard}>
                <TouchableOpacity 
                  style={styles.cardHeader} 
                  onPress={() => item.status === 'Submitted' && toggleRow(item.id)}
                  activeOpacity={item.status === 'Submitted' ? 0.7 : 1}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateText}>
                      📅 {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                    {item.status === 'Submitted' ? (
                      <Text style={styles.summaryText}>
                        Sales: <Text style={styles.bold}>{totalSales}</Text> | Stock: <Text style={styles.bold}>{totalStock}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.summaryText}>No metrics available</Text>
                    )}
                  </View>
                  
                  <View style={styles.rightSide}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                    {item.status === 'Submitted' && (
                      <Text style={styles.expandIndicator}>{isExpanded ? '▲' : '▼'}</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Expanded Details Grid */}
                {isExpanded && item.status === 'Submitted' && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />
                    
                    {/* Sales Column */}
                    <Text style={styles.groupHeader}>🛵 Sales Summary</Text>
                    <View style={styles.modelGrid}>
                      {[...SC_MODELS, ...MC_MODELS].map(m => (
                        <View key={m.key} style={styles.gridItem}>
                          <Text style={styles.gridLabel}>{m.name}</Text>
                          <Text style={styles.gridVal}>{item.sales_data?.[m.key] || 0}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Bookings details */}
                    <View style={styles.divider} />
                    <View style={styles.bookingsRow}>
                      <Text style={styles.bookingText}>Today's Bookings: <Text style={styles.bold}>{item.sales_data?.today_booking || 0}</Text></Text>
                      <Text style={styles.bookingText}>Monthly Bookings: <Text style={styles.bold}>{item.sales_data?.total_booking || 0}</Text></Text>
                    </View>

                    {/* Stock Column */}
                    <View style={styles.divider} />
                    <Text style={[styles.groupHeader, { color: '#1a1a2e' }]}>📦 Stock Inventory</Text>
                    <View style={styles.modelGrid}>
                      {[...SC_MODELS, ...MC_MODELS].map(m => (
                        <View key={m.key} style={styles.gridItem}>
                          <Text style={styles.gridLabel}>{m.name}</Text>
                          <Text style={styles.gridVal}>{item.stock_data?.[m.key] || 0}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  header: {
    backgroundColor: '#CC0000',
    padding: 24,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  emptyText: {
    color: '#999999',
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  summaryText: {
    fontSize: 12,
    color: '#777777',
    marginTop: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  expandIndicator: {
    fontSize: 10,
    color: '#bbbbbb',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#fafbfc',
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#CC0000',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef0f2',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 11,
    color: '#666666',
    flex: 1,
  },
  gridVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  bookingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bookingText: {
    fontSize: 12,
    color: '#555555',
  },
});
