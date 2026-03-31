import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';

// ⚠️ Đổi IP này thành IP server của bạn
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.77:5000';
const HEALTH_ENDPOINT = `${API_BASE}/api/camera/health`;
const STREAM_ENDPOINT = `${API_BASE}/api/camera/stream`;

function formatTime(ts: string | null) {
  if (!ts) return '--';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('vi-VN', { hour12: false });
}

export default function CameraScreen() {
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [streamStatus, setStreamStatus] = useState<'loading' | 'live' | 'offline'>('loading');
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [lastLiveAt, setLastLiveAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [streamKey, setStreamKey] = useState(0);
  const [cameraMeta, setCameraMeta] = useState<any>(null);

  const mountedRef = useRef(true);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

  const fetchHealth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(HEALTH_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!mountedRef.current) return;
      setLastCheckedAt(data?.lastCheckedAt || new Date().toISOString());
      if (!res.ok || !data?.success) {
        setHealthStatus('offline');
        setErrorMessage(data?.error || 'Camera health check failed');
        setCameraMeta(null);
      } else {
        setHealthStatus('online');
        setCameraMeta(data?.data || null);
        setErrorMessage('');
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      setHealthStatus('offline');
      setLastCheckedAt(new Date().toISOString());
      setErrorMessage(`Cannot reach camera: ${e.message}`);
      setCameraMeta(null);
    }
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    const attempt = ++retryCountRef.current;
    const backoff = Math.min(10000, 1500 * attempt);
    retryRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setStreamStatus('loading');
      setStreamKey(prev => prev + 1);
    }, backoff);
  }, []);

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    if (retryRef.current) clearTimeout(retryRef.current);
    setStreamStatus('loading');
    setErrorMessage('');
    setStreamKey(prev => prev + 1);
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    mountedRef.current = true;
    fetchHealth();
    healthRef.current = setInterval(fetchHealth, 7000);
    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (healthRef.current) clearInterval(healthRef.current);
    };
  }, [fetchHealth]);

  const { darkMode } = useTheme();
  const themeColors = darkMode ? Colors.dark : Colors.light;
  const streamUri = `${STREAM_ENDPOINT}?v=${streamKey}`;
  const isLive = streamStatus === 'live' && healthStatus === 'online';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}> 
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}> 
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.card }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: themeColors.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: themeColors.text }]}>Camera View</Text>
          <Text style={[styles.titleSub, { color: themeColors.subText }]}>Realtime onboard stream</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: isLive ? themeColors.success : themeColors.card }]}> 
          <View style={[styles.liveDot, { backgroundColor: isLive ? themeColors.success : themeColors.error }]} />
          <Text style={[styles.liveBadgeText, { color: themeColors.background }]}>{isLive ? 'Live' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── STREAM CARD ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}> 
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Robot Camera</Text>
            <TouchableOpacity style={[styles.retryBtn, { borderColor: themeColors.border }]} onPress={handleRetry} activeOpacity={0.7}>
              <Text style={[styles.retryText, { color: themeColors.subText }]}>↺ Retry</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.streamShell}>
            {/* Loading overlay */}
            {streamStatus === 'loading' && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={themeColors.tint} />
                <Text style={[styles.overlayText, { color: themeColors.subText }]}>Loading stream...</Text>
              </View>
            )}

            {/* Offline overlay */}
            {streamStatus === 'offline' && (
              <View style={[styles.overlay, { backgroundColor: darkMode ? 'rgba(10,15,30,0.9)' : 'rgba(255,255,255,0.85)' }]}>
                <Text style={[styles.overlayErrorIcon, { color: themeColors.text }]}>📷</Text>
                <Text style={[styles.overlayErrorTitle, { color: themeColors.text }]}>Camera offline</Text>
                <Text style={[styles.overlayErrorSub, { color: themeColors.subText }]}>{errorMessage || 'Unable to load stream'}</Text>
              </View>
            )}

            {/* Stream image */}
            <Image
              key={streamKey}
              source={{ uri: streamUri }}
              style={[styles.stream, streamStatus !== 'live' && styles.streamHidden]}
              resizeMode="contain"
              onLoad={() => {
                retryCountRef.current = 0;
                setStreamStatus('live');
                setLastLiveAt(new Date().toISOString());
                setErrorMessage('');
              }}
              onError={() => {
                setStreamStatus('offline');
                setErrorMessage('Camera stream interrupted. Retrying...');
                scheduleRetry();
              }}
            />
          </View>
        </View>

        {/* ── STATUS CARD ── */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}> 
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Connection Status</Text>
          {[
            { label: 'Source health', val: healthStatus === 'loading' ? 'Checking...' : healthStatus, ok: healthStatus === 'online' },
            { label: 'Stream',        val: streamStatus,  ok: streamStatus === 'live' },
            { label: 'Last health check', val: formatTime(lastCheckedAt), ok: true },
            { label: 'Last live frame',   val: formatTime(lastLiveAt),    ok: true },
            { label: 'Driver',   val: cameraMeta?.driver       || '--', ok: true },
            { label: 'Sensor',   val: cameraMeta?.sensor_model || '--', ok: true },
            { label: 'Resolution', val: cameraMeta?.width && cameraMeta?.height ? `${cameraMeta.width}x${cameraMeta.height}` : '--', ok: true },
            { label: 'Target FPS', val: String(cameraMeta?.fps || '--'), ok: true },
          ].map(item => (
            <View key={item.label} style={[styles.statRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.statLabel, { color: themeColors.subText }]}>{item.label}</Text>
              <Text style={[styles.statVal, { color: item.ok ? themeColors.text : themeColors.error }]}>
                {item.val}
              </Text>
            </View>
          ))}
          {errorMessage ? <Text style={[styles.errorText, { color: themeColors.subText }]}>{errorMessage}</Text> : null}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:       { flex: 1, backgroundColor: '#0a0f1e' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  backIcon:       { fontSize: 20, color: '#f1f5f9' },
  titleWrap:      { flex: 1 },
  title:          { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  titleSub:       { fontSize: 12, color: '#64748b' },
  liveBadge:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  liveBadgeOn:    { backgroundColor: '#064e3b' },
  liveBadgeOff:   { backgroundColor: '#1e293b' },
  liveDot:        { width: 7, height: 7, borderRadius: 4 },
  liveDotOn:      { backgroundColor: '#00e5c3' },
  liveDotOff:     { backgroundColor: '#ef4444' },
  liveBadgeText:  { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  scroll:         { flex: 1 },
  content:        { padding: 16, gap: 14, paddingBottom: 40 },

  card:           { backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  cardHead:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  retryBtn:       { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retryText:      { color: '#60a5fa', fontSize: 13, fontWeight: '600' },

  streamShell:    { height: 220, borderRadius: 10, backgroundColor: '#0f172a', overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  stream:         { width: '100%', height: '100%' },
  streamHidden:   { opacity: 0 },
  overlay:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10 },
  overlayText:    { color: '#94a3b8', fontSize: 14 },
  overlayError:   { backgroundColor: 'rgba(10,15,30,0.9)' },
  overlayErrorIcon: { fontSize: 40 },
  overlayErrorTitle:{ color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  overlayErrorSub:  { color: '#64748b', fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },

  statRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  statLabel:      { fontSize: 13, color: '#64748b' },
  statVal:        { fontSize: 13, fontWeight: '600' },
  textGreen:      { color: '#00e5c3' },
  textRed:        { color: '#ef4444' },
  errorText:      { color: '#ef4444', fontSize: 12, marginTop: 8 },
});
