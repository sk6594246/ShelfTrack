import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
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

    // No match → go to create form with prefill
    const prefill = buildPreFillFromScan(result, config);
    setMessage('No match – opening new product form');
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
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Scan QR / Barcode</h1>
        <p className="mt-1 text-sm text-slate-500">{mappingSummary(config)}</p>
      </header>

      <div className="relative mb-4 overflow-hidden rounded-2xl shadow-lg">
        <QRScanner active={scanning} onScan={handleScan} />
      </div>

      {(lastResult || message) && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                {message && <p className="font-medium text-slate-900">{message}</p>}
                {lastResult && (
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">
                    {lastResult}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={reset}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Scan again"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!scanning && (
            <button
              onClick={reset}
              className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Scan another
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Tip: Configure which fields the QR fills in{' '}
        <button
          onClick={() => navigate('/settings/qr-mapping')}
          className="font-medium text-indigo-600 hover:underline"
        >
          Settings → QR Mapping
        </button>
      </p>
    </div>
  );
}
