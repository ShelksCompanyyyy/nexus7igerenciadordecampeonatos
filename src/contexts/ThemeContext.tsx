import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'neon' | 'midnight' | 'gold' | 'matrix';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'nexel.theme';

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-neon', 'theme-midnight', 'theme-gold', 'theme-matrix');
  if (t === 'light') root.classList.add('theme-light');
  if (t === 'neon') root.classList.add('theme-neon');
  if (t === 'midnight') root.classList.add('theme-midnight');
  if (t === 'gold') root.classList.add('theme-gold');
  if (t === 'matrix') root.classList.add('theme-matrix');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}