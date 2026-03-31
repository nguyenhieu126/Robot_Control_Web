import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, StatusBar,
} from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// ⚠️ Đổi IP này thành IP server của bạn
const WS_URL_DEFAULT = process.env.WS_URL_DEFAULT || 'ws://192.168.0.77:5000/ws/dashboard';

const STATE_NAMES: Record<string, string> = {
  '-1': 'Unknown', '0': 'Idle', '1': 'Moving',
  '2': 'Obstacle Detected', '3': 'Emergency Stop', '4': 'Calibrating',
};

interface LogEntry { ts: string; msg: string; type: 'info' | 'success' | 'warn' | 'error' }

export default function ConnectScreen() {
  const router = useRouter();
  const [wsState, setWsState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [robotConnected, setRobotConnected] = useState(false);
  const [robotStatus, setRobotStatus] = useState<any>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [serverUrl, setServerUrl] = useState(WS_URL_DEFAULT);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(WS_URL_DEFAULT);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    const ts = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLog(prev => [...prev.slice(-49), { ts, msg, type }]);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsState('disconnected');
    setRobotConnected(false);
    addLog('Disconnected manually.', 'warn');
  }, [addLog]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
    setWsState('connecting');
    addLog(`Connecting to ${serverUrl} …`, 'info');

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsState('connected');
        addLog('WebSocket connected to server.', 'success');
      };
      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsState('disconnected');
        setRobotConnected(false);
        addLog('Connection closed. Retrying in 3s…', 'warn');
        reconnectRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        addLog('WebSocket error.', 'error');
        ws.close();
      };
      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'STATUS') {
            setRobotStatus(msg.data);
            setRobotConnected(msg.data?.robotConnected ?? false);
          } else if (msg.type === 'ROBOT_CONNECTED') {
            setRobotConnected(msg.data?.connected ?? false);
            addLog(
              msg.data?.connected ? 'ESP32 connected to server!' : 'ESP32 disconnected.',
              msg.data?.connected ? 'success' : 'warn'
            );
          } else if (msg.type === 'WELCOME') {
            addLog(`Server: ${msg.data?.message}`, 'success');
          }
        } catch {}
      };
    } catch (err: any) {
      setWsState('error');
      addLog(`Failed: ${err.message}`, 'error');
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, [serverUrl, addLog]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [connect]);

  const handleManualConnect = () => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    connect();
  };

  const { darkMode } = useTheme();
  const themeColors = darkMode ? Colors.dark : Colors.light;
  const wsLabel = { connecting: 'Connecting…', connected: 'Connected', disconnected: 'Disconnected', error: 'Error' }[wsState];
  const wsBadgeColor = wsState === 'connected' ? themeColors.success : wsState === 'connecting' ? themeColors.info : wsState === 'error' ? themeColors.error : themeColors.warning;
  const espBadgeColor = robotConnected ? themeColors.success : themeColors.warning;
  const statusColorMap = {
    connected: themeColors.success,
    connecting: themeColors.info,
    error: themeColors.error,
    disconnected: themeColors.warning,
  } as const;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.card }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: themeColors.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: themeColors.text }]}>Connect</Text>
          <Text style={[styles.titleSub, { color: themeColors.subText }]}>Device connection manager</Text>
        </View>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: wsBadgeColor }]}> 
            <View style={[styles.pillDot, { backgroundColor: themeColors.background }]} />
            <Text style={[styles.pillText, { color: themeColors.text }]}>Server</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: espBadgeColor }]}> 
            <View style={[styles.pillDot, { backgroundColor: themeColors.background }]} />
            <Text style={[styles.pillText, { color: themeColors.text }]}>ESP32</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── SERVER URL ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.subText }]}>Server WebSocket URL</Text>
          {editingUrl ? (
            <View>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
                value={urlDraft}
                onChangeText={setUrlDraft}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={themeColors.subText}
              />
              <View style={styles.urlBtns}>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => { setServerUrl(urlDraft); setEditingUrl(false); }}>
                  <Text style={styles.btnPrimaryText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnGhost, { borderColor: themeColors.border }]} onPress={() => { setEditingUrl(false); setUrlDraft(serverUrl); }}>
                  <Text style={[styles.btnGhostText, { color: themeColors.subText }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.urlRow}>
              <Text style={[styles.urlDisplay, { color: themeColors.info }]} numberOfLines={1}>{serverUrl}</Text>
              <TouchableOpacity style={[styles.btn, styles.btnGhost, styles.btnSm, { borderColor: themeColors.border }]} onPress={() => { setEditingUrl(true); setUrlDraft(serverUrl); }}>
                <Text style={[styles.btnGhostText, { color: themeColors.subText }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── CONNECTION STATUS ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.subText }]}>Connection Status</Text>
          <View style={styles.statusBlock}>
            <Text style={styles.statusIcon}>
              {wsState === 'connected' ? '✅' : wsState === 'connecting' ? '⏳' : wsState === 'error' ? '❌' : '🔌'}
            </Text>
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: statusColorMap[wsState] }]}>{wsLabel}</Text>
              <Text style={[styles.statusUrl, { color: themeColors.subText }]} numberOfLines={1}>{serverUrl}</Text>
            </View>
          </View>
          {wsState !== 'connected' ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, styles.btnFull]}
              onPress={handleManualConnect}
              disabled={wsState === 'connecting'}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>{wsState === 'connecting' ? '⏳ Connecting…' : 'Connect'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.btnDanger, styles.btnFull]} onPress={disconnect} activeOpacity={0.8}>
              <Text style={styles.btnDangerText}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── ESP32 DEVICE ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.subText }]}>ESP32 Device</Text>
          <View style={[styles.deviceRow, { backgroundColor: robotConnected ? `${themeColors.success}22` : themeColors.card }]}>
            <Text style={styles.deviceIcon}>🤖</Text>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceName, { color: themeColors.text }]}>KaliVega-ESP32</Text>
              <Text style={[styles.deviceState, { color: themeColors.subText }]}>{robotConnected ? 'Online' : 'Offline — waiting for ESP32…'}</Text>
            </View>
            <View style={[styles.deviceDot, { backgroundColor: robotConnected ? themeColors.success : themeColors.border }]} />
          </View>

          {robotStatus && robotConnected && (
            <View style={styles.statsGrid}>
              {[
                { label: 'Mode',     val: robotStatus.mode ?? '—' },
                { label: 'State',    val: STATE_NAMES[String(robotStatus.state)] ?? String(robotStatus.state) ?? '—' },
                { label: 'RSSI',     val: robotStatus.rssi != null ? `${robotStatus.rssi} dBm` : '—' },
                { label: 'Uptime',   val: robotStatus.uptime != null ? `${robotStatus.uptime}s` : '—' },
              ].map(item => (
                <View key={item.label} style={[styles.stat, { backgroundColor: themeColors.background }]}>
                  <Text style={[styles.statLabel, { color: themeColors.subText }]}>{item.label}</Text>
                  <Text style={[styles.statVal, { color: themeColors.text }]}>{item.val}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── CONNECTION LOG ── */}
        <View style={[styles.card, styles.logCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.logHeader}>
            <Text style={[styles.cardTitle, { color: themeColors.subText }]}>Connection Log</Text>
            <TouchableOpacity style={[styles.btn, styles.btnGhost, styles.btnSm, { borderColor: themeColors.border }]} onPress={() => setLog([])}>
              <Text style={[styles.btnGhostText, { color: themeColors.subText }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.log}>
            {log.length === 0 && <Text style={[styles.logEmpty, { color: themeColors.subText }]}>No events yet…</Text>}
            {[...log].reverse().map((entry, i) => (
              <View key={i} style={styles.logRow}>
                <Text style={[styles.logTs, { color: themeColors.subText }]}>{entry.ts}</Text>
                <Text style={[styles.logMsg, { color: entry.type === 'success' ? themeColors.success : entry.type === 'warn' ? themeColors.warning : entry.type === 'error' ? themeColors.error : themeColors.subText }]}>{entry.msg}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, borderBottomWidth: 1 },
  backBtn:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 20 },
  titleWrap:   { flex: 1 },
  title:       { fontSize: 18, fontWeight: '700' },
  titleSub:    { fontSize: 12 },
  pills:       { flexDirection: 'row', gap: 6 },
  pill:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  pillOn:      { backgroundColor: '#064e3b' },
  pillOff:     { },
  pillDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e5c3' },
  pillText:    { fontSize: 11, fontWeight: '600' },

  scroll:      { flex: 1 },
  content:     { padding: 16, gap: 14, paddingBottom: 40 },

  card:        { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  urlRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  urlDisplay:  { flex: 1, fontSize: 13, color: '#60a5fa', fontFamily: 'monospace' },
  urlBtns:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  input:       { borderRadius: 8, borderWidth: 1, padding: 10, fontSize: 13, fontFamily: 'monospace', marginBottom: 8 },

  btn:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary:  { backgroundColor: '#1a6bff' },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost:    { backgroundColor: 'transparent', borderWidth: 1 },
  btnGhostText:{ fontSize: 13 },
  btnDanger:   { backgroundColor: '#7f1d1d' },
  btnDangerText:{ color: '#fca5a5', fontWeight: '700', fontSize: 14 },
  btnFull:     { marginTop: 12 },
  btnSm:       { paddingHorizontal: 10, paddingVertical: 6 },

  statusBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  statusIcon:  { fontSize: 28 },
  statusText:  { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusUrl:   { fontSize: 12, marginTop: 2 },
  textGreen:   { color: '#00e5c3' },
  textBlue:    { color: '#60a5fa' },
  textRed:     { color: '#ef4444' },
  textYellow:  { color: '#fbbf24' },
  textMuted:   { },

  deviceRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 12, marginBottom: 12 },
  deviceOn:    { backgroundColor: '#064e3b33' },
  deviceOff:   { },
  deviceIcon:  { fontSize: 28 },
  deviceInfo:  { flex: 1 },
  deviceName:  { fontSize: 14, fontWeight: '700' },
  deviceState: { fontSize: 12, marginTop: 2 },
  deviceDot:   { width: 10, height: 10, borderRadius: 5 },
  deviceDotOn: { backgroundColor: '#00e5c3' },

  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat:        { width: '48%', borderRadius: 10, padding: 10 },
  statLabel:   { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  statVal:     { fontSize: 14, fontWeight: '600' },

  logCard:     { minHeight: 200 },
  logHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  log:         { gap: 4 },
  logEmpty:    { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  logRow:      { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  logTs:       { fontSize: 11, fontFamily: 'monospace', minWidth: 70 },
  logMsg:      { fontSize: 12, flex: 1 },
});
