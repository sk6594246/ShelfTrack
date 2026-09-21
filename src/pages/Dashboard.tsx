import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Grid3x3,
  Package,
  QrCode,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { getLocations } from '../store/mastersStore';
import { getExpiringBatches } from '../store/stockBatchStore';
import { getDocuments } from '../store/documentsStore';
import { EmptyState } from '../components/ui/EmptyState';

export function Dashboard() {
  const { products, loading } = useProducts();
  const [locations, setLocations] = useState<import('../types/inventory').Location[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getLocations()
      .then((locs) => {
        if (!cancelled) setLocations(locs);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    function onHydrated() {
      if (!cancelled) {
        void getLocations().then((locs) => {
          if (!cancelled) setLocations(locs);
        });
      }
    }
    window.addEventListener('st-masters-hydrated', onHydrated);
    return () => {
      cancelled = true;
      window.removeEventListener('st-masters-hydrated', onHydrated);
    };
  }, [products]);

  const lowStock = useMemo(
    () => products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint),
    [products]
  );
  const outOfStock = useMemo(
    () => products.filter((p) => p.quantity <= 0),
    [products]
  );
  const openDocs = getDocuments().filter((d) => d.status === 'draft').length;
  const expiring = useMemo(() => getExpiringBatches(30).length, [products]);

  const alerts: { label: string; value: number; to: string; warn: boolean }[] = [
    { label: 'Open drafts', value: openDocs, to: '/documents', warn: openDocs > 0 },
    { label: 'Low stock', value: lowStock.length, to: '/inventory', warn: lowStock.length > 0 },
    { label: 'Out of stock', value: outOfStock.length, to: '/inventory', warn: outOfStock.length > 0 },
    { label: 'Expiring 30d', value: expiring, to: '/stock', warn: expiring > 0 },
  ];

  const tiles = [
    { to: '/receive', label: 'Receive', sub: 'Inbound GR', icon: Truck },
    { to: '/pick', label: 'Pick', sub: 'Walk list', icon: ClipboardList },
    { to: '/scan', label: 'Scan', sub: 'QR / barcode', icon: QrCode },
    { to: '/stock', label: 'Stock', sub: 'Floor map', icon: Grid3x3 },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 p-4">
        <div className="st-skeleton h-8 w-40" />
        <div className="st-skeleton h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="st-skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const hasAnyData = products.length > 0 || locations.length > 0 || openDocs > 0;

  return (
    <div className="st-page-fluid mx-auto w-full max-w-lg p-4 pb-8 st-page">
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
          Shift board
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--st-muted)' }}>
          Four actions · stay on the floor
        </p>
      </header>

      <div
        className="mb-4 grid grid-cols-4 gap-px overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--st-border)', background: 'var(--st-border)' }}
      >
        {alerts.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="st-tap flex flex-col items-center gap-0.5 px-1 py-2.5 text-center"
            style={{ background: 'var(--st-surface)' }}
          >
            <span
              className="st-num text-lg font-bold leading-none"
              style={{ color: a.warn ? 'var(--st-warning)' : 'var(--st-text)' }}
            >
              {a.value}
            </span>
            <span className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--st-muted)' }}>
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="st-stagger grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="st-tap st-tile-press st-enter flex flex-col items-start gap-3 rounded-2xl border p-4"
            style={{
              background: 'var(--st-surface)',
              borderColor: 'var(--st-border)',
              boxShadow: 'var(--st-shadow)',
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ background: 'var(--st-primary)' }}
            >
              <t.icon className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                {t.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--st-muted)' }}>
                {t.sub}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/inventory"
          className="st-tap inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-text)', background: 'var(--st-surface)' }}
        >
          <Package className="h-3.5 w-3.5" style={{ color: 'var(--st-primary)' }} />
          Inventory
        </Link>
        <Link
          to="/documents"
          className="st-tap inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-text)', background: 'var(--st-surface)' }}
        >
          Documents
        </Link>
        <Link
          to="/masters"
          className="st-tap inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-text)', background: 'var(--st-surface)' }}
        >
          Masters
        </Link>
      </div>

      {!hasAnyData && (
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="Empty floor"
            description="Add a location or receive first stock to start the shift."
            tone="indigo"
          >
            <Link
              to="/masters"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--st-primary)' }}
            >
              Add first location
            </Link>
            <Link
              to="/receive"
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: 'var(--st-border)', color: 'var(--st-text)' }}
            >
              Receive stock
            </Link>
          </EmptyState>
        </div>
      )}

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <section
          className="mt-6 rounded-2xl border p-4"
          style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--st-warning)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
              Needs attention
            </h2>
          </div>
          <ul className="space-y-1">
            {[...outOfStock, ...lowStock].slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link
                  to={`/products/${p.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm"
                  style={{ color: 'var(--st-text)' }}
                >
                  <span className="min-w-0 truncate font-medium">{p.name}</span>
                  <span
                    className="st-num shrink-0 font-bold"
                    style={{
                      color: p.quantity <= 0 ? 'var(--st-danger)' : 'var(--st-warning)',
                    }}
                  >
                    {p.quantity}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/inventory"
            className="mt-2 block text-center text-xs font-semibold"
            style={{ color: 'var(--st-primary)' }}
          >
            Full inventory →
          </Link>
        </section>
      )}
    </div>
  );
}
