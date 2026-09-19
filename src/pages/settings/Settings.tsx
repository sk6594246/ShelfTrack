import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, RefreshCw } from 'lucide-react';
import { ChevronRight, QrCode, Trash2, Moon, Sun, Palette } from 'lucide-react';
import { useQRMapping } from '../../hooks/useQRMapping';
import { mappingSummary } from '../../lib/qr';
import {
  ACCENT_PRESETS,
  getAccent,
  getThemeMode,
  setAccent,
  setThemeMode,
  type ThemeMode,
} from '../../store/themeStore';
import {
  isGasEnabled,
  isD1Enabled,
  getBackendUrl,
  getGasWebAppUrl,
  ensureTenant,
} from '../../lib/gasApi';
import { getLocations, getCategories, getPartners } from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import { toast } from '../../components/ui/Toast';

export function Settings() {
  const { config } = useQRMapping();
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());
  const [accent, setAccentState] = useState(() => getAccent());
  const [customHex, setCustomHex] = useState(() => getAccent());
  const gasOn = isGasEnabled();
  const gasUrl = getGasWebAppUrl();
  const [syncing, setSyncing] = useState(false);

  function clearAllData() {
    if (window.confirm('Delete all products and settings? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  function onMode(next: ThemeMode) {
    setMode(setThemeMode(next));
  }

  function onAccent(hex: string) {
    const v = setAccent(hex);
    setAccentState(v);
    setCustomHex(v);
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6 st-page">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
          Settings
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--st-muted)' }}>
          Theme, sheet sync, scanning, and data
        </p>
      </header>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Appearance
        </p>
        <div
          className="space-y-4 overflow-hidden rounded-2xl border p-4 shadow-sm"
          style={{
            background: 'var(--st-surface)',
            borderColor: 'var(--st-border)',
          }}
        >
          <div>
            <div
              className="mb-2 flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--st-text)' }}
            >
              <Sun className="h-4 w-4" style={{ color: 'var(--st-primary)' }} />
              Day / Night
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onMode('day')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  mode === 'day' ? 'ring-2 ring-offset-0' : ''
                }`}
                style={{
                  borderColor: mode === 'day' ? 'var(--st-primary)' : 'var(--st-border)',
                  background: mode === 'day' ? 'var(--st-primary-soft)' : 'var(--st-surface-2)',
                  color: 'var(--st-text)',
                }}
              >
                <Sun className="h-4 w-4" /> Day
              </button>
              <button
                type="button"
                onClick={() => onMode('night')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  mode === 'night' ? 'ring-2' : ''
                }`}
                style={{
                  borderColor: mode === 'night' ? 'var(--st-primary)' : 'var(--st-border)',
                  background: mode === 'night' ? 'var(--st-primary-soft)' : 'var(--st-surface-2)',
                  color: 'var(--st-text)',
                }}
              >
                <Moon className="h-4 w-4" /> Night
              </button>
            </div>
          </div>

          <div>
            <div
              className="mb-2 flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--st-text)' }}
            >
              <Palette className="h-4 w-4" style={{ color: 'var(--st-primary)' }} />
              Accent color
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => onAccent(p.hex)}
                  className={`h-10 rounded-xl border-2 transition ${
                    accent.toLowerCase() === p.hex.toLowerCase() ? 'scale-105' : 'opacity-90'
                  }`}
                  style={{
                    background: p.hex,
                    borderColor:
                      accent.toLowerCase() === p.hex.toLowerCase()
                        ? 'var(--st-text)'
                        : 'transparent',
                  }}
                  aria-label={p.label}
                />
              ))}
            </div>
            <label
              className="mt-3 flex items-center gap-2 text-xs"
              style={{ color: 'var(--st-muted)' }}
            >
              Custom hex
              <input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                onBlur={() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(customHex)) onAccent(customHex);
                }}
                placeholder="#4f46e5"
                className="flex-1 rounded-lg border px-2 py-1.5 font-mono text-sm outline-none"
                style={{
                  background: 'var(--st-surface-2)',
                  borderColor: 'var(--st-border)',
                  color: 'var(--st-text)',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(customHex)) onAccent(customHex);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: 'var(--st-primary)' }}
              >
                Apply
              </button>
            </label>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Cloud sync
        </p>
        <div
          className="space-y-3 overflow-hidden rounded-2xl border p-4 shadow-sm"
          style={{
            background: 'var(--st-surface)',
            borderColor: 'var(--st-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: gasOn ? 'var(--st-primary-soft)' : '#fef2f2',
                color: gasOn ? 'var(--st-primary)' : '#e11d48',
              }}
            >
              <Cloud className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold" style={{ color: 'var(--st-text)' }}>
                {gasOn
                  ? isD1Enabled()
                    ? 'D1 API connected'
                    : 'GAS connected'
                  : 'Backend not configured'}
              </p>
              <p className="mt-0.5 text-xs break-all" style={{ color: 'var(--st-muted)' }}>
                {gasOn
                  ? gasUrl.slice(0, 48) + (gasUrl.length > 48 ? '…' : '')
                  : 'Set VITE_D1_API_URL (or VITE_GAS_WEB_APP_URL) at build time, then redeploy. Without it, data stays on this device only.'}
              </p>
            </div>
          </div>
          {gasOn && (
            <button
              type="button"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                try {
                  if (isD1Enabled()) {
                    await ensureTenant();
                  }
                  const [locs, products, cats, partners] = await Promise.all([
                    getLocations(),
                    getProducts(),
                    getCategories(),
                    getPartners(),
                  ]);
                  window.dispatchEvent(
                    new CustomEvent('st-masters-hydrated', {
                      detail: { count: locs.length },
                    })
                  );
                  toast(
                    `Synced ${locs.length} loc · ${products.length} prod · ${cats.length} cat · ${partners.length} partner(s)`,
                    'success'
                  );
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Sync failed', 'error');
                } finally {
                  setSyncing(false);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--st-primary)' }}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing all from cloud…' : 'Sync all from cloud'}
            </button>
          )}
        </div>
      </section>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Scanning
        </p>
        <div
          className="overflow-hidden rounded-2xl border shadow-sm"
          style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
        >
          <Link
            to="/settings/qr-mapping"
            className="flex items-center justify-between gap-3 p-4 transition"
            style={{ color: 'var(--st-text)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: 'var(--st-primary-soft)', color: 'var(--st-primary)' }}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">QR Field Mapping</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--st-muted)' }}>
                  {mappingSummary(config)}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0" style={{ color: 'var(--st-muted)' }} />
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Data
        </p>
        <div
          className="overflow-hidden rounded-2xl border shadow-sm"
          style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
        >
          <button
            onClick={clearAllData}
            className="flex w-full items-center gap-3 p-4 text-left transition"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-rose-600">Clear all data</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--st-muted)' }}>
                Removes local products, documents, and settings
              </p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
