import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar,
} from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
// eslint-disable-next-line import/no-unresolved
import Joystick from '../../components/Joystick';
// eslint-disable-next-line import/no-unresolved
import { useRobotWS } from '../../hooks/useRobotWS';
// eslint-disable-next-line import/no-unresolved
import { useRobotApi } from '../../hooks/useRobotApi';

const STATE_NAMES: Record<number, string> = {
  0: 'INIT', 1: 'NORMAL', 2: 'SLOW', 3: 'AVOID_L', 4: 'AVOID_R',
  5: 'TURN_L', 6: 'TURN_R', 7: 'BACKING', 8: 'STOP', 9: 'EMERGENCY',
  10: 'MANUAL', 11: 'ESCAPE',
};

export default function ManualScreen() {
  const router = useRouter();
  const { robotStatus, wsConnected, sendDirect } = useRobotWS();
  const { sendCommand, setMode } = useRobotApi();

  const [speed, setSpeed] = useState(120);
  const [joyXY, setJoyXY] = useState({ x: 0, y: 0 });
  const [toggling, setToggling] = useState(false);

  const joystickActive = useRef(false);
  const joystickVal = useRef({ x: 0, y: 0 });
  const speedRef = useRef(speed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const isManual = robotStatus.mode === 'MANUAL';
  const robotOnline = robotStatus.robotConnected;
  const stateName = STATE_NAMES[robotStatus.state] ?? `ST(${robotStatus.state})`;

  // Joystick send loop every 150ms
  useEffect(() => {
    if (!isManual) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const { x, y } = joystickVal.current;
      if (!joystickActive.current && x === 0 && y === 0) return;
      const spd = Math.round(-y * speedRef.current);
      const str = Math.round(x * 45);
      sendDirect('JOYSTICK', { speed: spd, steer: str });
    }, 150);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isManual, sendDirect]);

  const handleJoyChange = useCallback((nx: number, ny: number) => {
    joystickActive.current = true;
    joystickVal.current = { x: nx, y: ny };
    setJoyXY({ x: nx, y: ny });
  }, []);

  const handleJoyRelease = useCallback(() => {
    joystickActive.current = false;
    joystickVal.current = { x: 0, y: 0 };
    setJoyXY({ x: 0, y: 0 });
    sendDirect('JOYSTICK', { speed: 0, steer: 0 });
    sendDirect('STOP', null);
  }, [sendDirect]);

  const handleToggleMode = useCallback(async () => {
    setToggling(true);
    const next = isManual ? 'AUTONOMOUS' : 'MANUAL';
    if (!isManual) await sendCommand('STOP', null);
    await setMode(next);
  }, [isManual, sendCommand, setMode]);

  const { darkMode } = useTheme();
  const themeColors = darkMode ? Colors.dark : Colors.light;

  useEffect(() => {
    if (toggling) setToggling(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotStatus.mode]);

  const handleStop = useCallback(() => {
    sendDirect('STOP', null);
    sendCommand('STOP', null);
  }, [sendDirect, sendCommand]);

  const handleEmergency = useCallback(() => {
    sendDirect('STOP', null);
    sendDirect('JOYSTICK', { speed: 0, steer: 0 });
    sendCommand('STOP', null);
  }, [sendDirect, sendCommand]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}> 
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}> 
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.card }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: themeColors.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: themeColors.text }]}>Manual Control</Text>
          <Text style={[styles.titleSub, { color: themeColors.subText }]}>Direct robot control</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            {
              backgroundColor: isManual ? themeColors.success : themeColors.card,
              borderWidth: isManual ? 0 : 1,
              borderColor: isManual ? 'transparent' : themeColors.border,
            },
          ]}
          onPress={handleToggleMode}
          disabled={toggling}
          activeOpacity={0.8}
        >
          <Text style={[styles.modeBtnText, { color: isManual ? themeColors.background : themeColors.text }]}>
            {toggling ? '⏳' : isManual ? '✋ MANUAL' : '⚡ AUTO'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── OFFLINE BANNER ── */}
      {!robotOnline && (
        <View style={[styles.banner, { backgroundColor: themeColors.warning, borderColor: themeColors.error }]}> 
          <Text style={[styles.bannerText, { color: themeColors.background }]}>⚠ ESP32 chưa kết nối — lệnh sẽ gửi khi robot online</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── JOYSTICK CARD ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}> 
          <View style={styles.cardHead}>
            <View>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Drive Control</Text>
              <Text style={[styles.cardSub, { color: themeColors.subText }]}>Joystick Control</Text>
            </View>
            <View style={styles.coords}>
              <Text style={[styles.coordLabel, { color: themeColors.subText }]}>X</Text>
              <Text style={[styles.coordVal, { color: themeColors.tint }]}>{joyXY.x >= 0 ? '+' : ''}{joyXY.x.toFixed(2)}</Text>
              <View style={[styles.coordSep, { backgroundColor: themeColors.border }]} />
              <Text style={[styles.coordLabel, { color: themeColors.subText }]}>Y</Text>
              <Text style={[styles.coordVal, { color: themeColors.tint }]}>{joyXY.y >= 0 ? '+' : ''}{joyXY.y.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.joyArea}>
            <Joystick
              onChange={handleJoyChange}
              onRelease={handleJoyRelease}
              disabled={!isManual}
              size={220}
            />
            {!isManual && (
              <View style={styles.joyLock}>
                <Text style={styles.joyLockIcon}>🔒</Text>
                <Text style={styles.joyLockText}>Chế độ AUTONOMOUS đang hoạt động</Text>
                <Text style={styles.joyLockSub}>Nhấn nút MANUAL để điều khiển thủ công</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── SPEED SLIDER ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}> 
          <View style={styles.sliderHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Speed</Text>
              <Text style={[styles.cardSub, { color: themeColors.subText }]}>Range: 0 – 255</Text>
            </View>
            <View style={styles.sliderValWrap}>
              <Text style={[styles.sliderVal, { color: themeColors.tint }]}>{speed}</Text>
              <Text style={[styles.sliderUnit, { color: themeColors.subText }]}> units</Text>
            </View>
          </View>
          <View style={styles.sliderRow}>
            <TouchableOpacity
              style={[styles.sliderBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1 }]}
              onPress={() => setSpeed(Math.max(0, speed - 10))}
            >
              <Text style={[styles.sliderBtnText, { color: themeColors.text }]}>−</Text>
            </TouchableOpacity>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={255}
              step={5}
              value={speed}
              onValueChange={setSpeed}
              minimumTrackTintColor={themeColors.tint}
              maximumTrackTintColor={themeColors.border}
              thumbTintColor={themeColors.tint}
            />
            <TouchableOpacity
              style={[styles.sliderBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1 }]}
              onPress={() => setSpeed(Math.min(255, speed + 10))}
            >
              <Text style={[styles.sliderBtnText, { color: themeColors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sliderTicks}>
            <Text style={[styles.tickText, { color: themeColors.subText }]}>0</Text>
            <Text style={[styles.tickText, { color: themeColors.subText }]}>128</Text>
            <Text style={[styles.tickText, { color: themeColors.subText }]}>255</Text>
          </View>
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1, opacity: !isManual ? 0.4 : 1 }]}
            onPress={handleStop}
            disabled={!isManual}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionIcon, { color: themeColors.text }]}>⏹</Text>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>STOP</Text>
            <Text style={[styles.actionSub, { color: themeColors.subText }]}>Dừng xe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: themeColors.error, borderColor: themeColors.error }]}
            onPress={handleEmergency}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionIcon, { color: themeColors.background }]}>🛑</Text>
            <Text style={[styles.actionLabel, { color: themeColors.background }]}>Emergency</Text>
            <Text style={[styles.actionSub, { color: themeColors.background }]}>Dừng khẩn cấp</Text>
          </TouchableOpacity>
        </View>

        {/* ── STATUS BAR ── */}
        <View style={styles.statusBar}>
          <View style={[styles.chip, { backgroundColor: isManual ? themeColors.success : themeColors.info }] }>
            <View style={[styles.chipDot, { backgroundColor: themeColors.background }]} />
            <Text style={[styles.chipText, { color: isManual ? themeColors.background : themeColors.text }]}>{robotStatus.mode}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: themeColors.card }]}> 
            <Text style={[styles.chipText, { color: themeColors.subText }]}>State: {stateName}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: wsConnected ? themeColors.success : themeColors.error }] }>
            <View style={[styles.chipDot, { backgroundColor: themeColors.background }]} />
            <Text style={[styles.chipText, { color: themeColors.background }]}>{wsConnected ? 'WS Connected' : 'WS Offline'}</Text>
          </View>
          {robotStatus.rssi != null && (
            <View style={[styles.chip, { backgroundColor: themeColors.card }]}> 
              <Text style={[styles.chipText, { color: themeColors.subText }]}>RSSI: {robotStatus.rssi} dBm</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: '#0a0f1e' },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn:      { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  backIcon:     { fontSize: 20, color: '#f1f5f9' },
  titleWrap:    { flex: 1 },
  title:        { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  titleSub:     { fontSize: 12, color: '#64748b' },
  modeBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  modeBtnManual:{ backgroundColor: '#7c3aed' },
  modeBtnAuto:  { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  modeBtnText:  { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },

  banner:       { backgroundColor: '#422006', margin: 12, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#92400e' },
  bannerText:   { color: '#fbbf24', fontSize: 13 },

  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, gap: 16, paddingBottom: 40 },

  card:         { backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle:    { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  cardSub:      { fontSize: 12, color: '#64748b', marginTop: 2 },

  coords:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordLabel:   { fontSize: 11, color: '#64748b', fontWeight: '700' },
  coordVal:     { fontSize: 13, fontWeight: '600', color: '#1a6bff', fontVariant: ['tabular-nums'] },
  coordSep:     { width: 1, height: 16, backgroundColor: '#1e293b', marginHorizontal: 4 },

  joyArea:      { alignItems: 'center', paddingVertical: 8, position: 'relative' },
  joyLock:      {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,15,30,0.85)',
    alignItems: 'center', justifyContent: 'center', borderRadius: 12,
  },
  joyLockIcon:  { fontSize: 40, marginBottom: 8 },
  joyLockText:  { color: '#f1f5f9', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  joyLockSub:   { color: '#64748b', fontSize: 12, marginTop: 4, textAlign: 'center' },

  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sliderValWrap:{ flexDirection: 'row', alignItems: 'baseline' },
  sliderVal:    { fontSize: 32, fontWeight: '700', color: '#1a6bff' },
  sliderUnit:   { fontSize: 13, color: '#64748b' },
  sliderRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slider:       { flex: 1, height: 40 },
  sliderBtn:    { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  sliderBtnText:{ fontSize: 20, color: '#f1f5f9', lineHeight: 24 },
  sliderTicks:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tickText:     { fontSize: 11, color: '#475569' },

  actionRow:    { flexDirection: 'row', gap: 12 },
  actionBtn:    { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  btnStop:      { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  btnEmergency: { backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#991b1b' },
  btnDisabled:  { opacity: 0.4 },
  actionIcon:   { fontSize: 26 },
  actionLabel:  { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  actionSub:    { fontSize: 11, color: '#64748b' },

  statusBar:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  chipManual:   { backgroundColor: '#4c1d95' },
  chipAuto:     { backgroundColor: '#1e293b' },
  chipNeutral:  { backgroundColor: '#1e293b' },
  chipOk:       { backgroundColor: '#064e3b' },
  chipErr:      { backgroundColor: '#7f1d1d' },
  chipDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e5c3' },
  chipText:     { fontSize: 12, color: '#94a3b8' },
});
