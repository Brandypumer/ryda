import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ANIMATION_STORAGE_KEY, DISPLAY_MODE_STORAGE_KEY, getStoredAnimationPreference, getStoredDisplayMode, getStoredTheme, getTheme, resolveAppearanceTheme, THEME_STORAGE_KEY } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getStoredTheme);
  const [displayMode, setDisplayModeState] = useState(getStoredDisplayMode);
  const [animationPreference, setAnimationPreferenceState] = useState(getStoredAnimationPreference);
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const activeTheme = resolveAppearanceTheme(preference, displayMode, systemDark);
  const shouldReduceMotion = animationPreference === 'reduced' || (animationPreference === 'full' && prefersReducedMotion);

  useEffect(() => {
    const colorMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateColor = (event) => setSystemDark(event.matches);
    const updateMotion = (event) => setPrefersReducedMotion(event.matches);
    colorMedia.addEventListener?.('change', updateColor);
    motionMedia.addEventListener?.('change', updateMotion);
    return () => { colorMedia.removeEventListener?.('change', updateColor); motionMedia.removeEventListener?.('change', updateMotion); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = activeTheme;
    root.dataset.themePreference = preference;
    root.dataset.displayMode = displayMode;
    root.dataset.animationPreference = animationPreference;
    root.classList.toggle('reduce-motion', shouldReduceMotion);
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, displayMode);
    window.localStorage.setItem(ANIMATION_STORAGE_KEY, animationPreference);
  }, [activeTheme, animationPreference, displayMode, preference, shouldReduceMotion]);

  useEffect(() => { if (!isPanelOpen) return undefined; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, [isPanelOpen]);

  const setPreference = (themeId) => { if (themeId === 'system') { setPreferenceState('system'); setDisplayModeState('system'); return; } const theme = getTheme(themeId); setPreferenceState(theme.id); setDisplayModeState(theme.mode); };
  const setDisplayMode = (mode) => { setDisplayModeState(mode); if (mode !== 'system' && getTheme(preference).mode !== mode) setPreferenceState(mode === 'dark' ? 'dark-plus' : 'light-plus'); };
  const resetAppearance = () => { setPreferenceState('light-plus'); setDisplayModeState('system'); setAnimationPreferenceState('full'); };
  const value = useMemo(() => ({ preference, activeTheme, displayMode, animationPreference, isSystemDark: systemDark, prefersReducedMotion, isPanelOpen, setPreference, setTheme: setPreference, setDisplayMode, setAnimationPreference: setAnimationPreferenceState, resetAppearance, openPanel: () => setPanelOpen(true), closePanel: () => setPanelOpen(false) }), [activeTheme, animationPreference, displayMode, isPanelOpen, prefersReducedMotion, preference, systemDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error('useTheme must be used within ThemeProvider.'); return context; }
