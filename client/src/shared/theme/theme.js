export const THEME_STORAGE_KEY = 'ryda.theme';

export const THEME_OPTIONS = [
  { id: 'dark-plus', name: 'Dark+', mode: 'dark', colors: ['#1e1e1e', '#0f9f8f'] },
  { id: 'kimbie-dark', name: 'Kimbie Dark', mode: 'dark', colors: ['#29211f', '#d8a657'] },
  { id: 'abyss', name: 'Abyss', mode: 'dark', colors: ['#071a2c', '#4dd9ff'] },
  { id: 'red', name: 'Red', mode: 'dark', colors: ['#251b20', '#f06c76'] },
  { id: 'monokai-dimmed', name: 'Monokai Dimmed', mode: 'dark', colors: ['#242424', '#a6e22e'] },
  { id: 'solarized-dark', name: 'Solarized Dark', mode: 'dark', colors: ['#002b36', '#2aa198'] },
  { id: 'tomorrow-night-blue', name: 'Tomorrow Night Blue', mode: 'dark', colors: ['#002451', '#80cbc4'] },
  { id: 'quiet-light', name: 'Quiet Light', mode: 'light', colors: ['#f5f5f5', '#3c8c83'] },
  { id: 'light-plus', name: 'Light+', mode: 'light', colors: ['#ffffff', '#09665d'] },
  { id: 'solarized-light', name: 'Solarized Light', mode: 'light', colors: ['#fdf6e3', '#268bd2'] }
];

export const THEME_PREFERENCES = [{ id: 'system', name: 'System default', mode: 'system', colors: ['#fdf6e3', '#002b36'] }, ...THEME_OPTIONS];

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_PREFERENCES.some((theme) => theme.id === stored) ? stored : 'system';
}

export function resolveTheme(preference) {
  if (preference !== 'system') return preference;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-plus' : 'light-plus';
}
