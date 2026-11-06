import { THEME_PREFERENCES } from './theme';
import { useTheme } from './ThemeProvider';

export default function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <section aria-labelledby="theme-selector-title" className="app-card p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-bold text-slate-900" id="theme-selector-title">Appearance</h2>
          <p className="mt-1 text-sm text-slate-600">Choose a RYDA theme. Your preference is saved on this device.</p>
        </div>
        <span className="rounded-full bg-ryda-50 px-3 py-1 text-xs font-semibold text-ryda-800">{preference === 'system' ? 'System' : 'Custom theme'}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="listbox" aria-label="Theme options" aria-activedescendant={`theme-${preference}`}>
        {THEME_PREFERENCES.map((theme) => (
          <button
            aria-selected={preference === theme.id}
            className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition ${preference === theme.id ? 'border-ryda-600 ring-2 ring-ryda-100' : 'border-slate-200 hover:border-ryda-400 hover:shadow-sm'}`}
            id={`theme-${theme.id}`}
            key={theme.id}
            onClick={() => setPreference(theme.id)}
            role="option"
            type="button"
          >
            <span aria-hidden="true" className="flex h-9 w-12 shrink-0 overflow-hidden rounded-md border border-black/10">
              <span className="w-1/2" style={{ backgroundColor: theme.colors[0] }} />
              <span className="w-1/2" style={{ backgroundColor: theme.colors[1] }} />
            </span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{theme.name}</span><span className="text-xs capitalize text-slate-500">{theme.mode}</span></span>
            {preference === theme.id && <span aria-label="Selected" className="ml-auto text-sm font-bold text-ryda-700">✓</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
