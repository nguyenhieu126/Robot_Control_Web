/**
 * App.js — Entry point
 * Check token tồn tại → redirect Dashboard / Login
 */
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import LoginScreen    from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import { getMe, logout } from './services/api';

export default function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra token còn hợp lệ không khi mở app
  useEffect(() => {
    async function checkAuth() {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const res = await getMe();
        if (res.success) {
          setUser(res.data);
        } else {
          // Token hết hạn — xóa đi
          await logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <DashboardScreen
      user={user}
      onLogout={() => setUser(null)}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
