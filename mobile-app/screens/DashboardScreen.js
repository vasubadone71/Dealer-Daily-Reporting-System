import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, StatusBar, TouchableOpacity
} from 'react-native';
import apiClient from '../utils/apiClient';

export default function DashboardScreen({ dealer }) {
  const [report, setReport] = useState(null);
  const [stockOverview, setStockOverview] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingDispatches, setPendingDispatches] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodayData = async () => {
    try {
      const [reportRes, stockRes, notifyRes, dispatchRes, perfRes] = await Promise.all([
        apiClient.get('/reports/today'),
        apiClient.get('/reports/today-stock'),
        apiClient.get('/notifications'),
        apiClient.get('/dispatches'),
        apiClient.get(`/dealers/${dealer.id}/performance`)
      ]);

      if (reportRes.data.success) {
        setReport(reportRes.data.data);
      }
      if (stockRes.data.success) {
        setStockOverview(stockRes.data.data);
      }
      if (notifyRes.data.success) {
        setNotifications(notifyRes.data.data || []);
      }
      if (dispatchRes.data.success) {
        setPendingDispatches(dispatchRes.data.data.filter(d => d.status === 'Pending') || []);
      }
      if (perfRes.data.success) {
        setPerformance(perfRes.data.data);
      }
    } catch (e) {
      console.error('Fetch dashboard data failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return '#27ae60';
      case 'Pending': return '#f39c12';
      case 'Late': return '#e74c3c';
      case 'Not Sent': return '#757575';
      default: return '#f39c12'; // Draft/Unsubmitted
    }
  };

  const handleDispatchAction = async (dispatchId, action) => {
    try {
      const res = await apiClient.put(`/dispatches/${dispatchId}/status`, { status: action });
      if (res.data.success) {
        // Refresh data
        fetchTodayData();
      }
    } catch (e) {
      console.error('Dispatch action failed:', e);
    }
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CC0000']} />
      }
    >
      <StatusBar backgroundColor="#CC0000" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.dealerName}>{dealer.name}</Text>
            <Text style={styles.dealerMeta}>
              Code: <Text style={{ fontWeight: 'bold' }}>{dealer.dealer_code}</Text> | Type: <Text style={{ fontWeight: 'bold' }}>{dealer.dealer_type}</Text>
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{dealer.dealer_code.substring(0, 2)}</Text>
          </View>
        </View>
      </View>

      {/* Today's Date */}
      <View style={styles.dateBar}>
        <Text style={styles.dateText}>
          📅 {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <View style={styles.content}>
        
        {/* Performance & Target Card */}
        {performance && (
          <View style={[styles.card, { paddingBottom: 16 }]}>
            <View style={styles.perfHeader}>
              <View>
                <Text style={styles.perfTitle}>Monthly Performance</Text>
                <Text style={styles.perfScore}>{performance.overallScore}/100 - {performance.rating}</Text>
              </View>
              <Text style={styles.perfStars}>
                {'⭐'.repeat(performance.stars)}{'☆'.repeat(5 - performance.stars)}
              </Text>
            </View>
            <View style={styles.targetContainer}>
              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>Retail Target</Text>
                <Text style={styles.targetValue}>{performance.totalRetail} / {performance.targetQty}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(100, performance.targetPercent)}%`, backgroundColor: performance.targetPercent >= 100 ? '#27ae60' : '#CC0000' }
                ]} />
              </View>
              <Text style={styles.targetPercent}>{performance.targetPercent}% Achieved</Text>
            </View>
          </View>
        )}

        {/* Today's Status Card */}
        <Text style={styles.sectionTitle}>Today's Reporting Status</Text>
        {loading ? (
          <ActivityIndicator color="#CC0000" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.card}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(report ? report.status : 'Not Started') + '15' }
            ]}>
              <Text style={[
                styles.statusText, 
                { color: getStatusColor(report ? report.status : 'Not Started') }
              ]}>
                {report ? (
                  report.status === 'Submitted' ? '✅ Submitted & Locked' :
                  report.status === 'Pending' ? '🟡 Draft Saved (Unsubmitted)' :
                  report.status === 'Not Sent' ? '❌ Missed & Locked' : '🔴 Late'
                ) : '📝 Not Started (No Entry)'}
              </Text>
            </View>

            <Text style={styles.cardDesc}>
              {report ? (
                report.status === 'Submitted' || report.status === 'Locked'
                  ? `Your report was finalized at ${new Date(report.submitted_at.endsWith('Z') ? report.submitted_at : report.submitted_at.replace(' ', 'T') + 'Z').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}. Editing is disabled.`
                  : report.status === 'Not Sent'
                  ? 'The submission deadline has passed (9:30 PM). This report is closed.'
                  : 'You have a saved draft. Make sure to review and hit "Final Submit" before 9:30 PM to lock it.'
              ) : 'Please fill out your daily sales and stock report. Unsubmitted drafts will be automatically locked as NOT SENT at 9:30 PM.'}
            </Text>

            {stockOverview && (
              <View style={styles.stockOverviewContainer}>
                <Text style={styles.stockOverviewTitle}>Daily Stock Summary</Text>
                
                <View style={styles.stockGrid}>
                  <View style={styles.stockGridItem}>
                    <Text style={styles.stockGridLabel}>Opening</Text>
                    <Text style={styles.stockGridValue}>{stockOverview.totalOpening}</Text>
                  </View>
                  <View style={styles.stockGridItem}>
                    <Text style={styles.stockGridLabel}>Dispatched</Text>
                    <Text style={[styles.stockGridValue, {color: '#27ae60'}]}>+{stockOverview.totalDispatched}</Text>
                  </View>
                  <View style={styles.stockGridItem}>
                    <Text style={styles.stockGridLabel}>Retail</Text>
                    <Text style={[styles.stockGridValue, {color: '#e74c3c'}]}>-{stockOverview.totalRetail}</Text>
                  </View>
                  <View style={[styles.stockGridItem, styles.stockGridClosing]}>
                    <Text style={styles.stockGridLabelClosing}>Closing Stock</Text>
                    <Text style={styles.stockGridValueClosing}>{stockOverview.totalClosing}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Pending Dispatches */}
        {pendingDispatches.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Dispatches</Text>
            {pendingDispatches.map(dispatch => {
              // Correctly compute total from items array (column is 'quantity' in dispatch_items)
              const totalQty = (dispatch.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
              
              // Build a compact model breakdown string
              const modelSummary = (() => {
                const modelMap = {};
                (dispatch.items || []).forEach(item => {
                  const key = item.model_name || 'Vehicle';
                  if (!modelMap[key]) modelMap[key] = 0;
                  modelMap[key] += item.quantity || 0;
                });
                return Object.entries(modelMap).map(([m, q]) => `${m}: ${q}`).join(', ') || `${totalQty} vehicles`;
              })();

              return (
                <View key={dispatch.id} style={styles.dispatchCard}>
                  <View style={styles.dispatchHeader}>
                    <Text style={styles.dispatchTitle}>🚚 Dispatch #{dispatch.id}</Text>
                    <Text style={styles.dispatchDate}>{dispatch.date}</Text>
                  </View>
                  <Text style={styles.dispatchDesc}>
                    You have received a dispatch of{' '}
                    <Text style={{fontWeight: 'bold', color: '#CC0000'}}>{totalQty} vehicles</Text>.
                    {'\n'}<Text style={{color: '#555', fontSize: 13}}>{modelSummary}</Text>
                    {'\n'}Please verify physical delivery before accepting.
                  </Text>
                  <View style={styles.dispatchActions}>
                    <TouchableOpacity 
                      style={[styles.btn, styles.btnReject]} 
                      onPress={() => handleDispatchAction(dispatch.id, 'Rejected')}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.btn, styles.btnAccept]} 
                      onPress={() => handleDispatchAction(dispatch.id, 'Accepted')}
                    >
                      <Text style={styles.btnText}>Verify & Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Recent System Alerts */}
        <Text style={styles.sectionTitle}>System Notifications & Alerts</Text>
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent notifications or reminders</Text>
          </View>
        ) : (
          notifications.map((item, idx) => (
            <View key={item.id || idx} style={styles.notifyItem}>
              <View style={styles.notifyHeader}>
                <Text style={styles.notifyBadge}>
                  {item.type === 'urgent' ? '🚨 URGENT' : '📢 PUSH'}
                </Text>
                <Text style={styles.notifyTime}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <Text style={styles.notifyTitle}>{item.title}</Text>
              <Text style={styles.notifyBody}>{item.message}</Text>
            </View>
          ))
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  dealerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 4,
  },
  dealerMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dateBar: {
    backgroundColor: '#b30000',
    padding: 10,
    paddingHorizontal: 24,
  },
  dateText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  perfTitle: {
    fontSize: 13,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  perfScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 2,
  },
  perfStars: {
    fontSize: 20,
  },
  targetContainer: {
    marginTop: 8,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  targetValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetPercent: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 10,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  stockOverviewContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stockOverviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  stockGridItem: {
    width: '47%',
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  stockGridClosing: {
    width: '100%',
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderColor: 'rgba(204,0,0,0.2)',
  },
  stockGridLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  stockGridValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stockGridLabelClosing: {
    fontSize: 13,
    color: '#CC0000',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stockGridValueClosing: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CC0000',
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
  notifyItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  notifyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifyBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'var(--primary-color)',
    backgroundColor: 'rgba(204,0,0,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notifyTime: {
    fontSize: 11,
    color: '#999999',
  },
  notifyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  notifyBody: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  dispatchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f39c12',
    shadowColor: '#f39c12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dispatchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  dispatchDate: {
    fontSize: 13,
    color: '#666',
    fontWeight: 'bold',
  },
  dispatchDesc: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 16,
  },
  dispatchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReject: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  btnAccept: {
    backgroundColor: '#27ae60',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fff',
  },
});
