import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { request } from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { darkMode } = useTheme();
  const themeColors = darkMode ? Colors.dark : Colors.light;

  const handleLogin = async () => {
    setLoading(true);
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: email, password }),
    });
    setLoading(false);

    if (res.success) {
      await SecureStore.setItemAsync('accessToken', res.data.token);
      router.replace('/dashboard');
    } else {
      Alert.alert('Lỗi', res.error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
      <Text style={[styles.title, { color: themeColors.text }]}>Đăng nhập Robot Control</Text>
      <TextInput
        style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }]}
        placeholder="Email hoặc Username"
        placeholderTextColor={themeColors.subText}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }]}
        placeholder="Mật khẩu"
        placeholderTextColor={themeColors.subText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? 'Đang đăng nhập...' : 'Đăng nhập'} onPress={handleLogin} disabled={loading} />
      <Button title="Đăng ký" onPress={() => router.push('/register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
});