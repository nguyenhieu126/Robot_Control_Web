import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
  darkMode: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'app_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = Appearance.getColorScheme();
  const [mode, setMode] = useState<ThemeMode>(system === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
          setMode(saved);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    SecureStore.setItemAsync(STORAGE_KEY, newMode).catch(() => {
      // ignore store errors
    });
  };

  const toggleTheme = () => setThemeMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ darkMode: mode === 'dark', mode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
