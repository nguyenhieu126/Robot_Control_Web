import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch, Alert,
  StyleSheet, StatusBar,
} from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Profile { id: number; name: string; type: string; time: string; active: boolean }

const INITIAL_PROFILES: Profile[] = [
  { id: 1, name: 'RoboArm-X1',   type: 'Industrial',  time: '2 hours ago', active: true  },
  { id: 2, name: 'Workshop Arm', type: 'Educational', time: 'Yesterday',   active: false },
];

interface ToggleRowProps {
  icon: string;
  color: string;
  label: string;
  sub: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  themeColors: any;
}

function ToggleRow({ icon, color, label, sub, value, onToggle, themeColors }: ToggleRowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: themeColors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: color }]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: themeColors.text }]}>{label}</Text>
        <Text style={[styles.rowSub, { color: themeColors.subText }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: themeColors.border, true: '#1a6bff' }}
        thumbColor={value ? '#f1f5f9' : themeColors.subText}
      />
    </View>
  );
}

function NavRow({ icon, color, label, sub, last = false, themeColors }: { icon: string; color: string; label: string; sub: string; last?: boolean; themeColors: any }) {
  return (
    <View style={[styles.row, !last && [styles.rowBordered, { borderBottomColor: themeColors.border }]]}>
      <View style={[styles.rowIcon, { backgroundColor: color }]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: themeColors.text }]}>{label}</Text>
        <Text style={[styles.rowSub, { color: themeColors.subText }]}>{sub}</Text>
      </View>
      <Text style={[styles.chevron, { color: themeColors.subText }]}>›</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);

  const deleteProfile = (id: number) => {
    Alert.alert('Delete Profile', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          setProfiles(p => p.filter(pr => pr.id !== id));
          if (selectedProfile === id) setSelectedProfile(null);
        },
      },
    ]);
  };

  const addProfile = () => {
    Alert.prompt('New Profile', 'Enter profile name:', (name) => {
      if (!name) return;
      setProfiles(p => [...p, { id: Date.now(), name, type: 'Custom', time: 'Just now', active: false }]);
    });
  };

  const switchProfile = (id: number) => {
    setProfiles(p => p.map(pr => ({ ...pr, active: pr.id === id })));
    setSelectedProfile(null);
  };

  const themeColors = darkMode ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.card }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: themeColors.text }]}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
          <Text style={[styles.titleSub, { color: themeColors.subText }]}>App preferences</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── APPEARANCE ── */}
        <Text style={[styles.sectionLabel, { color: themeColors.subText }]}>APPEARANCE</Text>
        <View style={[styles.group, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <ToggleRow
            icon={darkMode ? '🌙' : '☀️'}
            color={darkMode ? '#1a2a4a' : '#f59e0b'}
            label={darkMode ? 'Dark Mode' : 'Light Mode'}
            sub={darkMode ? 'Dark theme enabled' : 'Light theme enabled'}
            value={darkMode}
            onToggle={(_v) => toggleTheme()}
            themeColors={themeColors}
          />
        </View>

        {/* ── NOTIFICATIONS ── */}
        <Text style={[styles.sectionLabel, { color: themeColors.subText }]}>NOTIFICATIONS</Text>
        <View style={[styles.group, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <ToggleRow
            icon="🔔"
            color="#00c9a7"
            label="Push Notifications"
            sub="Alerts and updates"
            value={notifications}
            onToggle={setNotifications}
            themeColors={themeColors}
          />
        </View>

        {/* ── GENERAL ── */}
        <Text style={[styles.sectionLabel, { color: themeColors.subText }]}>GENERAL</Text>
        <View style={[styles.group, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <NavRow icon="📶" color="#1a6bff" label="Network Settings"   sub="Wi-Fi & BLE config" themeColors={themeColors} />
          <NavRow icon="🛡" color="#059669" label="Privacy & Security" sub="Permissions & data" themeColors={themeColors} />
          <NavRow icon="ℹ️" color="#0ea5e9" label="About"              sub="Version info" last themeColors={themeColors} />
        </View>

        {/* ── DEVICE PROFILES ── */}
        <View style={styles.profilesHeader}>
          <Text style={[styles.sectionLabel, { color: themeColors.subText }]}>DEVICE PROFILES</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: themeColors.tint }]} onPress={addProfile} activeOpacity={0.7}>
            <Text style={[styles.addBtnText, { color: themeColors.background }]}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.group}>
          {profiles.length === 0 && (
            <Text style={[styles.emptyMsg, { color: themeColors.subText }]}>No profiles. Tap + Add to create one.</Text>
          )}
          {profiles.map((profile, i) => (
            <View key={profile.id}>
              <TouchableOpacity
                style={[styles.profileRow, selectedProfile === profile.id && styles.profileRowSelected]}
                onPress={() => setSelectedProfile(selectedProfile === profile.id ? null : profile.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.profileAvatar, profile.active && styles.profileAvatarActive]}>
                  <Text style={styles.profileAvatarText}>👤</Text>
                </View>
                <View style={styles.profileText}>
                  <View style={styles.profileNameRow}>
                    <Text style={[styles.profileName, { color: themeColors.text }]}>{profile.name}</Text>
                    {profile.active && <View style={[styles.activeBadge, { backgroundColor: themeColors.success }]}><Text style={[styles.activeBadgeText, { color: themeColors.background }]}>Active</Text></View>}
                  </View>
                  <Text style={[styles.profileMeta, { color: themeColors.subText }]}>{profile.type} · {profile.time}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProfile(profile.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {selectedProfile === profile.id && !profile.active && (
                <TouchableOpacity style={styles.switchBtn} onPress={() => switchProfile(profile.id)} activeOpacity={0.8}>
                  <Text style={styles.switchBtnText}>Switch to this profile</Text>
                </TouchableOpacity>
              )}

              {i < profiles.length - 1 && <View style={styles.profileDivider} />}
            </View>
          ))}
        </View>

        {/* ── VERSION ── */}
        <View style={styles.versionCard}>
          <Text style={styles.versionTitle}>KaliVega Controller</Text>
          <Text style={styles.versionNum}>Version 1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1 },
  backBtn:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backIcon:      { fontSize: 20 },
  title:         { fontSize: 18, fontWeight: '700' },
  titleSub:      { fontSize: 12 },

  scroll:        { flex: 1 },
  content:       { padding: 16, paddingBottom: 50 },
  sectionLabel:  { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  group:         { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },

  row:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBordered:   { borderBottomWidth: 1 },
  rowIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowIconText:   { fontSize: 20 },
  rowText:       { flex: 1 },
  rowLabel:      { fontSize: 15, fontWeight: '600' },
  rowSub:        { fontSize: 12, marginTop: 2 },
  chevron:       { fontSize: 20 },

  profilesHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn:        { backgroundColor: '#1a6bff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  addBtnText:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyMsg:      { textAlign: 'center', padding: 16, fontSize: 13 },

  profileRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  profileRowSelected: { },
  profileAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  profileAvatarActive:{ borderColor: '#1a6bff' },
  profileAvatarText: { fontSize: 18 },
  profileText:   { flex: 1 },
  profileNameRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName:   { fontSize: 15, fontWeight: '600' },
  profileMeta:   { fontSize: 12, marginTop: 2 },
  activeBadge:   { backgroundColor: '#1a6bff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText:{ fontSize: 10, color: '#fff', fontWeight: '700' },
  deleteBtn:     { padding: 4 },
  deleteBtnText: { fontSize: 18 },
  profileDivider:{ height: 1, marginLeft: 66 },
  switchBtn:     { backgroundColor: '#1a6bff', marginHorizontal: 14, marginBottom: 14, borderRadius: 10, padding: 10, alignItems: 'center' },
  switchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  versionCard:   { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', marginTop: 20 },
  versionTitle:  { fontSize: 14, fontWeight: '700' },
  versionNum:    { fontSize: 12, marginTop: 4 },
});
