import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

interface QRScannerProps {
  onScan: (value: string) => void;
  onError?: (message: string) => void;
  active?: boolean;
}

export function QRScanner({ onScan, onError, active = true }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScanned = useRef<string>('');
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function startScanner() {
    if (scannerRef.current || isStarting) return;
    setIsStarting(true);
    setError(null);

    try {
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const now = Date.now();
          // debounce identical scans within 2s
          if (
            decodedText === lastScanned.current &&
            now - lastScanTime.current < 2000
          ) {
            return;
          }
          lastScanned.current = decodedText;
          lastScanTime.current = now;
          onScan(decodedText);
        },
        () => {
          // ignore continuous "not found" errors
        }
      );

      setIsRunning(true);
    } catch (err: any) {
      const message =
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : err?.message || 'Unable to start camera';
      setError(message);
      onError?.(message);
      scannerRef.current = null;
    } finally {
      setIsStarting(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 /* SCANNING */) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsRunning(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900">
      {/* Scanner mount point */}
      <div id="qr-reader" className="w-full overflow-hidden rounded-2xl" />

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {!isRunning && !isStarting && !error && (
          <div className="flex flex-col items-center gap-2 text-white/80">
            <Camera className="h-10 w-10" />
            <p className="text-sm">Starting camera…</p>
          </div>
        )}

        {isStarting && (
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Initializing scanner…</p>
          </div>
        )}

        {error && (
          <div className="pointer-events-auto mx-4 flex max-w-xs flex-col items-center gap-3 rounded-xl bg-red-600/90 p-4 text-center text-white">
            <CameraOff className="h-8 w-8" />
            <p className="text-sm">{error}</p>
            <button
              onClick={startScanner}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {isRunning && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="rounded-full bg-black/50 px-3 py-1 text-xs text-white/90">
              Point camera at QR / barcode
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
