/**
 * screens/DashboardScreen.js
 * Kết hợp useRobotWS (giống web) + Joystick
 * 
 * sendDirect('JOYSTICK', { x, y }) → wsManager DIRECT_COMMAND → ESP32
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useRobotWS } from '../hooks/useRobotWS';
import Joystick from '../components/Joystick';
import { logout } from '../services/api';

export default function DashboardScreen({ user, onLogout }) {
  const { robotStatus, wsConnected, sendDirect } = useRobotWS();

  const handleJoystickMove = (x, y) => {
    // Khớp chính xác wsManager.js DIRECT_COMMAND format
    sendDirect('JOYSTICK', { x, y });
  };

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const isActive = wsConnected && robotStatus.robotConnected;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🤖 Robot Control</Text>
            <Text style={styles.headerSub}>Xin chào, {user?.username}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: wsConnected ? '#50fa7b' : '#ff5555' }]} />
            <Text style={styles.statusText}>
              Server: {wsConnected ? 'Đã kết nối' : 'Mất kết nối'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: robotStatus.robotConnected ? '#50fa7b' : '#ffb86c' }]} />
            <Text style={styles.statusText}>
              Robot: {robotStatus.robotConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Sensor Data từ ESP32 */}
        <View style={styles.sensorCard}>
          <Text style={styles.cardTitle}>Cảm biến ESP32</Text>
          <View style={styles.sensorGrid}>
            <SensorItem label="Mode"  value={robotStatus.mode} />
            <SensorItem label="RSSI"  value={robotStatus.rssi != null ? `${robotStatus.rssi} dBm` : '--'} />
            <SensorItem label="Trước" value={robotStatus.front != null ? `${robotStatus.front} cm` : '--'} />
            <SensorItem label="Trái"  value={robotStatus.left  != null ? `${robotStatus.left}  cm` : '--'} />
            <SensorItem label="Phải"  value={robotStatus.right != null ? `${robotStatus.right} cm` : '--'} />
            <SensorItem label="Sau"   value={robotStatus.back  != null ? `${robotStatus.back}  cm` : '--'} />
          </View>
        </View>

        {/* Joystick */}
        <View style={styles.joystickCard}>
          <Text style={styles.cardTitle}>Điều khiển Joystick</Text>
          {!isActive && (
            <Text style={styles.warningText}>
              {!wsConnected ? '⚠️ Chưa kết nối server' : '⚠️ Robot đang offline'}
            </Text>
          )}
          <View style={styles.joystickContainer}>
            <Joystick
              onMove={handleJoystickMove}
              onRelease={() => sendDirect('JOYSTICK', { x: 0, y: 0 })}
              disabled={!isActive}
            />
          </View>
          <Text style={styles.joystickHint}>Kéo để điều khiển robot</Text>
        </View>

        {/* Quick Commands */}
        <View style={styles.quickCard}>
          <Text style={styles.cardTitle}>Lệnh nhanh</Text>
          <View style={styles.quickGrid}>
            {['STOP', 'AUTO', 'MANUAL'].map(cmd => (
              <TouchableOpacity
                key={cmd}
                style={[styles.quickBtn, !isActive && styles.quickBtnDisabled]}
                onPress={() => sendDirect(cmd)}
                disabled={!isActive}
              >
                <Text style={styles.quickBtnText}>{cmd}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SensorItem({ label, value }) {
  return (
    <View style={styles.sensorItem}>
      <Text style={styles.sensorLabel}>{label}</Text>
      <Text style={styles.sensorValue}>{value ?? '--'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0f' },
  container: { flex: 1 },
  content:   { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub:   { color: '#666', fontSize: 12, marginTop: 2 },
  logoutBtn:   { padding: 8 },
  logoutText:  { color: '#ff5555', fontSize: 13 },

  statusCard: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    gap: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  statusText:{ color: '#ccc', fontSize: 14 },

  sensorCard: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardTitle:  { color: '#888', fontSize: 12, marginBottom: 12, textTransform: 'uppercase' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sensorItem: {
    backgroundColor: '#1e1e30',
    borderRadius: 8,
    padding: 10,
    minWidth: '30%',
    flex: 1,
  },
  sensorLabel: { color: '#666', fontSize: 11 },
  sensorValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },

  joystickCard: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    alignItems: 'center',
  },
  warningText:      { color: '#ffb86c', fontSize: 12, marginBottom: 12 },
  joystickContainer:{ marginVertical: 20 },
  joystickHint:     { color: '#444', fontSize: 12, marginTop: 8 },

  quickCard: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  quickGrid:          { flexDirection: 'row', gap: 8 },
  quickBtn:           { flex: 1, backgroundColor: '#1e1e30', borderRadius: 8, padding: 12, alignItems: 'center' },
  quickBtnDisabled:   { opacity: 0.4 },
  quickBtnText:       { color: '#fff', fontWeight: '600', fontSize: 13 },
});
