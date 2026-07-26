import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Dealer Screens ────────────────────────────────────────────
import DashboardScreen     from './DashboardScreen';
import ReportEntryScreen   from './ReportEntryScreen';
import LedgerScreen        from './LedgerScreen';
import InboxScreen         from './InboxScreen';
import ProfileScreen       from './ProfileScreen';
import RetailTargetsScreen from './RetailTargetsScreen';
import ActivityLogScreen   from './ActivityLogScreen';

// ── Network Manager Screens ───────────────────────────────────
import NMDashboardScreen   from './NMDashboardScreen';
import NMDealersScreen     from './NMDealersScreen';
import NMReportsScreen     from './NMReportsScreen';
import NMNotificationsScreen from './NMNotificationsScreen';

// ── Godown Screens ────────────────────────────────────────────
import GodownDispatchScreen from './GodownDispatchScreen';

// ── Tab bar definitions ───────────────────────────────────────
const DEALER_TABS = [
  { key: 'Dashboard',    label: 'Dashboard',   icon: '📊' },
  { key: 'TodayReport',  label: 'Report Entry', icon: '📝' },
  { key: 'Ledger',       label: 'Stock',       icon: '📦' },
  { key: 'Inbox',        label: 'Inbox',       icon: '📥' },
  { key: 'Logs',         label: 'Logs',        icon: '🕒' },
  { key: 'Profile',      label: 'Profile',     icon: '👤' },
];

const SHOWROOM_TABS = [
  { key: 'Dashboard',    label: 'Dashboard',   icon: '📊' },
  { key: 'TodayReport',  label: 'Report Entry', icon: '📝' },
  { key: 'Dispatch',     label: 'Transfer',    icon: '🚚' },
  { key: 'Ledger',       label: 'Stock',       icon: '📦' },
  { key: 'Logs',         label: 'Logs',        icon: '🕒' },
  { key: 'Profile',      label: 'Profile',     icon: '👤' },
];

const GODOWN_TABS = [
  { key: 'Dashboard',    label: 'Dashboard',   icon: '📊' },
  { key: 'Dispatch',     label: 'Dispatch',    icon: '🚚' },
  { key: 'Ledger',       label: 'Stock',       icon: '📦' },
  { key: 'Logs',         label: 'Logs',        icon: '🕒' },
  { key: 'Profile',      label: 'Profile',     icon: '👤' },
];

const NM_TABS = [
  { key: 'NMDashboard',  label: 'Dashboard',   icon: '📊' },
  { key: 'NMDealers',    label: 'Dealers',     icon: '👥' },
  { key: 'NMReports',    label: 'Reports',     icon: '📋' },
  { key: 'NMAlerts',     label: 'Alerts',      icon: '🔔' },
  { key: 'Logs',         label: 'Logs',        icon: '🕒' },
  { key: 'Profile',      label: 'Profile',     icon: '👤' },
];

export default function MainNavigator({ dealer, user: userProp, onLogout }) {
  // Support both old `dealer` prop and new `user` prop
  const user = userProp || dealer;
  const role = user?.role || 'dealer';

  const TABS = 
    role === 'network_manager' ? NM_TABS : 
    role === 'godown' ? GODOWN_TABS : 
    role === 'showroom' ? SHOWROOM_TABS : 
    DEALER_TABS;

  const defaultTab = role === 'network_manager' ? 'NMDashboard' : 'Dashboard';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderScreen = () => {
    // ── Network Manager screens ────────────────────────────────
    if (role === 'network_manager') {
      switch (activeTab) {
        case 'NMDashboard': return <NMDashboardScreen user={user} />;
        case 'NMDealers':   return <NMDealersScreen user={user} />;
        case 'NMReports':   return <NMReportsScreen user={user} />;
        case 'NMAlerts':    return <NMNotificationsScreen user={user} />;
        case 'Profile':
          return <ProfileScreen dealer={user} onLogout={onLogout} isNM />;
        case 'Logs':
          return <ActivityLogScreen user={user} />;
        default:            return <NMDashboardScreen user={user} />;
      }
    }

    // ── Dealer / Showroom / Godown screens ────────────────────────
    switch (activeTab) {
      case 'Dashboard':   
        return <DashboardScreen 
                 dealer={user} 
                 navigation={{ navigate: (screen) => setActiveTab(screen) }} 
               />;
      case 'TodayReport': return <ReportEntryScreen dealer={user} />;
      case 'Ledger':      return <LedgerScreen />;
      case 'Inbox':       return <InboxScreen dealer={user} />;
      case 'Dispatch':    return <GodownDispatchScreen user={user} />;
      case 'Logs':        return <ActivityLogScreen user={user} />;
      case 'Profile':     return <ProfileScreen dealer={user} onLogout={onLogout} />;
      case 'RetailTargets': 
        return <RetailTargetsScreen 
                 route={{ params: { dealer: user } }} 
                 navigation={{ goBack: () => setActiveTab('Dashboard') }} 
               />;
      default:            
        return <DashboardScreen 
                 dealer={user} 
                 navigation={{ navigate: (screen) => setActiveTab(screen) }} 
               />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>{renderScreen()}</View>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    position: 'relative',
  },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#999999', marginTop: 4, fontWeight: '500' },
  tabLabelActive: { color: '#CC0000', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', top: 0, width: 28, height: 3,
    backgroundColor: '#CC0000', borderRadius: 2,
  },
});
