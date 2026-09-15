import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Package, Settings2, X } from 'lucide-react';
import { QRScanner } from '../components/scanner/QRScanner';
import { useQRMapping } from '../hooks/useQRMapping';
import {
  interpretQR,
  lookupProductFromScan,
  buildPreFillFromScan,
  mappingSummary,
} from '../lib/qr';
import { toast } from '../components/ui/Toast';

type RecentScan = {
  id: string;
  raw: string;
  label: string;
  productId?: string;
  at: number;
};

const RECENT_KEY = 'st_recent_scans';

function loadRecent(): RecentScan[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentScan[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentScan[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 8)));
}

export function Scan() {
  const navigate = useNavigate();
  const { config } = useQRMapping();
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [flash, setFlash] = useState(false);
  const [recent, setRecent] = useState<RecentScan[]>(() => loadRecent());

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(false), 450);
    return () => window.clearTimeout(t);
  }, [flash]);

  async function handleScan(raw: string) {
    if (!scanning) return;

    setLastResult(raw);
    setScanning(false);
    setFlash(true);

    const result = interpretQR(raw, config);
    const existing = await lookupProductFromScan(result, config);

    if (existing) {
      setMessage(`Found: ${existing.name}`);
      toast(`Found ${existing.name}`, 'success');
      const entry: RecentScan = {
        id: `${Date.now()}`,
        raw,
        label: existing.name,
        productId: existing.id,
        at: Date.now(),
      };
      const next = [entry, ...recent.filter((r) => r.raw !== raw)].slice(0, 8);
      setRecent(next);
      saveRecent(next);
      setTimeout(() => navigate(`/products/${existing.id}`), 650);
      return;
    }

    const prefill = buildPreFillFromScan(result, config);
    setMessage('No match — opening new product form');
    toast('No product match — create new', 'info');
    const entry: RecentScan = {
      id: `${Date.now()}`,
      raw,
      label: prefill.name || prefill.sku || 'Unknown code',
      at: Date.now(),
    };
    const next = [entry, ...recent.filter((r) => r.raw !== raw)].slice(0, 8);
    setRecent(next);
    saveRecent(next);
    setTimeout(() => {
      navigate('/products/new', { state: { prefill, rawQR: raw } });
    }, 700);
  }

  function reset() {
    setLastResult(null);
    setMessage(null);
    setScanning(true);
  }

  function clearRecent() {
    setRecent([]);
    saveRecent([]);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col p-4 md:p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Scan QR / Barcode
        </h1>
        <p className="mt-1 text-sm text-slate-500">{mappingSummary(config)}</p>
      </header>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-800/20 shadow-xl shadow-slate-900/10 ring-1 ring-black/5">
        <QRScanner active={scanning} onScan={handleScan} />
        {scanning && (
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute left-4 top-4 h-10 w-10 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/80" />
            <span className="absolute right-4 top-4 h-10 w-10 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/80" />
            <span className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/80" />
            <span className="absolute bottom-4 right-4 h-10 w-10 rounded-br-xl border-b-[3px] border-r-[3px] border-white/80" />
            <div className="absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent st-scan-line" />
          </div>
        )}
        {flash && (
          <div className="pointer-events-none absolute inset-0 animate-pulse bg-emerald-400/25" />
        )}
      </div>

      {(lastResult || message) && (
        <div className="mb-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm st-enter">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                {message && (
                  <p className="font-semibold text-slate-900">{message}</p>
                )}
                {lastResult && (
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">
                    {lastResult}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Scan again"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!scanning && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              Scan another
            </button>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Clock className="h-4 w-4 text-slate-400" />
              Recent scans
            </p>
            <button
              type="button"
              onClick={clearRecent}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          </div>
          <ul className="space-y-1.5">
            {recent.map((r) => (
              <li key={r.id}>
                {r.productId ? (
                  <Link
                    to={`/products/${r.productId}`}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition hover:bg-slate-50"
                  >
                    <Package className="h-4 w-4 shrink-0 text-indigo-500" />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {r.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(r.at).toLocaleTimeString()}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-600">
                    <Package className="h-4 w-4 shrink-0 text-slate-300" />
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(r.at).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">QR field mapping</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Configure which fields are used for lookup and pre-fill when a code is
              scanned.
            </p>
            <Link
              to="/settings/qr-mapping"
              className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open mapping settings →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
