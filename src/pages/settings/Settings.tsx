import { Link } from 'react-router-dom';
import { ChevronRight, QrCode, Trash2 } from 'lucide-react';
import { useQRMapping } from '../../hooks/useQRMapping';
import { mappingSummary } from '../../lib/qr';

export function Settings() {
  const { config } = useQRMapping();

  function clearAllData() {
    if (window.confirm('Delete all products and settings? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">Configure how ShelfTrack works</p>
      </header>

      <section className="mb-6">
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Scanning
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <Link
            to="/settings/qr-mapping"
            className="flex items-center justify-between gap-3 p-4 transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">QR Field Mapping</p>
                <p className="mt-0.5 text-xs text-slate-500">{mappingSummary(config)}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Data
        </p>
        <div className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
          <button
            onClick={clearAllData}
            className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-rose-50/60"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-rose-700">Clear all data</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Reset products, movements, and settings
              </p>
            </div>
          </button>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        ShelfTrack · Data stored locally in your browser
      </p>
    </div>
  );
}
