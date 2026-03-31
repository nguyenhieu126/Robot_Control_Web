/**
 * screens/LoginScreen.js
 * Khớp chính xác authController.login():
 *   POST /api/auth/login { identifier, password }
 *   Response: { success, data: { token, role, user } }
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { login } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    const res = await login({ identifier: identifier.trim(), password });
    setLoading(false);

    if (res.success) {
      // res.data.token đã được lưu tự động trong api.js
      onLoginSuccess(res.data.user);
    } else {
      Alert.alert('Đăng nhập thất bại', res.error || 'Sai thông tin đăng nhập');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>🤖 Robot Control</Text>
        <Text style={styles.subtitle}>Đăng nhập để điều khiển</Text>

        <TextInput
          style={styles.input}
          placeholder="Username hoặc Email"
          placeholderTextColor="#666"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Đăng nhập</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#12121f',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1e1e30',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  btn: {
    backgroundColor: '#6c63ff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
