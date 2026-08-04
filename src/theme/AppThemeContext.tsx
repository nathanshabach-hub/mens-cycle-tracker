import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppColors } from '../types';
import { DEFAULT_APP_COLORS, getAppColors, saveAppColors } from '../utils/storage';

type AppThemeContextValue = {
  colors: AppColors;
  setColors: (next: AppColors) => Promise<void>;
  resetColors: () => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export const COLOR_PRESETS: Array<{ name: string; colors: AppColors }> = [
  {
    name: 'Teal',
    colors: {
      primary: '#00695C',
      secondary: '#00897B',
      background: '#F4F9F8',
      card: '#FFFFFF',
      text: '#333333',
      muted: '#888888',
    },
  },
  {
    name: 'Sunset',
    colors: {
      primary: '#C75B39',
      secondary: '#DE7C5A',
      background: '#FFF6F1',
      card: '#FFFFFF',
      text: '#3F2F2A',
      muted: '#8B7B75',
    },
  },
  {
    name: 'Ocean',
    colors: {
      primary: '#1E5AA8',
      secondary: '#2D7BC8',
      background: '#F2F7FF',
      card: '#FFFFFF',
      text: '#1E2E44',
      muted: '#6B7C93',
    },
  },
  {
    name: 'Forest',
    colors: {
      primary: '#355E3B',
      secondary: '#4D7C52',
      background: '#F3F8F2',
      card: '#FFFFFF',
      text: '#253029',
      muted: '#738176',
    },
  },
];

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColorsState] = useState<AppColors>(DEFAULT_APP_COLORS);

  useEffect(() => {
    let mounted = true;
    getAppColors().then((loaded) => {
      if (mounted) setColorsState(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setColors = useCallback(async (next: AppColors) => {
    setColorsState(next);
    await saveAppColors(next);
  }, []);

  const resetColors = useCallback(async () => {
    setColorsState(DEFAULT_APP_COLORS);
    await saveAppColors(DEFAULT_APP_COLORS);
  }, []);

  const value = useMemo(
    () => ({ colors, setColors, resetColors }),
    [colors, setColors, resetColors]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
