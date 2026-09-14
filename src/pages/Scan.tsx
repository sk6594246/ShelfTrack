import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Settings2, X } from 'lucide-react';
import { QRScanner } from '../components/scanner/QRScanner';
import { useQRMapping } from '../hooks/useQRMapping';
import {
  interpretQR,
  lookupProductFromScan,
  buildPreFillFromScan,
  mappingSummary,
} from '../lib/qr';

export function Scan() {
  const navigate = useNavigate();
  const { config } = useQRMapping();
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  async function handleScan(raw: string) {
    if (!scanning) return;

    setLastResult(raw);
    setScanning(false);

    const result = interpretQR(raw, config);
    const existing = await lookupProductFromScan(result, config);

    if (existing) {
      setMessage(`Found: ${existing.name}`);
      setTimeout(() => {
        navigate(`/products/${existing.id}`);
      }, 600);
      return;
    }

    const prefill = buildPreFillFromScan(result, config);
    setMessage('No match — opening new product form');
    setTimeout(() => {
      navigate('/products/new', { state: { prefill, rawQR: raw } });
    }, 700);
  }

  function reset() {
    setLastResult(null);
    setMessage(null);
    setScanning(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col p-4 md:p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scan QR / Barcode</h1>
        <p className={'mt-1 text-sm text-slate-500'}>{mappingSummary(config)}</p>
      </header>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-800/20 shadow-xl shadow-slate-900/10 ring-1 ring-black/5">
        <QRScanner active={scanning} onScan={handleScan} />
        {scanning && (
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-white/70" />
            <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-white/70" />
            <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-white/70" />
            <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-white/70" />
          </div>
        )}
      </div>

      {(lastResult || message) && (
        <div className="mb-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                {message && <p className={'font-semibold text-slate-900'}>{message}</p>}
                {lastResult && (
                  <p className={'mt-1 break-all font-mono text-xs text-slate-500'}>{lastResult}</p>
                )}
              </div>
            </div>
            <button
              onClick={reset}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Scan again"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!scanning && (
            <button
              onClick={reset}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Scan another
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">QR field mapping</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Configure which fields are used for lookup and pre-fill when a code is scanned.
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
