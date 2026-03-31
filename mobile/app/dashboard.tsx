import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, SafeAreaView,
} from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
// eslint-disable-next-line import/no-unresolved
import { useRobotWS } from '../hooks/useRobotWS';

const MENU_ITEMS = [
  { id: 'connect',  icon: '📶', label: 'Connect',       desc: 'Manage device connections', color: '#1a6bff' },
  { id: 'manual',   icon: '✋', label: 'Manual Control', desc: 'Direct input override',     color: '#7c3aed' },
  { id: 'camera',   icon: '📷', label: 'Camera',         desc: 'Realtime onboard video',    color: '#059669' },
  { id: 'settings', icon: '⚙️', label: 'Settings',       desc: 'System preferences',        color: '#d97706' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { robotStatus, wsConnected } = useRobotWS();
  const robotConnected = !!robotStatus.robotConnected;

  let signalLevel = 0;
  if (robotConnected && robotStatus.rssi != null) {
    if (robotStatus.rssi >= -50) signalLevel = 4;
    else if (robotStatus.rssi >= -65) signalLevel = 3;
    else if (robotStatus.rssi >= -80) signalLevel = 2;
    else signalLevel = 1;
  }

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    router.replace('/login');
  };

  const { darkMode } = useTheme();
  const themeColors = darkMode ? Colors.dark : Colors.light;

  const handleCard = (id: string) => {
    if (id === 'connect')  router.push('/connect');
    if (id === 'manual')   router.push('/manual');
    if (id === 'camera')   router.push('/camera');
    if (id === 'settings') router.push('/settings');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}> 
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>📡</Text>
            <View>
              <Text style={[styles.logoTitle, { color: themeColors.text }]}>KaliVega</Text>
              <Text style={[styles.logoSub, { color: themeColors.subText }]}>Controller Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9', borderColor: themeColors.border }]} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={[styles.logoutText, { color: '#ef4444' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* ── CONNECTION BOX ── */}
        <View style={[styles.connBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.connRow}>
            <View style={styles.connStat}>
              <Text style={[styles.connLabel, { color: themeColors.subText }]}>Connection Status</Text>
              <View style={styles.connValRow}>
                <View style={[styles.dot, { backgroundColor: robotConnected ? '#00e5c3' : '#ef4444' }]} />
                <Text style={[styles.connVal, { color: themeColors.text }]}>{robotConnected ? 'Connected' : 'Disconnected'}</Text>
              </View>
            </View>
            <View style={[styles.connDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.connStat}>
              <Text style={[styles.connLabel, { color: themeColors.subText }]}>Device</Text>
              <Text style={[styles.connVal, { color: themeColors.subText }]}>
                {robotStatus.device || 'KaliVega-01'}
              </Text>
            </View>
          </View>

          <View style={[styles.connDividerH, { backgroundColor: themeColors.border }]} />

          <View style={styles.connRow}>
            <View style={styles.connStat}>
              <Text style={[styles.connLabel, { color: themeColors.subText }]}>Signal</Text>
              <View style={styles.signalRow}>
                {[1, 2, 3, 4].map(b => (
                  <View
                    key={b}
                    style={[
                      styles.signalBar,
                      { height: 4 + b * 4, backgroundColor: b <= signalLevel ? '#00e5c3' : '#334155' },
                    ]}
                  />
                ))}
                <Text style={styles.signalLabel}>
                  {!robotConnected ? 'No signal' :
                    signalLevel >= 4 ? 'Strong' :
                    signalLevel >= 3 ? 'Good' :
                    signalLevel >= 2 ? 'Weak' : 'Very weak'}
                </Text>
              </View>
            </View>
            <View style={[styles.connDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.connStat}>
              <Text style={[styles.connLabel, { color: themeColors.subText }]}>Protocol</Text>
              <View style={styles.connValRow}>
                <View style={[styles.dot, { backgroundColor: wsConnected ? '#00e5c3' : '#ef4444' }]} />
                <Text style={[styles.connVal, { color: themeColors.text }]}>{wsConnected ? 'WebSocket' : 'Offline'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── MENU CARDS ── */}
        <Text style={[styles.sectionLabel, { color: themeColors.subText }]}>Navigation</Text>
        <View style={styles.grid}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              onPress={() => handleCard(item.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBadge, { backgroundColor: item.color + '28' }]}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.cardLabel, { color: themeColors.text }]}>{item.label}</Text>
              <Text style={[styles.cardDesc, { color: themeColors.subText }]}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── STATUS BAR ── */}
        {robotStatus.uptime > 0 && (
          <View style={styles.statusBarRow}>
            <View style={[styles.chip, styles.chipNeutral]}>
              <Text style={styles.chipText}>
                ⏱ {Math.floor(robotStatus.uptime / 60)}m {robotStatus.uptime % 60}s
              </Text>
            </View>
            {robotStatus.rssi != null && (
              <View style={[styles.chip, styles.chipNeutral]}>
                <Text style={styles.chipText}>RSSI: {robotStatus.rssi} dBm</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1 },
  container:   { flex: 1 },
  content:     { padding: 16, paddingBottom: 40 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon:    { fontSize: 28 },
  logoTitle:   { fontSize: 20, fontWeight: '700' },
  logoSub:     { fontSize: 11 },
  logoutBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  logoutText:  { fontSize: 13, fontWeight: '600' },

  connBox:     { borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
  connRow:     { flexDirection: 'row', alignItems: 'center' },
  connStat:    { flex: 1 },
  connLabel:   { fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  connValRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connVal:     { fontSize: 13, fontWeight: '600' },
  connDivider: { width: 1, height: 36, marginHorizontal: 12 },
  connDividerH:{ height: 1, marginVertical: 14 },
  dot:         { width: 8, height: 8, borderRadius: 4 },

  signalRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  signalBar:   { width: 5, borderRadius: 2 },
  signalLabel: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },

  sectionLabel:{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:        {
    width: '47.5%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  iconBadge:   { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  cardIcon:    { fontSize: 24 },
  cardLabel:   { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardDesc:    { fontSize: 12, lineHeight: 17 },

  statusBarRow:{ flexDirection: 'row', gap: 8, marginTop: 20, flexWrap: 'wrap' },
  chip:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipNeutral: { backgroundColor: '#1e293b' },
  chipText:    { fontSize: 12, color: '#94a3b8' },
});
