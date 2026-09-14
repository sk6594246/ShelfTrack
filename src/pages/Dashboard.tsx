import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Package,
  QrCode,
  TrendingDown,
  Boxes,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';

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
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="st-skeleton h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { products, loading } = useProducts();

  const total = products.length;
  const totalUnits = products.reduce((sum, p) => sum + Math.max(0, p.quantity), 0);
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint);
  const outOfStock = products.filter((p) => p.quantity <= 0);
  const attention = [...outOfStock, ...lowStock];

  if (loading) return <SkeletonDashboard />;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Live overview of your inventory</p>
        </div>
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
        >
          <QrCode className="h-4 w-4" />
          Scan
        </Link>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Products" value={total} icon={Package} tone="neutral" />
        <MetricCard label="Total units" value={totalUnits} icon={Boxes} tone="success" />
        <MetricCard label="Low stock" value={lowStock.length} icon={TrendingDown} tone="warning" />
        <MetricCard label="Out of stock" value={outOfStock.length} icon={AlertTriangle} tone="danger" />
      </div>

      {attention.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Needs attention</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80">
              {attention.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {attention.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent products</h2>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <Package className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-800">No products yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add your first item or scan a QR to get started
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/products/new"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Add product
              </Link>
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <QrCode className="h-4 w-4" />
                Scan QR
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
