import React, { useState, useEffect, useLayoutEffect } from 'react';
import { ThemeContext } from '@/hooks/useTheme';

type Theme = 'dark' | 'light';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

const applyTheme = (theme: Theme, storageKey: string) => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  localStorage.setItem(storageKey, theme);
};

export const ThemeProvider = ({
  children,
  defaultTheme = 'dark',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Применяем тему сразу при инициализации (синхронно)
  useLayoutEffect(() => {
    applyTheme(theme, storageKey);
  }, [storageKey, theme]);

  // Обновляем тему при изменении
  useEffect(() => {
    applyTheme(theme, storageKey);
  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
