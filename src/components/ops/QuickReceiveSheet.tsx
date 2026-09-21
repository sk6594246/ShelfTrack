import { useEffect, useMemo, useState } from 'react';
import { Package, Search, X } from 'lucide-react';
import { getProducts, adjustStock } from '../../store/inventoryStore';
import { getLocations, getLocationsCached } from '../../store/mastersStore';
import { setLastBin, getLastBin } from '../../lib/uiPrefs';
import { toast } from '../ui/Toast';
import { fireConfetti } from '../ui/ConfettiBurst';
import type { Product, Location } from '../../types/inventory';

type Props = { open: boolean; onClose: () => void };

export function QuickReceiveSheet({ open, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [locationId, setLocationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setProductId('');
    setQty('1');
    setLocationId('');
    setError(null);
    void getProducts().then(setProducts).catch(() => setProducts([]));
    void getLocations()
      .then(setLocations)
      .catch(() => setLocations(getLocationsCached()));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [products, query]);

  const selected = products.find((p) => p.id === productId);

  useEffect(() => {
    if (!productId) return;
    const last = getLastBin(productId);
    if (last) setLocationId(last);
  }, [productId]);

  async function handleSave() {
    const n = Number(qty);
    if (!productId || !Number.isFinite(n) || n <= 0) {
      setError('Pick a product and enter qty > 0');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adjustStock(
        productId,
        n,
        locationId ? `Quick receive → ${locationId}` : 'Quick receive'
      );
      if (locationId) setLastBin(productId, locationId);
      fireConfetti();
      toast(`Received +${n} ${selected?.name || ''}`, 'success');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Receive failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'var(--st-overlay)' }}
      onClick={onClose}
    >
      <div
        className="st-enter w-full max-w-lg rounded-t-3xl border-t p-4 pb-8 shadow-xl"
        style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
              Quick receive
            </p>
            <p className="text-[11px]" style={{ color: 'var(--st-muted)' }}>
              Product · qty · bin — no full form
            </p>
          </div>
          <button type="button" onClick={onClose} className="st-tap rounded-lg p-2" style={{ color: 'var(--st-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--st-muted)' }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, barcode…"
            className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none"
            style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
            autoFocus
          />
        </div>

        <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
          {filtered.map((p) => {
            const active = p.id === productId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className="st-tap flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left"
                style={{ background: active ? 'var(--st-primary-soft)' : 'transparent', color: 'var(--st-text)' }}
              >
                <Package className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--st-primary)' : 'var(--st-muted)' }} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--st-muted)' }}>{p.sku}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-xs" style={{ color: 'var(--st-muted)' }}>No products match</p>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--st-muted)' }}>Qty</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ''))}
              className="mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none"
              style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
              placeholder="1"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--st-muted)' }}>Location</span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none"
              style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
            >
              <option value="">— Optional —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, var(--st-danger) 12%, transparent)', color: 'var(--st-danger)' }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy || !productId}
          className="st-tap flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--st-primary)' }}
        >
          {busy ? 'Saving…' : 'Receive stock'}
        </button>
      </div>
    </div>
  );
}
