import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredTheme, resolveTheme, THEME_STORAGE_KEY } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredTheme);
  const activeTheme = resolveTheme(preference);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = activeTheme;
    root.dataset.themePreference = preference;
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [activeTheme, preference]);

  useEffect(() => {
    if (preference !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => document.documentElement.dataset.theme = resolveTheme('system');
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [preference]);

  const value = useMemo(() => ({ preference, activeTheme, setPreference }), [activeTheme, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}
