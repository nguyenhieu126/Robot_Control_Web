import { useColorScheme as reactNativeColorScheme } from 'react-native';
import { useTheme } from '@/app/providers/theme-provider';

export function useColorScheme() {
  try {
    const { mode } = useTheme();
    return mode;
  } catch {
    return reactNativeColorScheme() ?? 'light';
  }
}

