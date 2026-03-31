import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { request } from '../services/api';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { darkMode } = useTheme();
  const themeColors = darkMode ? Colors.dark : Colors.light;

  const handleRegister = async () => {
    setLoading(true);
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    setLoading(false);

    if (res.success) {
      Alert.alert('Thành công', 'Đăng ký thành công, quay lại đăng nhập');
      router.replace('/login');
    } else {
      Alert.alert('Lỗi', res.error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
      <Text style={[styles.title, { color: themeColors.text }]}>Đăng ký</Text>
      <TextInput
        style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }]}
        placeholder="Username"
        placeholderTextColor={themeColors.subText}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }]}
        placeholder="Email"
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
      <Button title={loading ? 'Đang đăng ký...' : 'Đăng ký'} onPress={handleRegister} disabled={loading} />
      <Button title="Quay lại" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
});