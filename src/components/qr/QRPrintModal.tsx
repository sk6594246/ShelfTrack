import { useEffect, useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { qrImageUrl } from '../../lib/qrPayload';

interface QRPrintModalProps {
  open: boolean;
  onClose: () => void;
  payloadJson: string;
  title: string;
  subtitle?: string;
  kind: string;
}

export function QRPrintModal({
  open,
  onClose,
  payloadJson,
  title,
  subtitle,
  kind,
}: QRPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const imgUrl = qrImageUrl(payloadJson, 280);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `qr-${kind.toLowerCase()}-${subtitle || title}.png`.replace(/\s+/g, '-');
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center print:bg-white print:p-0">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl print:max-w-none print:rounded-none print:shadow-none"
        role="dialog"
        aria-modal="true"
        aria-label={`Print ${kind} QR`}
      >
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-semibold text-slate-900">Print QR · {kind}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={printRef} className="flex flex-col items-center text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-slate-600">
            {kind}
          </p>
          <img
            src={imgUrl}
            alt={`QR code for ${title}`}
            className="h-56 w-56 rounded-xl border border-slate-100 bg-white p-2"
            width={224}
            height={224}
          />
          <p className="mt-3 text-base font-semibold text-slate-900">{title}</p>
          {subtitle && (
            <p className={'mt-0.5 font-mono text-sm text-slate-500'}>{subtitle}</p>
          )}
          <p className={'mt-3 max-w-full break-all rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-[10px] text-slate-400 print:hidden'}>
            {payloadJson}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 print:hidden">
          <button
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .fixed, .fixed * { visibility: visible !important; }
          .fixed {
            position: static !important;
            background: white !important;
            inset: auto !important;
            display: flex !important;
            justify-content: center !important;
            padding: 0 !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
