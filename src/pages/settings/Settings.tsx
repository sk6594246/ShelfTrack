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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Configure the app</p>
      </header>

      <div className="space-y-2">
        <Link
          to="/settings/qr-mapping"
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">QR Field Mapping</p>
              <p className="text-xs text-slate-500">{mappingSummary(config)}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>

        <button
          onClick={clearAllData}
          className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-white p-4 text-left shadow-sm transition hover:border-red-200"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-red-700">Clear all data</p>
            <p className="text-xs text-slate-500">Reset products and settings</p>
          </div>
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Inventory Tracker MVP · Data stored locally in your browser
      </p>
    </div>
  );
}
