import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type Listener = (items: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(message: string, tone: ToastTone = 'info') {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toasts = [...toasts, { id, message, tone }].slice(-5);
  emit();
  window.setTimeout(() => dismissToast(id), 3200);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    setItems([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[80] flex w-[min(100%-1.5rem,22rem)] -translate-x-1/2 flex-col gap-2 md:bottom-6">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  }[item.tone];
  const Icon =
    item.tone === 'success'
      ? CheckCircle2
      : item.tone === 'error'
        ? XCircle
        : Info;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium shadow-lg shadow-slate-900/10 ${styles}`}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        className="rounded-lg p-0.5 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
