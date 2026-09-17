import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  MapPin,
  Package,
  QrCode,
  Truck,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import {
  getLocationById,
  getLocations,
  getProductsForLocation,
} from '../store/mastersStore';
import { getAvailableQtyAtLocation, getExpiringBatches } from '../store/stockBatchStore';
import { getDocuments } from '../store/documentsStore';

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
  const lowStock = scoped.filter((r) => r.qty > 0 && r.qty <= r.product.reorderPoint);
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

  const openDocs = getDocuments().filter((d) => d.status === 'draft').length;
  const shiftExpiring = expiring.length;

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
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <QrCode className="h-4 w-4" />
          Scan
        </Link>
      </header>

      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Shift HUD</p>
          <span className="text-[11px] font-medium text-slate-400">{scopeLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
          {[
            { label: 'Open docs', value: openDocs, to: '/documents', warn: openDocs > 0 },
            { label: 'Low stock', value: lowStock.length, to: '/inventory', warn: lowStock.length > 0 },
            { label: 'Out of stock', value: outOfStock.length, to: '/inventory', warn: outOfStock.length > 0 },
            { label: 'Expiring 30d', value: shiftExpiring, to: '/stock', warn: shiftExpiring > 0 },
          ].map((cell) => (
            <Link
              key={cell.label}
              to={cell.to}
              className="flex flex-col gap-1 bg-white px-4 py-3 transition hover:bg-slate-50"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {cell.label}
              </span>
              <span
                className={`st-num text-2xl font-bold tracking-tight ${
                  cell.warn ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {cell.value}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
          <Link
            to="/receive"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
          >
            <Truck className="h-3.5 w-3.5" />
            Receive dock
          </Link>
          <Link
            to="/pick"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Pick list
          </Link>
          <Link
            to="/stock"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Stock map
          </Link>
        </div>
      </section>

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
        {locationId ? (
          <button
            type="button"
            onClick={() => setLocationId('')}
            className="text-xs font-semibold text-indigo-600"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="SKUs" value={total} icon={Package} />
        <MetricCard label="Units" value={totalUnits} icon={Package} tone="success" />
        <MetricCard
          label="Low stock"
          value={lowStock.length}
          icon={AlertTriangle}
          tone={lowStock.length ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Out of stock"
          value={outOfStock.length}
          icon={AlertTriangle}
          tone={outOfStock.length ? 'danger' : 'neutral'}
        />
      </div>

      {attention.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Needs attention</h2>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600">
              Inventory <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {attention.slice(0, 8).map(({ product, qty }) => (
              <li key={product.id}>
                <Link
                  to={`/products/${product.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-slate-50"
                >
                  <span className="min-w-0 truncate font-medium text-slate-800">{product.name}</span>
                  <span
                    className={`st-num shrink-0 font-semibold ${
                      qty <= 0 ? 'text-rose-600' : 'text-amber-700'
                    }`}
                  >
                    {qty}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {expiring.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Expiring within 30 days</h2>
          <ul className="space-y-2">
            {expiring.map((row) => (
              <li
                key={`${row.productId}-${row.locationId}-${row.expiryDate}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate text-slate-800">
                  {row.product?.name || row.productId}
                  <span className="text-slate-400">
                    {' '}
                    · {row.location?.name || row.locationId}
                  </span>
                </span>
                <span className="st-num shrink-0 text-xs font-semibold text-amber-700">
                  {row.expiryDate}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
