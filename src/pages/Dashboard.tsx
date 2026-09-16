import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  MapPin,
  Package,
  QrCode,
  TrendingDown,
  Truck,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';
import { getLocations, getProductsForLocation, getLocationById } from '../store/mastersStore';
import { getAvailableQtyAtLocation, getExpiringBatches } from '../store/stockBatchStore';

const LOC_KEY = 'st_dash_location';

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  const tones = {
    neutral: {
      wrap: 'border-slate-200/90 bg-white',
      icon: 'bg-slate-100 text-slate-600',
      value: 'text-slate-900',
      label: 'text-slate-500',
    },
    warning: {
      wrap: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white',
      icon: 'bg-amber-100 text-amber-700',
      value: 'text-amber-900',
      label: 'text-amber-700/80',
    },
    danger: {
      wrap: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white',
      icon: 'bg-rose-100 text-rose-700',
      value: 'text-rose-900',
      label: 'text-rose-700/80',
    },
    success: {
      wrap: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white',
      icon: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-900',
      label: 'text-emerald-700/80',
    },
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones.wrap}`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones.icon}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide ${tones.label}`}>
          {label}
        </span>
      </div>
      <p className={`st-num mt-3 text-3xl font-bold tracking-tight ${tones.value}`}>{value}</p>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <div className="st-skeleton h-8 w-48" />
        <div className="st-skeleton h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="st-skeleton h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { products, loading } = useProducts();
  const [locations, setLocations] = useState(() => getLocations());
  const [locationId, setLocationId] = useState(() => {
    try {
      return localStorage.getItem(LOC_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    setLocations(getLocations());
  }, [products]);

  useEffect(() => {
    try {
      if (locationId) localStorage.setItem(LOC_KEY, locationId);
      else localStorage.removeItem(LOC_KEY);
    } catch {
      /* ignore */
    }
  }, [locationId]);

  const scoped = useMemo(() => {
    if (!locationId) {
      return products.map((p) => ({ product: p, qty: p.quantity }));
    }
    return products
      .map((p) => ({
        product: p,
        qty: getAvailableQtyAtLocation(p.id, locationId),
      }))
      .filter((r) => {
        const assigned = getProductsForLocation(locationId);
        return assigned.includes(r.product.id) || r.qty > 0;
      });
  }, [products, locationId]);

  const total = scoped.length;
  const totalUnits = scoped.reduce((s, r) => s + r.qty, 0);
  const lowStock = scoped.filter(
    (r) => r.qty > 0 && r.qty <= r.product.reorderPoint
  );
  const outOfStock = scoped.filter((r) => r.qty <= 0);
  const attention = [...outOfStock, ...lowStock];

  const expiring = useMemo(() => {
    return getExpiringBatches(30)
      .map((r) => ({
        ...r,
        product: products.find((p) => p.id === r.productId),
        location: getLocationById(r.locationId),
      }))
      .filter((r) => !locationId || r.locationId === locationId)
      .slice(0, 8);
  }, [products, locationId]);

  const selectedLoc = locations.find((l) => l.id === locationId);
  const scopeLabel = selectedLoc
    ? selectedLoc.code
      ? `${selectedLoc.name} (${selectedLoc.code})`
      : selectedLoc.name
    : 'All locations';

  if (loading) return <SkeletonDashboard />;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Live overview · {scopeLabel}</p>
        </div>
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
        >
          <QrCode className="h-4 w-4" />
          Scan
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          Location
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:flex-none"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
              {loc.code ? ` (${loc.code})` : ''}
            </option>
          ))}
        </select>
        {locationId && (
          <button
            type="button"
            onClick={() => setLocationId('')}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <Link
          to="/receive"
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm transition hover:border-emerald-300"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Receiving dock</p>
            <p className="text-[11px] text-slate-500">GR + put-away in one step</p>
          </div>
        </Link>
        <Link
          to="/stock"
          className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-3 shadow-sm transition hover:border-indigo-300"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Stock map</p>
            <p className="text-[11px] text-slate-500">Floor grid & heat view</p>
          </div>
        </Link>
        <Link
          to="/documents"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Documents</p>
            <p className="text-[11px] text-slate-500">Pick path from sale/transfer</p>
          </div>
        </Link>
      </div>

      {expiring.length > 0 && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-100 px-4 py-3">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-900">Expiry board</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {expiring.length} within 30d
            </span>
          </div>
          <ul className="divide-y divide-amber-50">
            {expiring.map((r) => (
              <li key={r.batchId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{r.product?.name || 'Product'}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {r.location?.name || '-'}
                    {r.location?.code ? ` (${r.location.code})` : ''} · qty {r.remaining}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${
                    r.daysLeft < 0
                      ? 'bg-rose-100 text-rose-800'
                      : r.daysLeft <= 7
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {r.daysLeft < 0
                    ? `Expired ${-r.daysLeft}d`
                    : r.daysLeft === 0
                      ? 'Today'
                      : `${r.daysLeft}d left`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Products" value={total} icon={Package} tone="neutral" />
        <MetricCard
          label={locationId ? 'Units here' : 'Total units'}
          value={totalUnits}
          icon={Boxes}
          tone="success"
        />
        <MetricCard label="Low stock" value={lowStock.length} icon={TrendingDown} tone="warning" />
        <MetricCard label="Out of stock" value={outOfStock.length} icon={AlertTriangle} tone="danger" />
      </div>

      {attention.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Needs attention</h2>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600 hover:underline">
              Inventory <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {attention.slice(0, 6).map(({ product, qty }) => (
              <ProductCard key={product.id} product={{ ...product, quantity: qty }} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent products</h2>
          <Link to="/inventory" className="text-xs font-semibold text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {products.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            No products yet. Add one from Inventory.
          </p>
        )}
      </section>
    </div>
  );
}
